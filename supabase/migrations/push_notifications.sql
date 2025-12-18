-- ===========================================
-- Migration: Push Notifications
-- Exécuter ce script dans Supabase SQL Editor
-- ===========================================

-- 1. Table pour stocker les subscriptions push
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- 2. Table pour les préférences de notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    invitations_enabled BOOLEAN DEFAULT true,
    slot_openings_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les utilisateurs avec notifications activées
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled
ON notification_preferences(enabled) WHERE enabled = true;

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================

-- Activer RLS sur push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques pour push_subscriptions
CREATE POLICY "Users can view own subscriptions"
ON push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Activer RLS sur notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques pour notification_preferences
CREATE POLICY "Users can view own preferences"
ON notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON notification_preferences FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================
-- Politique pour les Edge Functions (service role)
-- Ces politiques permettent aux Edge Functions de lire les données
-- ===========================================

-- Permettre au service role de lire toutes les subscriptions
CREATE POLICY "Service role can read all subscriptions"
ON push_subscriptions FOR SELECT
TO service_role
USING (true);

-- Permettre au service role de supprimer les subscriptions invalides
CREATE POLICY "Service role can delete invalid subscriptions"
ON push_subscriptions FOR DELETE
TO service_role
USING (true);

-- Permettre au service role de lire toutes les préférences
CREATE POLICY "Service role can read all preferences"
ON notification_preferences FOR SELECT
TO service_role
USING (true);

-- ===========================================
-- WEBHOOKS pour déclencher les Edge Functions
-- ===========================================
-- Les webhooks Supabase se configurent via le Dashboard :
-- Database > Webhooks > Create webhook
--
-- Webhook 1: on-invitation-created
-- - Table: slot_invitations
-- - Events: INSERT
-- - Type: Supabase Edge Function
-- - Function: on-invitation-created
--
-- Webhook 2: on-slot-opened
-- - Table: opened_slots
-- - Events: INSERT
-- - Type: Supabase Edge Function
-- - Function: on-slot-opened
