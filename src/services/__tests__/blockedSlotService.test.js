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

import { blockedSlotService } from '../blockedSlotService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getBlockedSlots ====================

describe('getBlockedSlots', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['blocked_slots'] = {
            data: [
                {
                    id: 1,
                    day_of_week: 1,
                    start_time: '09:00',
                    end_time: '10:00',
                    group_name: 'Juniors',
                    coach: 'Jean',
                    name: 'Cours A',
                    enabled: true,
                },
            ],
            error: null,
        }

        const result = await blockedSlotService.getBlockedSlots()
        expect(result[0]).toEqual({
            id: 1,
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            group: 'Juniors',
            coach: 'Jean',
            name: 'Cours A',
            enabled: true,
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['blocked_slots'] = { data: null, error: { message: 'fail' } }

        const result = await blockedSlotService.getBlockedSlots()
        expect(result).toEqual([])
    })
})

// ==================== createBlockedSlot ====================

describe('createBlockedSlot', () => {
    it('retourne success avec slot', async () => {
        const slotData = { id: 1, day_of_week: 1 }
        mockResponses['blocked_slots'] = { data: slotData, error: null }

        const result = await blockedSlotService.createBlockedSlot({
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            coach: 'Jean',
            name: 'Cours A',
            group: 'Juniors',
        })
        expect(result).toEqual({ success: true, slot: slotData })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['blocked_slots'] = { data: null, error: err }

        const result = await blockedSlotService.createBlockedSlot({
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            coach: 'Jean',
            name: 'Cours A',
        })
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== updateBlockedSlot ====================

describe('updateBlockedSlot', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['blocked_slots'] = { data: null, error: null }

        const result = await blockedSlotService.updateBlockedSlot(1, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            coach: 'Jean',
            name: 'Cours A',
        })
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['blocked_slots'] = { data: null, error: { message: 'fail' } }

        const result = await blockedSlotService.updateBlockedSlot(1, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            coach: 'Jean',
            name: 'Cours A',
        })
        expect(result).toEqual({ success: false })
    })
})

// ==================== toggleBlockedSlot ====================

describe('toggleBlockedSlot', () => {
    it('retourne success sur toggle réussi', async () => {
        mockResponses['blocked_slots'] = { data: null, error: null }

        const result = await blockedSlotService.toggleBlockedSlot(1, false)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['blocked_slots'] = { data: null, error: { message: 'fail' } }

        const result = await blockedSlotService.toggleBlockedSlot(1, false)
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteBlockedSlot ====================

describe('deleteBlockedSlot', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['blocked_slots'] = { data: null, error: null }

        const result = await blockedSlotService.deleteBlockedSlot(1)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['blocked_slots'] = { data: null, error: { message: 'fail' } }

        const result = await blockedSlotService.deleteBlockedSlot(1)
        expect(result).toEqual({ success: false })
    })
})
