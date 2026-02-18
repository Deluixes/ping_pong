/**
 * Constantes centralisées de l'application
 */

// Club
export const GROUP_NAME = 'Ping-Pong Ramonville'
export const CLUB_URL = 'https://www.usramonvillett.fr/'

// Horaires par défaut (utilisés quand pas de config)
export const DEFAULT_OPENING_TIME = '08:00'
export const DEFAULT_CLOSING_TIME = '23:00'
export const DEFAULT_OPENING_HOUR = 8
export const DEFAULT_CLOSING_HOUR = 23

// Tables et capacité
export const DEFAULT_TOTAL_TABLES = 8

// Validation
export const MIN_PASSWORD_LENGTH = 8

// Types de licence
export const LICENSE_TYPES = {
    LOISIR: 'L',
    COMPETITION: 'C',
}

// Photo de profil
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5 Mo

// Jours de la semaine (indexés par getDay() : 0=Dimanche)
export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

// Cache
export const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
