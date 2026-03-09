/**
 * Retourne les options de vue disponibles selon le role de l'utilisateur
 */
export function getViewOptions({ canManageSlots, isAdmin, isWeekConfigured }) {
    const options = [
        { value: 'occupied', label: 'Vue des créneaux ouverts' },
        { value: 'all', label: 'Vue de tous les créneaux' },
        { value: 'week', label: 'Vue semaine' },
    ]
    if (canManageSlots) {
        options.push({ value: 'manage_slots', label: 'Ouverture/Fermeture de créneaux' })
    }
    if (isAdmin && isWeekConfigured) {
        options.push({ value: 'edit', label: 'Modification depuis le planning' })
    }
    return options
}
