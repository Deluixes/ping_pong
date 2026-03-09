import { MIN_PASSWORD_LENGTH } from '../constants'

/**
 * Valide un mot de passe. Retourne un message d'erreur ou null si valide.
 */
export function validatePassword(pwd) {
    if (pwd.length < MIN_PASSWORD_LENGTH) {
        return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`
    }
    return null
}
