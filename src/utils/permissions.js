/**
 * Utilitaires pour la gestion des roles et permissions
 */

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    ADMIN_SALLES: 'admin_salles',
    MEMBER: 'member',
}

/**
 * Derive les permissions booleennes a partir d'un role
 */
export function derivePermissions(role) {
    return {
        isSuperAdmin: role === ROLES.SUPER_ADMIN,
        isAdmin: role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN,
        isAdminSalles:
            role === ROLES.ADMIN || role === ROLES.ADMIN_SALLES || role === ROLES.SUPER_ADMIN,
    }
}

/**
 * Retourne le label d'affichage d'un role
 */
export function getRoleLabel(role) {
    switch (role) {
        case ROLES.SUPER_ADMIN:
            return 'Super Admin'
        case ROLES.ADMIN:
            return 'Admin'
        case ROLES.ADMIN_SALLES:
            return 'Gestion Salle'
        default:
            return 'Membre'
    }
}

/**
 * Retourne les roles disponibles pour l'edition par l'utilisateur courant
 */
export function getAvailableRoles(currentUserRole) {
    const roles = [
        { value: ROLES.MEMBER, label: 'Membre' },
        { value: ROLES.ADMIN_SALLES, label: 'Gestion Salle' },
    ]
    if (currentUserRole === ROLES.SUPER_ADMIN) {
        roles.push({ value: ROLES.ADMIN, label: 'Admin' })
    }
    return roles
}

/**
 * Verifie si l'utilisateur courant peut modifier le role d'un membre
 */
export function canEditMemberRole(currentUserRole, currentUserId, targetMemberRole, targetUserId) {
    if (targetUserId === currentUserId) return false
    if (currentUserRole === ROLES.SUPER_ADMIN) return targetMemberRole !== ROLES.SUPER_ADMIN
    if (currentUserRole === ROLES.ADMIN) {
        return targetMemberRole !== ROLES.ADMIN && targetMemberRole !== ROLES.SUPER_ADMIN
    }
    return false
}

/**
 * Retourne les roles simulables pour un role donne
 */
export function getSimulatableRoles(realRole) {
    const roles = []
    if (realRole === ROLES.SUPER_ADMIN) {
        roles.push({ value: ROLES.ADMIN, label: 'Admin' })
        roles.push({ value: ROLES.ADMIN_SALLES, label: 'Gestion Salle' })
        roles.push({ value: ROLES.MEMBER, label: 'Membre' })
    } else if (realRole === ROLES.ADMIN) {
        roles.push({ value: ROLES.ADMIN_SALLES, label: 'Gestion Salle' })
        roles.push({ value: ROLES.MEMBER, label: 'Membre' })
    } else if (realRole === ROLES.ADMIN_SALLES) {
        roles.push({ value: ROLES.MEMBER, label: 'Membre' })
    }
    return roles
}
