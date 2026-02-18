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

import { reservationService } from '../reservationService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getEvents ====================

describe('getEvents', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['reservations'] = {
            data: [
                {
                    slot_id: '10:00',
                    date: '2025-01-06',
                    user_id: 'u1',
                    user_name: 'Alice',
                    duration: 2,
                    overbooked: true,
                },
            ],
            error: null,
        }

        const events = await reservationService.getEvents()
        expect(events).toHaveLength(1)
        expect(events[0]).toEqual({
            slotId: '10:00',
            date: '2025-01-06',
            userId: 'u1',
            userName: 'Alice',
            duration: 2,
            overbooked: true,
        })
    })

    it("retourne un tableau vide en cas d'erreur", async () => {
        mockResponses['reservations'] = { data: null, error: { message: 'fail' } }

        const events = await reservationService.getEvents()
        expect(events).toEqual([])
    })
})

// ==================== unregisterFromSlot ====================

describe('unregisterFromSlot', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['reservations'] = { data: null, error: null }

        const result = await reservationService.unregisterFromSlot('10:00', '2025-01-06', 'u1')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['reservations'] = { data: null, error: { message: 'fail' } }

        const result = await reservationService.unregisterFromSlot('10:00', '2025-01-06', 'u1')
        expect(result).toEqual({ success: false })
    })
})

// ==================== updateSlotDuration ====================

describe('updateSlotDuration', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['reservations'] = { data: null, error: null }

        const result = await reservationService.updateSlotDuration('10:00', '2025-01-06', 'u1', 2)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['reservations'] = { data: null, error: { message: 'fail' } }

        const result = await reservationService.updateSlotDuration('10:00', '2025-01-06', 'u1', 2)
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteReservationsForSlot ====================

describe('deleteReservationsForSlot', () => {
    it('retourne le nombre de réservations supprimées', async () => {
        mockResponses['reservations'] = { data: [{}, {}, {}], error: null }

        const result = await reservationService.deleteReservationsForSlot('2025-01-06', '10:00')
        expect(result).toEqual({ success: true, deleted: 3 })
    })

    it('retourne deleted: 0 quand data est null', async () => {
        mockResponses['reservations'] = { data: null, error: null }

        const result = await reservationService.deleteReservationsForSlot('2025-01-06', '10:00')
        expect(result).toEqual({ success: true, deleted: 0 })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['reservations'] = { data: null, error: { message: 'fail' } }

        const result = await reservationService.deleteReservationsForSlot('2025-01-06', '10:00')
        expect(result).toEqual({ success: false, deleted: 0 })
    })
})

// ==================== updateUserNameInEvents ====================

describe('updateUserNameInEvents', () => {
    it('retourne le nombre de lignes mises à jour', async () => {
        mockResponses['reservations'] = { data: [{}, {}], error: null }

        const result = await reservationService.updateUserNameInEvents('u1', 'NewName')
        expect(result).toEqual({ success: true, updated: 2 })
    })

    it('retourne updated: 0 quand data est null', async () => {
        mockResponses['reservations'] = { data: null, error: null }

        const result = await reservationService.updateUserNameInEvents('u1', 'NewName')
        expect(result).toEqual({ success: true, updated: 0 })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['reservations'] = { data: null, error: { message: 'fail' } }

        const result = await reservationService.updateUserNameInEvents('u1', 'NewName')
        expect(result).toEqual({ success: false, updated: 0 })
    })
})
