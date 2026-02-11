import { describe, it, expect } from 'vitest'
import {
    ROLES,
    derivePermissions,
    getRoleLabel,
    getAvailableRoles,
    canEditMemberRole,
    getSimulatableRoles,
} from '../permissions'

// ==================== derivePermissions ====================

describe('derivePermissions', () => {
    it('super_admin a toutes les permissions', () => {
        expect(derivePermissions(ROLES.SUPER_ADMIN)).toEqual({
            isSuperAdmin: true,
            isAdmin: true,
            isAdminSalles: true,
        })
    })

    it('admin a isAdmin et isAdminSalles mais pas isSuperAdmin', () => {
        expect(derivePermissions(ROLES.ADMIN)).toEqual({
            isSuperAdmin: false,
            isAdmin: true,
            isAdminSalles: true,
        })
    })

    it('admin_salles a seulement isAdminSalles', () => {
        expect(derivePermissions(ROLES.ADMIN_SALLES)).toEqual({
            isSuperAdmin: false,
            isAdmin: false,
            isAdminSalles: true,
        })
    })

    it("member n'a aucune permission", () => {
        expect(derivePermissions(ROLES.MEMBER)).toEqual({
            isSuperAdmin: false,
            isAdmin: false,
            isAdminSalles: false,
        })
    })

    it("rôle inconnu n'a aucune permission", () => {
        expect(derivePermissions('unknown')).toEqual({
            isSuperAdmin: false,
            isAdmin: false,
            isAdminSalles: false,
        })
    })
})

// ==================== getRoleLabel ====================

describe('getRoleLabel', () => {
    it('retourne "Super Admin" pour super_admin', () => {
        expect(getRoleLabel(ROLES.SUPER_ADMIN)).toBe('Super Admin')
    })

    it('retourne "Admin" pour admin', () => {
        expect(getRoleLabel(ROLES.ADMIN)).toBe('Admin')
    })

    it('retourne "Gestion Salle" pour admin_salles', () => {
        expect(getRoleLabel(ROLES.ADMIN_SALLES)).toBe('Gestion Salle')
    })

    it('retourne "Membre" pour member', () => {
        expect(getRoleLabel(ROLES.MEMBER)).toBe('Membre')
    })

    it('retourne "Membre" pour un rôle inconnu', () => {
        expect(getRoleLabel('unknown')).toBe('Membre')
    })
})

// ==================== getAvailableRoles ====================

describe('getAvailableRoles', () => {
    it('super_admin voit Membre, Gestion Salle et Admin', () => {
        const roles = getAvailableRoles(ROLES.SUPER_ADMIN)
        expect(roles).toHaveLength(3)
        expect(roles.map((r) => r.value)).toContain(ROLES.ADMIN)
        expect(roles.map((r) => r.value)).toContain(ROLES.ADMIN_SALLES)
        expect(roles.map((r) => r.value)).toContain(ROLES.MEMBER)
    })

    it('admin voit Membre et Gestion Salle mais pas Admin', () => {
        const roles = getAvailableRoles(ROLES.ADMIN)
        expect(roles).toHaveLength(2)
        expect(roles.map((r) => r.value)).not.toContain(ROLES.ADMIN)
    })

    it('member voit Membre et Gestion Salle (liste de base)', () => {
        const roles = getAvailableRoles(ROLES.MEMBER)
        expect(roles).toHaveLength(2)
    })
})

// ==================== canEditMemberRole ====================

describe('canEditMemberRole', () => {
    const SA = ROLES.SUPER_ADMIN
    const A = ROLES.ADMIN
    const AS = ROLES.ADMIN_SALLES
    const M = ROLES.MEMBER

    it('ne peut pas modifier son propre rôle', () => {
        expect(canEditMemberRole(SA, 'u1', M, 'u1')).toBe(false)
    })

    it('super_admin peut modifier un member', () => {
        expect(canEditMemberRole(SA, 'u1', M, 'u2')).toBe(true)
    })

    it('super_admin peut modifier un admin', () => {
        expect(canEditMemberRole(SA, 'u1', A, 'u2')).toBe(true)
    })

    it('super_admin peut modifier un admin_salles', () => {
        expect(canEditMemberRole(SA, 'u1', AS, 'u2')).toBe(true)
    })

    it('super_admin ne peut pas modifier un autre super_admin', () => {
        expect(canEditMemberRole(SA, 'u1', SA, 'u2')).toBe(false)
    })

    it('admin peut modifier un member', () => {
        expect(canEditMemberRole(A, 'u1', M, 'u2')).toBe(true)
    })

    it('admin peut modifier un admin_salles', () => {
        expect(canEditMemberRole(A, 'u1', AS, 'u2')).toBe(true)
    })

    it('admin ne peut pas modifier un admin', () => {
        expect(canEditMemberRole(A, 'u1', A, 'u2')).toBe(false)
    })

    it('admin ne peut pas modifier un super_admin', () => {
        expect(canEditMemberRole(A, 'u1', SA, 'u2')).toBe(false)
    })

    it('member ne peut modifier personne', () => {
        expect(canEditMemberRole(M, 'u1', M, 'u2')).toBe(false)
    })

    it('admin_salles ne peut modifier personne', () => {
        expect(canEditMemberRole(AS, 'u1', M, 'u2')).toBe(false)
    })
})

// ==================== getSimulatableRoles ====================

describe('getSimulatableRoles', () => {
    it('super_admin peut simuler 3 rôles', () => {
        const roles = getSimulatableRoles(ROLES.SUPER_ADMIN)
        expect(roles).toHaveLength(3)
        expect(roles.map((r) => r.value)).toEqual([ROLES.ADMIN, ROLES.ADMIN_SALLES, ROLES.MEMBER])
    })

    it('admin peut simuler 2 rôles', () => {
        const roles = getSimulatableRoles(ROLES.ADMIN)
        expect(roles).toHaveLength(2)
        expect(roles.map((r) => r.value)).toEqual([ROLES.ADMIN_SALLES, ROLES.MEMBER])
    })

    it('admin_salles peut simuler 1 rôle', () => {
        const roles = getSimulatableRoles(ROLES.ADMIN_SALLES)
        expect(roles).toHaveLength(1)
        expect(roles[0].value).toBe(ROLES.MEMBER)
    })

    it('member ne peut simuler aucun rôle', () => {
        expect(getSimulatableRoles(ROLES.MEMBER)).toHaveLength(0)
    })
})
