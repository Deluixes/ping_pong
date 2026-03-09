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

import { settingsService } from '../settingsService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getSetting ====================

describe('getSetting', () => {
    it('retourne la valeur du paramètre', async () => {
        mockResponses['settings'] = { data: { value: '42' }, error: null }

        const result = await settingsService.getSetting('max_players')
        expect(result).toBe('42')
    })

    it('retourne null sur erreur', async () => {
        mockResponses['settings'] = { data: null, error: { message: 'fail' } }

        const result = await settingsService.getSetting('max_players')
        expect(result).toBeNull()
    })
})

// ==================== updateSetting ====================

describe('updateSetting', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['settings'] = { data: null, error: null }

        const result = await settingsService.updateSetting('max_players', '42')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['settings'] = { data: null, error: { message: 'fail' } }

        const result = await settingsService.updateSetting('max_players', '42')
        expect(result).toEqual({ success: false })
    })
})
