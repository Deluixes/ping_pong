-- ===========================================
-- SCRIPT COMPLET D'INITIALISATION
-- ===========================================
-- Exécuter ce script dans Supabase SQL Editor
-- pour créer toutes les tables de l'application
-- ===========================================

-- ============ MEMBRES ============
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin_salles', 'admin', 'super_admin')),
    license_type TEXT,
    must_change_password BOOLEAN DEFAULT false,
    profile_photo_url TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);

-- ============ RESERVATIONS ============
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id TEXT NOT NULL,
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    duration INTEGER DEFAULT 1,
    overbooked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);

-- ============ INVITATIONS ============
CREATE TABLE IF NOT EXISTS slot_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id TEXT NOT NULL,
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    duration INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(slot_id, date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_slot_invitations_user_id ON slot_invitations(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_invitations_status ON slot_invitations(status);

-- ============ PARAMETRES ============
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ CRENEAUX BLOQUES (récurrents) ============
CREATE TABLE IF NOT EXISTS blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    group_name TEXT,
    coach TEXT,
    name TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ HORAIRES D'OUVERTURE ============
CREATE TABLE IF NOT EXISTS opening_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ TEMPLATES DE SEMAINE ============
CREATE TABLE IF NOT EXISTS week_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES week_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    name TEXT,
    coach TEXT,
    group_name TEXT,
    is_blocking BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES week_templates(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ CONFIGURATION DES SEMAINES ============
CREATE TABLE IF NOT EXISTS week_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL UNIQUE,
    template_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS week_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_config_id UUID NOT NULL REFERENCES week_configs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    name TEXT,
    coach TEXT,
    group_name TEXT,
    is_blocking BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS week_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_config_id UUID NOT NULL REFERENCES week_configs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============ CRENEAUX OUVERTS DYNAMIQUEMENT ============
CREATE TABLE IF NOT EXISTS opened_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    slot_id TEXT NOT NULL,
    opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date, slot_id)
);

CREATE INDEX IF NOT EXISTS idx_opened_slots_date ON opened_slots(date);

-- ============ NOTIFICATIONS PUSH ============
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

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    invitations_enabled BOOLEAN DEFAULT true,
    slot_openings_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled
ON notification_preferences(enabled) WHERE enabled = true;

-- ===========================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Activer RLS sur toutes les tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE opened_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- POLITIQUES RLS - Accès authentifié complet
-- (Simplifié pour le développement)
-- ===========================================

-- Members
CREATE POLICY "Enable all for authenticated users" ON members
    FOR ALL USING (auth.role() = 'authenticated');

-- Reservations
CREATE POLICY "Enable all for authenticated users" ON reservations
    FOR ALL USING (auth.role() = 'authenticated');

-- Slot invitations
CREATE POLICY "Enable all for authenticated users" ON slot_invitations
    FOR ALL USING (auth.role() = 'authenticated');

-- Settings
CREATE POLICY "Enable all for authenticated users" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Blocked slots
CREATE POLICY "Enable all for authenticated users" ON blocked_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Opening hours
CREATE POLICY "Enable all for authenticated users" ON opening_hours
    FOR ALL USING (auth.role() = 'authenticated');

-- Week templates
CREATE POLICY "Enable all for authenticated users" ON week_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- Template slots
CREATE POLICY "Enable all for authenticated users" ON template_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Template hours
CREATE POLICY "Enable all for authenticated users" ON template_hours
    FOR ALL USING (auth.role() = 'authenticated');

-- Week configs
CREATE POLICY "Enable all for authenticated users" ON week_configs
    FOR ALL USING (auth.role() = 'authenticated');

-- Week slots
CREATE POLICY "Enable all for authenticated users" ON week_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Week hours
CREATE POLICY "Enable all for authenticated users" ON week_hours
    FOR ALL USING (auth.role() = 'authenticated');

-- Opened slots
CREATE POLICY "Enable all for authenticated users" ON opened_slots
    FOR ALL USING (auth.role() = 'authenticated');

-- Push subscriptions (accès personnel uniquement)
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Notification preferences (accès personnel uniquement)
CREATE POLICY "Users can manage own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- FIN DU SCRIPT
-- ===========================================
