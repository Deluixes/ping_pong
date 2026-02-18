import { vi, describe, it, expect, beforeEach } from 'vitest'

// ==================== MOCK SUPABASE ====================

let mockResponses = {}

function createChain(tableName) {
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
        then: (resolve) => resolve(mockResponses[tableName] || { data: null, error: null }),
    }
    return chain
}

const mockFrom = vi.fn((tableName) => createChain(tableName))

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: (...args) => mockFrom(...args),
    },
}))

import { invitationService } from '../invitationService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getSlotInvitations ====================

describe('getSlotInvitations', () => {
    it('mappe les données (userId, name, status, invitedBy)', async () => {
        mockResponses['slot_invitations'] = {
            data: [{ user_id: 'u1', user_name: 'Alice', status: 'pending', invited_by: 'u2' }],
            error: null,
        }

        const result = await invitationService.getSlotInvitations('10:00', '2025-01-06')
        expect(result).toEqual([
            { userId: 'u1', name: 'Alice', status: 'pending', invitedBy: 'u2' },
        ])
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['slot_invitations'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.getSlotInvitations('10:00', '2025-01-06')
        expect(result).toEqual([])
    })
})

// ==================== getAllInvitationsForDate ====================

describe('getAllInvitationsForDate', () => {
    it('mappe les données avec duration par défaut à 1', async () => {
        mockResponses['slot_invitations'] = {
            data: [
                {
                    slot_id: '10:00',
                    user_id: 'u1',
                    user_name: 'Alice',
                    status: 'pending',
                    invited_by: 'u2',
                    duration: null,
                },
            ],
            error: null,
        }

        const result = await invitationService.getAllInvitationsForDate('2025-01-06')
        expect(result[0].duration).toBe(1)
        expect(result[0].slotId).toBe('10:00')
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['slot_invitations'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.getAllInvitationsForDate('2025-01-06')
        expect(result).toEqual([])
    })
})

// ==================== getAllInvitationsForWeek ====================

describe('getAllInvitationsForWeek', () => {
    it('retourne les invitations avec date et slotId', async () => {
        mockResponses['slot_invitations'] = {
            data: [
                {
                    slot_id: '14:00',
                    date: '2025-01-07',
                    user_id: 'u1',
                    user_name: 'Alice',
                    status: 'accepted',
                    invited_by: 'u2',
                    duration: 2,
                },
            ],
            error: null,
        }

        const result = await invitationService.getAllInvitationsForWeek('2025-01-06', '2025-01-12')
        expect(result[0]).toEqual({
            slotId: '14:00',
            date: '2025-01-07',
            userId: 'u1',
            name: 'Alice',
            status: 'accepted',
            invitedBy: 'u2',
            duration: 2,
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['slot_invitations'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.getAllInvitationsForWeek('2025-01-06', '2025-01-12')
        expect(result).toEqual([])
    })
})

// ==================== getPendingInvitations ====================

describe('getPendingInvitations', () => {
    it('retourne les invitations avec les noms des inviteurs', async () => {
        mockResponses['slot_invitations'] = {
            data: [{ slot_id: '10:00', date: '2025-01-06', invited_by: 'u2', duration: 1 }],
            error: null,
        }
        mockResponses['members'] = {
            data: [{ user_id: 'u2', name: 'Bob' }],
            error: null,
        }

        const result = await invitationService.getPendingInvitations('u1')
        expect(result[0]).toEqual({
            slotId: '10:00',
            date: '2025-01-06',
            invitedBy: 'Bob',
            duration: 1,
        })
    })

    it("retourne invitedBy null si le membre n'existe pas", async () => {
        mockResponses['slot_invitations'] = {
            data: [{ slot_id: '10:00', date: '2025-01-06', invited_by: 'unknown', duration: 1 }],
            error: null,
        }
        mockResponses['members'] = { data: [], error: null }

        const result = await invitationService.getPendingInvitations('u1')
        expect(result[0].invitedBy).toBeNull()
    })

    it("ne requête pas members quand il n'y a pas d'inviteurs", async () => {
        mockResponses['slot_invitations'] = {
            data: [{ slot_id: '10:00', date: '2025-01-06', invited_by: null, duration: 1 }],
            error: null,
        }

        const result = await invitationService.getPendingInvitations('u1')
        expect(result[0].invitedBy).toBeNull()
        // members should not have been queried
        const membersCalls = mockFrom.mock.calls.filter((c) => c[0] === 'members')
        expect(membersCalls).toHaveLength(0)
    })

    it('gère le cas où la requête members échoue', async () => {
        mockResponses['slot_invitations'] = {
            data: [{ slot_id: '10:00', date: '2025-01-06', invited_by: 'u2', duration: 1 }],
            error: null,
        }
        mockResponses['members'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.getPendingInvitations('u1')
        expect(result[0].invitedBy).toBeNull()
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['slot_invitations'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.getPendingInvitations('u1')
        expect(result).toEqual([])
    })
})

// ==================== getPendingInvitationsCount ====================

describe('getPendingInvitationsCount', () => {
    it("retourne le nombre d'invitations en attente", async () => {
        mockResponses['slot_invitations'] = { count: 5, error: null }

        const result = await invitationService.getPendingInvitationsCount('u1')
        expect(result).toBe(5)
    })

    it('retourne 0 sur erreur', async () => {
        mockResponses['slot_invitations'] = { count: null, error: { message: 'fail' } }

        const result = await invitationService.getPendingInvitationsCount('u1')
        expect(result).toBe(0)
    })
})

// ==================== inviteToSlot ====================

describe('inviteToSlot', () => {
    it('retourne success sur insertion réussie', async () => {
        mockResponses['slot_invitations'] = { data: null, error: null }

        const result = await invitationService.inviteToSlot(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            'u2'
        )
        expect(result).toEqual({ success: true })
    })

    it('retourne success sur duplicate key (23505)', async () => {
        mockResponses['slot_invitations'] = {
            data: null,
            error: { code: '23505', message: 'duplicate' },
        }

        const result = await invitationService.inviteToSlot(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            'u2'
        )
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur autre erreur', async () => {
        mockResponses['slot_invitations'] = {
            data: null,
            error: { code: '42P01', message: 'fail' },
        }

        const result = await invitationService.inviteToSlot(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            'u2'
        )
        expect(result).toEqual({ success: false })
    })
})

// ==================== acceptInvitation ====================

describe('acceptInvitation', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['slot_invitations'] = { data: null, error: null }

        const result = await invitationService.acceptInvitation('10:00', '2025-01-06', 'u1')
        expect(result).toEqual({ success: true })
    })

    it('inclut slot_id et duration si fournis', async () => {
        mockResponses['slot_invitations'] = { data: null, error: null }

        const result = await invitationService.acceptInvitation(
            '10:00',
            '2025-01-06',
            'u1',
            '14:00',
            2
        )
        expect(result).toEqual({ success: true })
    })
})

// ==================== declineInvitation ====================

describe('declineInvitation', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['slot_invitations'] = { data: null, error: null }

        const result = await invitationService.declineInvitation('10:00', '2025-01-06', 'u1')
        expect(result).toEqual({ success: true })
    })
})

// ==================== removeGuestFromSlot ====================

describe('removeGuestFromSlot', () => {
    it('délègue à declineInvitation', async () => {
        mockResponses['slot_invitations'] = { data: null, error: null }

        const result = await invitationService.removeGuestFromSlot('10:00', '2025-01-06', 'u1')
        expect(result).toEqual({ success: true })
    })
})

// ==================== updateUserNameInInvitations ====================

describe('updateUserNameInInvitations', () => {
    it('retourne le nombre de lignes mises à jour', async () => {
        mockResponses['slot_invitations'] = { data: [{}, {}], error: null }

        const result = await invitationService.updateUserNameInInvitations('u1', 'NewName')
        expect(result).toEqual({ success: true, updated: 2 })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['slot_invitations'] = { data: null, error: { message: 'fail' } }

        const result = await invitationService.updateUserNameInInvitations('u1', 'NewName')
        expect(result).toEqual({ success: false })
    })
})
