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

import { openedSlotService } from '../openedSlotService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getOpenedSlotsForWeek ====================

describe('getOpenedSlotsForWeek', () => {
    it('retourne les dates uniques (déduplique avec Set)', async () => {
        mockResponses['opened_slots'] = {
            data: [{ date: '2025-01-06' }, { date: '2025-01-06' }, { date: '2025-01-07' }],
            error: null,
        }

        const result = await openedSlotService.getOpenedSlotsForWeek('2025-01-06', '2025-01-12')
        expect(result).toEqual(['2025-01-06', '2025-01-07'])
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['opened_slots'] = { data: null, error: { message: 'fail' } }

        const result = await openedSlotService.getOpenedSlotsForWeek('2025-01-06', '2025-01-12')
        expect(result).toEqual([])
    })
})

// ==================== getOpenedSlotsForWeekFull ====================

describe('getOpenedSlotsForWeekFull', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['opened_slots'] = {
            data: [
                {
                    id: 1,
                    date: '2025-01-06',
                    slot_id: '10:00',
                    opened_by: 'u1',
                    target: 'all',
                    created_at: '2025-01-05T10:00:00Z',
                },
            ],
            error: null,
        }

        const result = await openedSlotService.getOpenedSlotsForWeekFull('2025-01-06', '2025-01-12')
        expect(result[0]).toEqual({
            id: 1,
            date: '2025-01-06',
            slotId: '10:00',
            openedBy: 'u1',
            target: 'all',
            createdAt: '2025-01-05T10:00:00Z',
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['opened_slots'] = { data: null, error: { message: 'fail' } }

        const result = await openedSlotService.getOpenedSlotsForWeekFull('2025-01-06', '2025-01-12')
        expect(result).toEqual([])
    })
})

// ==================== getOpenedSlotsForDate ====================

describe('getOpenedSlotsForDate', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['opened_slots'] = {
            data: [
                {
                    id: 1,
                    date: '2025-01-06',
                    slot_id: '10:00',
                    opened_by: 'u1',
                    target: 'all',
                    created_at: '2025-01-05T10:00:00Z',
                },
            ],
            error: null,
        }

        const result = await openedSlotService.getOpenedSlotsForDate('2025-01-06')
        expect(result[0]).toEqual({
            id: 1,
            date: '2025-01-06',
            slotId: '10:00',
            openedBy: 'u1',
            target: 'all',
            createdAt: '2025-01-05T10:00:00Z',
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['opened_slots'] = { data: null, error: { message: 'fail' } }

        const result = await openedSlotService.getOpenedSlotsForDate('2025-01-06')
        expect(result).toEqual([])
    })
})

// ==================== openSlot ====================

describe('openSlot', () => {
    it('retourne success avec slot', async () => {
        const slotData = { id: 1, date: '2025-01-06' }
        mockResponses['opened_slots'] = { data: slotData, error: null }

        const result = await openedSlotService.openSlot('2025-01-06', '10:00', 'u1')
        expect(result).toEqual({ success: true, slot: slotData })
    })

    it("utilise target 'all' par défaut", async () => {
        mockResponses['opened_slots'] = { data: { id: 1 }, error: null }

        const result = await openedSlotService.openSlot('2025-01-06', '10:00', 'u1')
        expect(result).toEqual({ success: true, slot: { id: 1 } })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['opened_slots'] = { data: null, error: err }

        const result = await openedSlotService.openSlot('2025-01-06', '10:00', 'u1')
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== closeSlot ====================

describe('closeSlot', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['opened_slots'] = { data: null, error: null }

        const result = await openedSlotService.closeSlot('2025-01-06', '10:00')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['opened_slots'] = { data: null, error: { message: 'fail' } }

        const result = await openedSlotService.closeSlot('2025-01-06', '10:00')
        expect(result).toEqual({ success: false })
    })
})

// ==================== updateOpenedSlotTarget ====================

describe('updateOpenedSlotTarget', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['opened_slots'] = { data: null, error: null }

        const result = await openedSlotService.updateOpenedSlotTarget(1, 'competition')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['opened_slots'] = { data: null, error: { message: 'fail' } }

        const result = await openedSlotService.updateOpenedSlotTarget(1, 'competition')
        expect(result).toEqual({ success: false })
    })
})
