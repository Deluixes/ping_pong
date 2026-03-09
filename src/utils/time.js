/**
 * Fonctions utilitaires pour la gestion du temps
 */

/**
 * Convertit une heure "HH:MM" ou "HH:MM:SS" en minutes depuis minuit
 */
export function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
}

/**
 * Formate une durée en slots de 30 min en texte lisible
 * Ex: 1 -> "30 min", 2 -> "1h", 3 -> "1h30"
 */
export function formatDuration(slots) {
    if (!slots || slots === 1) return '30 min'
    const hours = Math.floor(slots / 2)
    const mins = (slots % 2) * 30
    if (hours === 0) return `${mins} min`
    if (mins === 0) return `${hours}h`
    return `${hours}h${mins}`
}

/**
 * Calcule l'heure de fin a partir d'un creneau de debut et d'une duree en slots
 * Ex: ("9:00", 2) -> "10h"
 */
export function getEndTime(startTime, durationSlots) {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + (durationSlots || 1) * 30
    const endHours = Math.floor(totalMinutes / 60)
    const endMins = totalMinutes % 60
    return `${endHours}h${endMins > 0 ? endMins.toString().padStart(2, '0') : ''}`
}

/**
 * Formate une heure en tronquant les secondes : "HH:MM:SS" -> "HH:MM"
 */
export function formatTime(time) {
    return time?.slice(0, 5) || ''
}

/**
 * Verifie si deux creneaux se chevauchent (meme jour + heures qui se superposent)
 * Accepte les proprietes camelCase ou snake_case pour les heures et les jours
 */
export function slotsOverlap(slot1, slot2) {
    const day1 = slot1.date || slot1.dayOfWeek
    const day2 = slot2.date || slot2.dayOfWeek
    if (day1 !== day2) return false

    const start1 = timeToMinutes(slot1.startTime || slot1.start_time)
    const end1 = timeToMinutes(slot1.endTime || slot1.end_time)
    const start2 = timeToMinutes(slot2.startTime || slot2.start_time)
    const end2 = timeToMinutes(slot2.endTime || slot2.end_time)

    return start1 < end2 && start2 < end1
}
