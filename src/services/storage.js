/**
 * Storage Service - Barrel re-export
 *
 * Regroupe tous les services par domaine en un seul objet storageService
 * pour assurer la retro-compatibilite avec le code existant.
 *
 * Les services individuels sont dans des fichiers separes :
 * - reservationService.js   : reservations de creneaux
 * - memberService.js        : gestion des membres
 * - invitationService.js    : invitations aux creneaux
 * - settingsService.js      : parametres de l'application
 * - blockedSlotService.js   : creneaux bloques (cours, etc.)
 * - openingHourService.js   : horaires d'ouverture
 * - templateService.js      : templates de semaine
 * - weekConfigService.js    : configuration hebdomadaire
 * - openedSlotService.js    : creneaux ouverts manuellement
 * - realtimeService.js      : abonnements temps reel
 * - profilePhotoService.js  : photos de profil
 */

import { reservationService } from './reservationService'
import { memberService } from './memberService'
import { invitationService } from './invitationService'
import { settingsService } from './settingsService'
import { blockedSlotService } from './blockedSlotService'
import { openingHourService } from './openingHourService'
import { templateService } from './templateService'
import { weekConfigService } from './weekConfigService'
import { openedSlotService } from './openedSlotService'
import { realtimeService } from './realtimeService'
import { profilePhotoService } from './profilePhotoService'

export const storageService = {
    ...reservationService,
    ...memberService,
    ...invitationService,
    ...settingsService,
    ...blockedSlotService,
    ...openingHourService,
    ...templateService,
    ...weekConfigService,
    ...openedSlotService,
    ...realtimeService,
    ...profilePhotoService,
}
