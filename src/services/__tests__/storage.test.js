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
        channel: vi.fn(() => ({
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn(),
        })),
        removeChannel: vi.fn(),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        },
        storage: {
            from: vi.fn(() => ({
                list: vi.fn().mockResolvedValue({ data: [], error: null }),
                upload: vi.fn().mockResolvedValue({ error: null }),
                remove: vi.fn().mockResolvedValue({ error: null }),
                getPublicUrl: vi.fn(() => ({
                    data: { publicUrl: 'http://test.com/photo.jpg' },
                })),
            })),
        },
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
        },
    },
}))

import { storageService } from '../storage'
import { GROUP_NAME } from '../../constants'

// ==================== SETUP ====================

beforeEach(() => {
    mockResponses = {}
    mockFrom.mockClear()
})

// ==================== GROUP_NAME ====================

describe('GROUP_NAME', () => {
    it('exporte la bonne valeur constante', () => {
        expect(GROUP_NAME).toBe('Ping-Pong Ramonville')
    })
})

// ==================== FONCTIONS PURES ====================

describe('_timeToMinutes', () => {
    it('convertit 00:00 en 0', () => {
        expect(storageService._timeToMinutes('00:00')).toBe(0)
    })

    it('convertit 01:30 en 90', () => {
        expect(storageService._timeToMinutes('01:30')).toBe(90)
    })

    it('convertit 23:59 en 1439', () => {
        expect(storageService._timeToMinutes('23:59')).toBe(1439)
    })

    it('gère le format HH:MM:SS en ignorant les secondes', () => {
        expect(storageService._timeToMinutes('14:30:00')).toBe(870)
    })

    it('gère les heures à un chiffre', () => {
        expect(storageService._timeToMinutes('9:00')).toBe(540)
    })
})

describe('_slotIdToMinutes', () => {
    it('convertit 10:00 en 600', () => {
        expect(storageService._slotIdToMinutes('10:00')).toBe(600)
    })

    it('donne le même résultat que _timeToMinutes pour le même input', () => {
        expect(storageService._slotIdToMinutes('14:30')).toBe(
            storageService._timeToMinutes('14:30')
        )
    })
})

describe('_slotsOverlap', () => {
    it('détecte le chevauchement sur le même jour (camelCase)', () => {
        const slot1 = { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }
        const slot2 = { dayOfWeek: 1, startTime: '10:00', endTime: '12:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(true)
    })

    it('retourne false pour des créneaux adjacents (end1 === start2)', () => {
        const slot1 = { dayOfWeek: 1, startTime: '09:00', endTime: '10:00' }
        const slot2 = { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(false)
    })

    it('retourne false pour des jours différents', () => {
        const slot1 = { dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }
        const slot2 = { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(false)
    })

    it('fonctionne avec les propriétés snake_case', () => {
        const slot1 = { date: '2025-01-06', start_time: '09:00', end_time: '11:00' }
        const slot2 = { date: '2025-01-06', start_time: '10:00', end_time: '12:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(true)
    })

    it('utilise la propriété date quand dayOfWeek est absent', () => {
        const slot1 = { date: '2025-01-06', startTime: '09:00', endTime: '11:00' }
        const slot2 = { date: '2025-01-07', startTime: '09:00', endTime: '11:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(false)
    })

    it("détecte l'inclusion totale (slot2 dans slot1)", () => {
        const slot1 = { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' }
        const slot2 = { dayOfWeek: 3, startTime: '10:00', endTime: '12:00' }
        expect(storageService._slotsOverlap(slot1, slot2)).toBe(true)
    })

    it('détecte le même créneau exact comme chevauchement', () => {
        const slot = { dayOfWeek: 5, startTime: '14:00', endTime: '16:00' }
        expect(storageService._slotsOverlap(slot, slot)).toBe(true)
    })
})

// ==================== METHODES SUPABASE ====================

describe('getEvents', () => {
    it('mappe les données snake_case vers camelCase', async () => {
        mockResponses['reservations'] = {
            data: [
                {
                    slot_id: '10:00',
                    date: '2025-01-06',
                    user_id: 'u1',
                    user_name: 'Alice',
                    duration: 1,
                    overbooked: false,
                },
                {
                    slot_id: '14:00',
                    date: '2025-01-06',
                    user_id: 'u2',
                    user_name: 'Bob',
                    duration: 2,
                    overbooked: true,
                },
            ],
            error: null,
        }

        const events = await storageService.getEvents()

        expect(events).toHaveLength(2)
        expect(events[0]).toEqual({
            slotId: '10:00',
            date: '2025-01-06',
            userId: 'u1',
            userName: 'Alice',
            duration: 1,
            overbooked: false,
        })
        expect(events[1].overbooked).toBe(true)
    })

    it("retourne un tableau vide en cas d'erreur", async () => {
        mockResponses['reservations'] = {
            data: null,
            error: { message: 'Network error' },
        }

        const events = await storageService.getEvents()
        expect(events).toEqual([])
    })

    it('met overbooked à false quand la valeur est null', async () => {
        mockResponses['reservations'] = {
            data: [
                {
                    slot_id: '10:00',
                    date: '2025-01-06',
                    user_id: 'u1',
                    user_name: 'Alice',
                    duration: 1,
                    overbooked: null,
                },
            ],
            error: null,
        }

        const events = await storageService.getEvents()
        expect(events[0].overbooked).toBe(false)
    })
})

describe('registerForSlot', () => {
    it('retourne success sur insert réussi', async () => {
        mockResponses['reservations'] = { data: null, error: null }

        const result = await storageService.registerForSlot(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            1,
            false
        )
        expect(result).toEqual({ success: true })
    })

    it('retourne success sur duplicate key (23505)', async () => {
        mockResponses['reservations'] = {
            data: null,
            error: { code: '23505', message: 'duplicate key' },
        }

        const result = await storageService.registerForSlot('10:00', '2025-01-06', 'u1', 'Alice')
        expect(result).toEqual({ success: true })
    })

    it('retourne failure sur autre erreur', async () => {
        mockResponses['reservations'] = {
            data: null,
            error: { code: '42P01', message: 'relation does not exist' },
        }

        const result = await storageService.registerForSlot('10:00', '2025-01-06', 'u1', 'Alice')
        expect(result).toEqual({ success: false })
    })
})

describe('getMembers', () => {
    it('sépare les membres en pending et approved', async () => {
        mockResponses['members'] = {
            data: [
                {
                    user_id: 'u1',
                    email: 'a@b.c',
                    name: 'Alice',
                    status: 'pending',
                    requested_at: '2025-01-01',
                    role: 'member',
                    license_type: null,
                },
                {
                    user_id: 'u2',
                    email: 'd@e.f',
                    name: 'Bob',
                    status: 'approved',
                    requested_at: '2025-01-01',
                    approved_at: '2025-01-02',
                    role: 'admin',
                    license_type: 'competition',
                },
            ],
            error: null,
        }

        const result = await storageService.getMembers()
        expect(result.pending).toHaveLength(1)
        expect(result.approved).toHaveLength(1)
        expect(result.pending[0].name).toBe('Alice')
        expect(result.approved[0].role).toBe('admin')
    })

    it('filtre les membres TEST_ par défaut', async () => {
        mockResponses['members'] = {
            data: [
                {
                    user_id: 'u1',
                    email: 'a@b.c',
                    name: 'TEST_Bot',
                    status: 'approved',
                    requested_at: '2025-01-01',
                    approved_at: '2025-01-02',
                    role: 'member',
                    license_type: null,
                },
                {
                    user_id: 'u2',
                    email: 'd@e.f',
                    name: 'Bob',
                    status: 'approved',
                    requested_at: '2025-01-01',
                    approved_at: '2025-01-02',
                    role: 'member',
                    license_type: null,
                },
            ],
            error: null,
        }

        const result = await storageService.getMembers(false)
        expect(result.approved).toHaveLength(1)
        expect(result.approved[0].name).toBe('Bob')
    })

    it('inclut les membres TEST_ quand includeTEST est true', async () => {
        mockResponses['members'] = {
            data: [
                {
                    user_id: 'u1',
                    email: 'a@b.c',
                    name: 'TEST_Bot',
                    status: 'approved',
                    requested_at: '2025-01-01',
                    approved_at: '2025-01-02',
                    role: 'member',
                    license_type: null,
                },
            ],
            error: null,
        }

        const result = await storageService.getMembers(true)
        expect(result.approved).toHaveLength(1)
    })

    it("retourne des tableaux vides en cas d'erreur", async () => {
        mockResponses['members'] = {
            data: null,
            error: { message: 'fail' },
        }

        const result = await storageService.getMembers()
        expect(result).toEqual({ pending: [], approved: [] })
    })
})
