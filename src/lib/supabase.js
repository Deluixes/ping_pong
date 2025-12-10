import { createClient } from '@supabase/supabase-js'

// Ces valeurs doivent être configurées dans les variables d'environnement
// Sur Vercel: Settings > Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Configuration Supabase manquante. ' +
        'Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans vos variables d\'environnement.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Liste des emails admin (centralisée pour éviter la duplication)
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
