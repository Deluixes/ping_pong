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

import { templateService } from '../templateService'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== getTemplates ====================

describe('getTemplates', () => {
    it('retourne les templates', async () => {
        mockResponses['week_templates'] = {
            data: [
                { id: 1, name: 'Semaine A' },
                { id: 2, name: 'Semaine B' },
            ],
            error: null,
        }

        const result = await templateService.getTemplates()
        expect(result).toEqual([
            { id: 1, name: 'Semaine A' },
            { id: 2, name: 'Semaine B' },
        ])
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['week_templates'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.getTemplates()
        expect(result).toEqual([])
    })
})

// ==================== createTemplate ====================

describe('createTemplate', () => {
    it('retourne success avec template', async () => {
        mockResponses['week_templates'] = {
            data: { id: 1, name: 'Nouveau' },
            error: null,
        }

        const result = await templateService.createTemplate('Nouveau')
        expect(result).toEqual({ success: true, template: { id: 1, name: 'Nouveau' } })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['week_templates'] = { data: null, error: err }

        const result = await templateService.createTemplate('Nouveau')
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== updateTemplate ====================

describe('updateTemplate', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['week_templates'] = { data: null, error: null }

        const result = await templateService.updateTemplate(1, 'Renommé')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['week_templates'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.updateTemplate(1, 'Renommé')
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteTemplate ====================

describe('deleteTemplate', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['week_templates'] = { data: null, error: null }

        const result = await templateService.deleteTemplate(1)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['week_templates'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.deleteTemplate(1)
        expect(result).toEqual({ success: false })
    })
})

// ==================== getTemplateSlots ====================

describe('getTemplateSlots', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['template_slots'] = {
            data: [
                {
                    id: 10,
                    template_id: 1,
                    day_of_week: 1,
                    start_time: '09:00',
                    end_time: '10:00',
                    name: 'Cours A',
                    coach: 'Jean',
                    group_name: 'Juniors',
                    is_blocking: true,
                },
            ],
            error: null,
        }

        const result = await templateService.getTemplateSlots(1)
        expect(result[0]).toEqual({
            id: 10,
            templateId: 1,
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Cours A',
            coach: 'Jean',
            group: 'Juniors',
            isBlocking: true,
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['template_slots'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.getTemplateSlots(1)
        expect(result).toEqual([])
    })
})

// ==================== createTemplateSlot ====================

describe('createTemplateSlot', () => {
    it('retourne success avec slot', async () => {
        const slotData = { id: 10, template_id: 1 }
        mockResponses['template_slots'] = { data: slotData, error: null }

        const result = await templateService.createTemplateSlot(1, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Cours',
            coach: 'Jean',
            group: 'Juniors',
            isBlocking: true,
        })
        expect(result).toEqual({ success: true, slot: slotData })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['template_slots'] = { data: null, error: err }

        const result = await templateService.createTemplateSlot(1, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Cours',
        })
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== updateTemplateSlot ====================

describe('updateTemplateSlot', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['template_slots'] = { data: null, error: null }

        const result = await templateService.updateTemplateSlot(10, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Cours',
        })
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['template_slots'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.updateTemplateSlot(10, {
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '10:00',
            name: 'Cours',
        })
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteTemplateSlot ====================

describe('deleteTemplateSlot', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['template_slots'] = { data: null, error: null }

        const result = await templateService.deleteTemplateSlot(10)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['template_slots'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.deleteTemplateSlot(10)
        expect(result).toEqual({ success: false })
    })
})

// ==================== getTemplateHours ====================

describe('getTemplateHours', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['template_hours'] = {
            data: [
                {
                    id: 20,
                    template_id: 1,
                    day_of_week: 1,
                    start_time: '08:00',
                    end_time: '12:00',
                },
            ],
            error: null,
        }

        const result = await templateService.getTemplateHours(1)
        expect(result[0]).toEqual({
            id: 20,
            templateId: 1,
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
        })
    })

    it('retourne un tableau vide sur erreur', async () => {
        mockResponses['template_hours'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.getTemplateHours(1)
        expect(result).toEqual([])
    })
})

// ==================== createTemplateHour ====================

describe('createTemplateHour', () => {
    it('retourne success avec hour', async () => {
        const hourData = { id: 20, template_id: 1 }
        mockResponses['template_hours'] = { data: hourData, error: null }

        const result = await templateService.createTemplateHour(1, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
        })
        expect(result).toEqual({ success: true, hour: hourData })
    })

    it('retourne failure sur erreur', async () => {
        const err = { message: 'fail' }
        mockResponses['template_hours'] = { data: null, error: err }

        const result = await templateService.createTemplateHour(1, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
        })
        expect(result).toEqual({ success: false, error: err })
    })
})

// ==================== updateTemplateHour ====================

describe('updateTemplateHour', () => {
    it('retourne success sur mise à jour réussie', async () => {
        mockResponses['template_hours'] = { data: null, error: null }

        const result = await templateService.updateTemplateHour(20, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
        })
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['template_hours'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.updateTemplateHour(20, {
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '12:00',
        })
        expect(result).toEqual({ success: false })
    })
})

// ==================== deleteTemplateHour ====================

describe('deleteTemplateHour', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['template_hours'] = { data: null, error: null }

        const result = await templateService.deleteTemplateHour(20)
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['template_hours'] = { data: null, error: { message: 'fail' } }

        const result = await templateService.deleteTemplateHour(20)
        expect(result).toEqual({ success: false })
    })
})
