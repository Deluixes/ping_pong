import { vi, describe, it, expect, beforeEach } from 'vitest'

// ==================== MOCK SUPABASE (séquentiel par table) ====================

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

// ==================== MOCK TEMPLATE SERVICE ====================

const mockGetTemplateSlots = vi.fn().mockResolvedValue([])
const mockGetTemplateHours = vi.fn().mockResolvedValue([])

vi.mock('../templateService', () => ({
    templateService: {
        getTemplateSlots: (...args) => mockGetTemplateSlots(...args),
        getTemplateHours: (...args) => mockGetTemplateHours(...args),
    },
}))

import { weekConfigService } from '../weekConfigService'

// ==================== SETUP ====================

beforeEach(() => {
    vi.clearAllMocks()
    mockResponses = {}
    callIndex = {}
    mockGetTemplateSlots.mockResolvedValue([])
    mockGetTemplateHours.mockResolvedValue([])
})

// ==================== getWeekConfig ====================

describe('getWeekConfig', () => {
    it('retourne null si PGRST116 (aucune config)', async () => {
        mockResponses['week_configs'] = { data: null, error: { code: 'PGRST116' } }

        const result = await weekConfigService.getWeekConfig('2025-01-06')
        expect(result).toBe(null)
    })

    it("retourne null en cas d'erreur inattendue", async () => {
        mockResponses['week_configs'] = { data: null, error: { code: '42P01', message: 'fail' } }

        const result = await weekConfigService.getWeekConfig('2025-01-06')
        expect(result).toBe(null)
    })

    it('retourne la config mappée en camelCase avec slots et hours', async () => {
        mockResponses['week_configs'] = {
            data: { id: 'wc1', week_start: '2025-01-06', template_name: 'Normal' },
            error: null,
        }
        mockResponses['week_slots'] = {
            data: [
                {
                    id: 's1',
                    date: '2025-01-06',
                    start_time: '10:00',
                    end_time: '11:00',
                    name: 'Cours',
                    coach: 'Jean',
                    group_name: 'A',
                    is_blocking: false,
                },
            ],
            error: null,
        }
        mockResponses['week_hours'] = {
            data: [{ id: 'h1', date: '2025-01-06', start_time: '08:00', end_time: '22:00' }],
            error: null,
        }

        const result = await weekConfigService.getWeekConfig('2025-01-06')

        expect(result.id).toBe('wc1')
        expect(result.weekStart).toBe('2025-01-06')
        expect(result.templateName).toBe('Normal')
        expect(result.slots).toHaveLength(1)
        expect(result.slots[0].startTime).toBe('10:00')
        expect(result.slots[0].isBlocking).toBe(false)
        expect(result.hours).toHaveLength(1)
        expect(result.hours[0].startTime).toBe('08:00')
    })
})

// ==================== isWeekConfigured ====================

describe('isWeekConfigured', () => {
    it('retourne true si une config existe', async () => {
        mockResponses['week_configs'] = { data: { id: 'wc1' }, error: null }

        const result = await weekConfigService.isWeekConfigured('2025-01-06')
        expect(result).toBe(true)
    })

    it('retourne false si PGRST116', async () => {
        mockResponses['week_configs'] = { data: null, error: { code: 'PGRST116' } }

        const result = await weekConfigService.isWeekConfigured('2025-01-06')
        expect(result).toBe(false)
    })

    it("retourne false en cas d'erreur", async () => {
        mockResponses['week_configs'] = { data: null, error: { code: '42P01' } }

        const result = await weekConfigService.isWeekConfigured('2025-01-06')
        expect(result).toBe(false)
    })
})

// ==================== getConfiguredWeeks ====================

describe('getConfiguredWeeks', () => {
    it('retourne les semaines triées', async () => {
        mockResponses['week_configs'] = {
            data: [
                { week_start: '2025-01-06', template_name: 'A' },
                { week_start: '2025-01-13', template_name: 'B' },
            ],
            error: null,
        }

        const result = await weekConfigService.getConfiguredWeeks('2025-01-01', '2025-01-31')
        expect(result).toHaveLength(2)
        expect(result[0].week_start).toBe('2025-01-06')
    })

    it("retourne un tableau vide en cas d'erreur", async () => {
        mockResponses['week_configs'] = { data: null, error: { message: 'fail' } }

        const result = await weekConfigService.getConfiguredWeeks('2025-01-01', '2025-01-31')
        expect(result).toEqual([])
    })
})

// ==================== applyTemplateToWeeks ====================

describe('applyTemplateToWeeks', () => {
    it('retourne une erreur si le template est introuvable', async () => {
        mockResponses['week_templates'] = { data: null, error: null }

        const result = await weekConfigService.applyTemplateToWeeks('t1', ['2025-01-06'])
        expect(result.success).toBe(false)
    })

    it('crée les slots et hours en mode overwrite', async () => {
        // week_templates → template name
        // week_configs call 1 → getWeekConfig (existing config)
        // week_slots call 1 → getWeekConfig → existing slots (delete)
        // week_hours call 1 → getWeekConfig → existing hours (delete)
        // week_slots call 2 → delete old
        // week_hours call 2 → delete old
        // week_configs call 2 → update template_name
        // week_slots call 3 → deleteByIds (empty toDelete)
        // week_slots call 4 → insert new slots
        // week_hours call 3 → deleteByIds (empty toDelete)
        // week_hours call 4 → insert new hours
        mockResponses['week_templates'] = { data: { name: 'Normal' }, error: null }
        mockResponses['week_configs'] = [
            // getWeekConfig select
            { data: { id: 'wc1', week_start: '2025-01-06', template_name: 'Old' }, error: null },
            // getWeekConfig delete + update calls resolve ok
            { data: null, error: null },
            { data: null, error: null },
        ]
        mockResponses['week_slots'] = [
            // getWeekConfig → existing slots
            { data: [], error: null },
            // delete old
            { data: null, error: null },
            // insert new
            { data: null, error: null },
            { data: null, error: null },
        ]
        mockResponses['week_hours'] = [
            // getWeekConfig → existing hours
            { data: [], error: null },
            // delete old
            { data: null, error: null },
            // insert new
            { data: null, error: null },
            { data: null, error: null },
        ]

        mockGetTemplateSlots.mockResolvedValue([
            {
                dayOfWeek: 1,
                startTime: '10:00',
                endTime: '11:00',
                name: 'Cours',
                isBlocking: false,
            },
        ])
        mockGetTemplateHours.mockResolvedValue([
            { dayOfWeek: 1, startTime: '08:00', endTime: '22:00' },
        ])

        const result = await weekConfigService.applyTemplateToWeeks('t1', ['2025-01-06'])

        expect(result.success).toBe(true)
        // Vérifie que week_slots insert a été appelé
        const slotInsertCalls = mockFrom.mock.calls.filter((c) => c[0] === 'week_slots')
        expect(slotInsertCalls.length).toBeGreaterThan(0)
    })

    it('continue si getOrCreateWeekConfig retourne null', async () => {
        mockResponses['week_templates'] = { data: { name: 'Normal' }, error: null }
        mockResponses['week_configs'] = [
            // getWeekConfig → erreur
            { data: null, error: { code: '42P01', message: 'fail' } },
            // insert new config → erreur aussi
            { data: null, error: { message: 'insert fail' } },
        ]

        mockGetTemplateSlots.mockResolvedValue([])
        mockGetTemplateHours.mockResolvedValue([])

        const result = await weekConfigService.applyTemplateToWeeks('t1', ['2025-01-06'])
        expect(result.success).toBe(true)
        expect(result.deletedReservations).toBe(0)
    })
})

// ==================== applyMultipleTemplatesToWeeks ====================

describe('applyMultipleTemplatesToWeeks', () => {
    it('retourne une erreur si aucun template fourni', async () => {
        const result = await weekConfigService.applyMultipleTemplatesToWeeks([], ['2025-01-06'])
        expect(result.success).toBe(false)
    })

    it('retourne erreur si templateIds est null', async () => {
        const result = await weekConfigService.applyMultipleTemplatesToWeeks(null, ['2025-01-06'])
        expect(result.success).toBe(false)
    })
})

// ==================== deleteWeekSlot ====================

describe('deleteWeekSlot', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['week_slots'] = { data: null, error: null }

        const result = await weekConfigService.deleteWeekSlot('s1')
        expect(result.success).toBe(true)
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['week_slots'] = { data: null, error: { message: 'fail' } }

        const result = await weekConfigService.deleteWeekSlot('s1')
        expect(result.success).toBe(false)
    })
})

// ==================== addWeekSlot ====================

describe('addWeekSlot', () => {
    it('insère et retourne le slot créé', async () => {
        mockResponses['week_slots'] = {
            data: { id: 's1', date: '2025-01-06', start_time: '10:00', end_time: '11:00' },
            error: null,
        }

        const result = await weekConfigService.addWeekSlot('wc1', {
            date: '2025-01-06',
            startTime: '10:00',
            endTime: '11:00',
            name: 'Cours',
            isBlocking: false,
        })

        expect(result.success).toBe(true)
        expect(result.slot.id).toBe('s1')
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['week_slots'] = { data: null, error: { message: 'fail' } }

        const result = await weekConfigService.addWeekSlot('wc1', {
            date: '2025-01-06',
            startTime: '10:00',
            endTime: '11:00',
            name: 'Cours',
        })

        expect(result.success).toBe(false)
    })
})

// ==================== deleteWeekConfig ====================

describe('deleteWeekConfig', () => {
    it('retourne success sur suppression réussie', async () => {
        mockResponses['week_configs'] = { data: null, error: null }

        const result = await weekConfigService.deleteWeekConfig('2025-01-06')
        expect(result.success).toBe(true)
    })

    it('retourne failure sur erreur', async () => {
        mockResponses['week_configs'] = { data: null, error: { message: 'fail' } }

        const result = await weekConfigService.deleteWeekConfig('2025-01-06')
        expect(result.success).toBe(false)
    })
})

// ==================== analyzeTemplateConflicts ====================

describe('analyzeTemplateConflicts', () => {
    it('retourne une erreur si le template est introuvable', async () => {
        mockResponses['week_templates'] = { data: null, error: null }
        mockGetTemplateSlots.mockResolvedValue([])

        const result = await weekConfigService.analyzeTemplateConflicts('t1', ['2025-01-06'])
        expect(result.success).toBe(false)
    })

    it('retourne hasConfiguredWeeks=false si aucune config', async () => {
        mockResponses['week_templates'] = { data: { name: 'Normal' }, error: null }
        mockResponses['week_configs'] = { data: null, error: { code: 'PGRST116' } }
        mockGetTemplateSlots.mockResolvedValue([])

        const result = await weekConfigService.analyzeTemplateConflicts('t1', ['2025-01-06'])
        expect(result.success).toBe(true)
        expect(result.hasConfiguredWeeks).toBe(false)
        expect(result.configuredWeeks).toEqual([])
    })

    it('détecte les conflits avec les semaines existantes', async () => {
        mockResponses['week_templates'] = { data: { name: 'Normal' }, error: null }
        // analyzeTemplateConflicts appelle getWeekConfig pour chaque weekStart
        mockResponses['week_configs'] = [
            {
                data: {
                    id: 'wc1',
                    week_start: '2025-01-06',
                    template_name: 'Old',
                },
                error: null,
            },
        ]
        mockResponses['week_slots'] = [
            {
                data: [
                    {
                        id: 's1',
                        date: '2025-01-06',
                        start_time: '10:00',
                        end_time: '11:00',
                        name: 'Existant',
                        coach: null,
                        group_name: null,
                        is_blocking: false,
                    },
                ],
                error: null,
            },
        ]
        mockResponses['week_hours'] = [{ data: [], error: null }]

        // Template slot qui chevauche le slot existant
        mockGetTemplateSlots.mockResolvedValue([
            { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', name: 'Nouveau' },
        ])

        const result = await weekConfigService.analyzeTemplateConflicts('t1', ['2025-01-06'])

        expect(result.success).toBe(true)
        expect(result.hasConfiguredWeeks).toBe(true)
        expect(result.conflicts.length).toBeGreaterThan(0)
        expect(result.conflicts[0].newSlot.name).toBe('Nouveau')
        expect(result.conflicts[0].existingSlot.name).toBe('Existant')
    })
})

// ==================== getWeekSlots / getWeekHours ====================

describe('getWeekSlots', () => {
    it('retourne les slots de la semaine', async () => {
        mockResponses['week_configs'] = {
            data: { id: 'wc1', week_start: '2025-01-06', template_name: 'Normal' },
            error: null,
        }
        mockResponses['week_slots'] = {
            data: [
                {
                    id: 's1',
                    date: '2025-01-06',
                    start_time: '10:00',
                    end_time: '11:00',
                    name: 'Cours',
                    coach: null,
                    group_name: null,
                    is_blocking: false,
                },
            ],
            error: null,
        }
        mockResponses['week_hours'] = { data: [], error: null }

        const result = await weekConfigService.getWeekSlots('2025-01-06')
        expect(result).toHaveLength(1)
        expect(result[0].startTime).toBe('10:00')
    })

    it('retourne un tableau vide si pas de config', async () => {
        mockResponses['week_configs'] = { data: null, error: { code: 'PGRST116' } }

        const result = await weekConfigService.getWeekSlots('2025-01-06')
        expect(result).toEqual([])
    })
})

describe('getWeekHours', () => {
    it('retourne les heures de la semaine', async () => {
        mockResponses['week_configs'] = {
            data: { id: 'wc1', week_start: '2025-01-06', template_name: 'Normal' },
            error: null,
        }
        mockResponses['week_slots'] = { data: [], error: null }
        mockResponses['week_hours'] = {
            data: [{ id: 'h1', date: '2025-01-06', start_time: '08:00', end_time: '22:00' }],
            error: null,
        }

        const result = await weekConfigService.getWeekHours('2025-01-06')
        expect(result).toHaveLength(1)
        expect(result[0].startTime).toBe('08:00')
    })

    it('retourne un tableau vide si pas de config', async () => {
        mockResponses['week_configs'] = { data: null, error: { code: 'PGRST116' } }

        const result = await weekConfigService.getWeekHours('2025-01-06')
        expect(result).toEqual([])
    })
})
