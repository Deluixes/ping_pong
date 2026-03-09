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

import { openingHourService } from '../openingHourService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getOpeningHours ====================

describe('getOpeningHours', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['opening_hours'] = {
            data: [
                {
                    id: 1,
                    day_of_week: 1,
                    start_time: '08:00',
                    end_time: '20:00',
                    enabled: true,
                },
            ],
            error: null,
        }

        const result = await openingHourService.getOpeningHours()
        expect(result[0]).toEqual({
            id: 1,
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '20:00',
            enabled: true,
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['opening_hours'] = { data: null, error: { message: 'fail' } }

        const result = await openingHourService.getOpeningHours()
        expect(result).toEqual([])
    })
})

// ==================== createOpeningHour ====================

describe('createOpeningHour', () => {
    it('retourne success avec hour', async () => {
        const hourData = { id: 1, day_of_week: 1 }
        mockResponses['opening_hours'] = { data: hourData, error: null }

        const result = await openingHourService.createOpeningHour({
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '20:00',
        })
        expect(result).toEqual({ success: true, hour: hourData })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['opening_hours'] = { data: null, error: err }

        const result = await openingHourService.createOpeningHour({
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '20:00',
        })
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== updateOpeningHour ====================

describe('updateOpeningHour', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['opening_hours'] = { data: null, error: null }

        const result = await openingHourService.updateOpeningHour(1, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '20:00',
        })
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['opening_hours'] = { data: null, error: { message: 'fail' } }

        const result = await openingHourService.updateOpeningHour(1, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '20:00',
        })
        expect(result).toEqual({ success: false })
    })
})

// ==================== toggleOpeningHour ====================

describe('toggleOpeningHour', () => {
    it('retourne success sur toggle réussi', async () => {
        mockResponses['opening_hours'] = { data: null, error: null }

        const result = await openingHourService.toggleOpeningHour(1, false)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['opening_hours'] = { data: null, error: { message: 'fail' } }

        const result = await openingHourService.toggleOpeningHour(1, false)
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteOpeningHour ====================

describe('deleteOpeningHour', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['opening_hours'] = { data: null, error: null }

        const result = await openingHourService.deleteOpeningHour(1)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['opening_hours'] = { data: null, error: { message: 'fail' } }

        const result = await openingHourService.deleteOpeningHour(1)
        expect(result).toEqual({ success: false })
    })
})
