-- Migration: Ajouter support des photos de profil
-- Date: 2026-01-07

-- Ajouter colonne URL photo de profil à la table members
ALTER TABLE members
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Commentaire pour documentation
COMMENT ON COLUMN members.profile_photo_url IS 'URL publique de la photo de profil stockée dans Supabase Storage';
