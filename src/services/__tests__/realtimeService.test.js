import { vi, describe, it, expect, beforeEach } from 'vitest'

// ==================== MOCK SUPABASE ====================

const mockSubscribe = vi.fn()
const mockOn = vi.fn().mockReturnValue({ subscribe: mockSubscribe })
const mockChannel = vi.fn().mockReturnValue({ on: mockOn })
const mockRemoveChannel = vi.fn()

vi.mock('../../lib/supabase', () => ({
    supabase: {
        channel: (...args) => mockChannel(...args),
        removeChannel: (...args) => mockRemoveChannel(...args),
    },
}))

import { realtimeService } from '../realtimeService'

// ==================== SETUP ====================

beforeEach(() => {
    mockChannel.mockClear()
    mockOn.mockClear()
    mockSubscribe.mockClear()
    mockRemoveChannel.mockClear()
})

// ==================== subscribeToReservations ====================

describe('subscribeToReservations', () => {
    it('crée un canal pour la table reservations', () => {
        const callback = vi.fn()
        realtimeService.subscribeToReservations(callback)

        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'reservations' },
            expect.any(Function)
        )
    })

    it('appelle subscribe()', () => {
        realtimeService.subscribeToReservations(vi.fn())
        expect(mockSubscribe).toHaveBeenCalled()
    })
})

// ==================== subscribeToMembers ====================

describe('subscribeToMembers', () => {
    it('crée un canal pour la table members', () => {
        realtimeService.subscribeToMembers(vi.fn())

        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'members' },
            expect.any(Function)
        )
    })
})

// ==================== subscribeToInvitations ====================

describe('subscribeToInvitations', () => {
    it('crée un canal pour la table slot_invitations', () => {
        realtimeService.subscribeToInvitations(vi.fn())

        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'slot_invitations' },
            expect.any(Function)
        )
    })
})

// ==================== subscribeToOpenedSlots ====================

describe('subscribeToOpenedSlots', () => {
    it('crée un canal pour la table opened_slots', () => {
        realtimeService.subscribeToOpenedSlots(vi.fn())

        expect(mockOn).toHaveBeenCalledWith(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'opened_slots' },
            expect.any(Function)
        )
    })
})

// ==================== unsubscribe ====================

describe('unsubscribe', () => {
    it("appelle removeChannel avec l'abonnement", () => {
        const sub = { id: 'test' }
        realtimeService.unsubscribe(sub)
        expect(mockRemoveChannel).toHaveBeenCalledWith(sub)
    })

    it("ne fait rien si l'abonnement est null", () => {
        realtimeService.unsubscribe(null)
        expect(mockRemoveChannel).not.toHaveBeenCalled()
    })
})

// ==================== uniqueChannel ====================

describe('uniqueChannel (implicite)', () => {
    it('génère des noms de canaux uniques', () => {
        realtimeService.subscribeToReservations(vi.fn())
        realtimeService.subscribeToReservations(vi.fn())

        const channelNames = mockChannel.mock.calls.map((c) => c[0])
        const reservationNames = channelNames.filter((n) => n.startsWith('reservations-changes'))
        expect(new Set(reservationNames).size).toBe(reservationNames.length)
    })
})
