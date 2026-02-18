import { vi, describe, it, expect, beforeEach } from 'vitest'

// ==================== MOCK SUPABASE (séquentiel pour requestAccess) ====================

let mockResponses = {}
let callIndex = {}

function createChain(tableName) {
    const idx = (callIndex[tableName] = (callIndex[tableName] || 0) + 1)
    const responses = mockResponses[tableName]
    const response = Array.isArray(responses)
        ? (responses[idx - 1] ?? responses[responses.length - 1])
        : responses || { data: null, error: null }

    const chain = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        upsert: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        neq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        single: vi.fn(() => chain),
        then: (resolve) => resolve(response),
    }
    return chain
}

const mockFrom = vi.fn((tableName) => createChain(tableName))

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
    },
}))

// ==================== MOCK DEPENDENT SERVICES ====================

vi.mock('../reservationService', () => ({
    reservationService: {
        updateUserNameInEvents: vi.fn().mockResolvedValue({ success: true, updated: 0 }),
    },
}))

vi.mock('../invitationService', () => ({
    invitationService: {
        updateUserNameInInvitations: vi.fn().mockResolvedValue({ success: true, updated: 0 }),
    },
}))

import { reservationService } from '../reservationService'
import { invitationService } from '../invitationService'
import { memberService } from '../memberService'

// ==================== SETUP ====================

beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = {}
    callIndex = {}
})

// ==================== getPendingCount ====================

describe('getPendingCount', () => {
    it('retourne le nombre de membres en attente', async () => {
        mockResponses['members'] = { count: 3, error: null }

        const result = await memberService.getPendingCount()
        expect(result).toBe(3)
    })

    it('retourne 0 sur erreur', async () => {
        mockResponses['members'] = { count: null, error: { message: 'fail' } }

        const result = await memberService.getPendingCount()
        expect(result).toBe(0)
    })
})

// ==================== getMemberRole ====================

describe('getMemberRole', () => {
    it('retourne le rôle du membre', async () => {
        mockResponses['members'] = { data: { role: 'admin' }, error: null }

        const result = await memberService.getMemberRole('u1')
        expect(result).toBe('admin')
    })

    it("retourne 'member' par défaut sur erreur", async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.getMemberRole('u1')
        expect(result).toBe('member')
    })

    it("retourne 'member' quand role est null", async () => {
        mockResponses['members'] = { data: { role: null }, error: null }

        const result = await memberService.getMemberRole('u1')
        expect(result).toBe('member')
    })
})

// ==================== updateMemberRole ====================

describe('updateMemberRole', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.updateMemberRole('u1', 'admin')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.updateMemberRole('u1', 'admin')
        expect(result).toEqual({ success: false })
    })
})

// ==================== updateMemberLicense ====================

describe('updateMemberLicense', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.updateMemberLicense('u1', 'competition')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.updateMemberLicense('u1', 'competition')
        expect(result).toEqual({ success: false })
    })
})

// ==================== updateMemberName ====================

describe('updateMemberName', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.updateMemberName('u1', 'Alice')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.updateMemberName('u1', 'Alice')
        expect(result).toEqual({ success: false })
    })
})

// ==================== getMemberProfile ====================

describe('getMemberProfile', () => {
    it('mappe les données vers camelCase', async () => {
        mockResponses['members'] = {
            data: {
                user_id: 'u1',
                email: 'a@b.c',
                name: 'Alice',
                status: 'approved',
                role: 'admin',
                license_type: 'competition',
                must_change_password: true,
            },
            error: null,
        }

        const result = await memberService.getMemberProfile('u1')
        expect(result).toEqual({
            userId: 'u1',
            email: 'a@b.c',
            name: 'Alice',
            status: 'approved',
            role: 'admin',
            licenseType: 'competition',
            mustChangePassword: true,
        })
    })

    it("met les défauts (role→'member', mustChangePassword→false)", async () => {
        mockResponses['members'] = {
            data: {
                user_id: 'u1',
                email: 'a@b.c',
                name: 'Alice',
                status: 'approved',
                role: null,
                license_type: null,
                must_change_password: null,
            },
            error: null,
        }

        const result = await memberService.getMemberProfile('u1')
        expect(result.role).toBe('member')
        expect(result.licenseType).toBeNull()
        expect(result.mustChangePassword).toBe(false)
    })

    it('retourne null sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.getMemberProfile('u1')
        expect(result).toBeNull()
    })
})

// ==================== getMustChangePassword ====================

describe('getMustChangePassword', () => {
    it('retourne true quand must_change_password est true', async () => {
        mockResponses['members'] = { data: { must_change_password: true }, error: null }

        const result = await memberService.getMustChangePassword('u1')
        expect(result).toBe(true)
    })

    it('retourne false sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.getMustChangePassword('u1')
        expect(result).toBe(false)
    })
})

// ==================== clearMustChangePassword ====================

describe('clearMustChangePassword', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.clearMustChangePassword('u1')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.clearMustChangePassword('u1')
        expect(result).toEqual({ success: false })
    })
})

// ==================== getAllApprovedMembers ====================

describe('getAllApprovedMembers', () => {
    it('mappe les données avec profilePhotoUrl', async () => {
        mockResponses['members'] = {
            data: [
                {
                    user_id: 'u1',
                    name: 'Alice',
                    license_type: 'competition',
                    profile_photo_url: 'http://photo.jpg',
                },
            ],
            error: null,
        }

        const result = await memberService.getAllApprovedMembers()
        expect(result[0]).toEqual({
            userId: 'u1',
            name: 'Alice',
            licenseType: 'competition',
            profilePhotoUrl: 'http://photo.jpg',
        })
    })

    it('filtre les membres TEST_ par défaut', async () => {
        mockResponses['members'] = {
            data: [
                { user_id: 'u1', name: 'TEST_Bot', license_type: null, profile_photo_url: null },
                { user_id: 'u2', name: 'Bob', license_type: null, profile_photo_url: null },
            ],
            error: null,
        }

        const result = await memberService.getAllApprovedMembers()
        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Bob')
    })

    it('inclut les membres TEST_ quand includeTEST est true', async () => {
        mockResponses['members'] = {
            data: [
                { user_id: 'u1', name: 'TEST_Bot', license_type: null, profile_photo_url: null },
            ],
            error: null,
        }

        const result = await memberService.getAllApprovedMembers(true)
        expect(result).toHaveLength(1)
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.getAllApprovedMembers()
        expect(result).toEqual([])
    })
})

// ==================== getMemberStatus ====================

describe('getMemberStatus', () => {
    it('retourne status et role', async () => {
        mockResponses['members'] = {
            data: { status: 'approved', role: 'admin' },
            error: null,
        }

        const result = await memberService.getMemberStatus('u1')
        expect(result).toEqual({ status: 'approved', role: 'admin' })
    })

    it('retourne les défauts sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.getMemberStatus('u1')
        expect(result).toEqual({ status: 'none', role: 'member' })
    })
})

// ==================== requestAccess ====================

describe('requestAccess', () => {
    it('retourne le status existant si déjà inscrit', async () => {
        // getMemberStatus returns 'approved'
        mockResponses['members'] = [{ data: { status: 'approved', role: 'admin' }, error: null }]

        const result = await memberService.requestAccess('u1', 'a@b.c', 'Alice')
        expect(result).toEqual({ status: 'approved' })
    })

    it("insère un nouveau membre si status est 'none'", async () => {
        mockResponses['members'] = [
            // getMemberStatus → error (not found → status: 'none')
            { data: null, error: { code: 'PGRST116' } },
            // insert → success
            { data: null, error: null },
        ]

        const result = await memberService.requestAccess('u1', 'a@b.c', 'Alice')
        expect(result).toEqual({ status: 'pending' })
    })

    it("retourne le status actuel si l'insertion échoue", async () => {
        mockResponses['members'] = [
            // getMemberStatus → not found
            { data: null, error: { code: 'PGRST116' } },
            // insert → fails
            { data: null, error: { message: 'insert fail' } },
            // getMemberStatus again → now found (race condition)
            { data: { status: 'pending', role: 'member' }, error: null },
        ]

        const result = await memberService.requestAccess('u1', 'a@b.c', 'Alice')
        expect(result).toEqual({ status: 'pending' })
    })
})

// ==================== approveMember ====================

describe('approveMember', () => {
    it('retourne success sur approbation réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.approveMember('u1')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.approveMember('u1')
        expect(result).toEqual({ success: false })
    })
})

// ==================== rejectMember ====================

describe('rejectMember', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['members'] = { data: null, error: null }

        const result = await memberService.rejectMember('u1')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await memberService.rejectMember('u1')
        expect(result).toEqual({ success: false })
    })
})

// ==================== renameUser ====================

describe('renameUser', () => {
    it('appelle les trois services de mise à jour du nom', async () => {
        mockResponses['members'] = { data: null, error: null }

        await memberService.renameUser('u1', 'NewName')

        expect(reservationService.updateUserNameInEvents).toHaveBeenCalledWith('u1', 'NewName')
        expect(invitationService.updateUserNameInInvitations).toHaveBeenCalledWith('u1', 'NewName')
    })

    it("propage l'erreur si un des services échoue (bug documenté)", async () => {
        mockResponses['members'] = { data: null, error: null }
        reservationService.updateUserNameInEvents.mockRejectedValueOnce(new Error('DB error'))

        await expect(memberService.renameUser('u1', 'New')).rejects.toThrow('DB error')
    })
})
