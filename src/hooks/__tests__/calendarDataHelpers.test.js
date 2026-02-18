import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock calendarUtils (setCachedEvents is a side effect we need to neutralize)
vi.mock('../../components/calendar/calendarUtils', () => ({
    getCachedEvents: vi.fn(() => []),
    setCachedEvents: vi.fn(),
}))

// Mock supabase (required because useCalendarData.js imports storageService)
vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
        removeChannel: vi.fn(),
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
        storage: {
            from: vi.fn(() => ({
                list: vi.fn(),
                upload: vi.fn(),
                remove: vi.fn(),
                getPublicUrl: vi.fn(),
            })),
        },
        functions: { invoke: vi.fn() },
    },
}))

import {
    mapReservationRow,
    applyReservationPayload,
    mapInvitationRow,
    applyInvitationPayload,
    mapOpenedSlotRow,
    applyOpenedSlotPayload,
} from '../useCalendarData'

// ==================== mapReservationRow ====================

describe('mapReservationRow', () => {
    it('mappe snake_case vers camelCase', () => {
        const row = {
            slot_id: '10:00',
            date: '2025-01-06',
            user_id: 'u1',
            user_name: 'Alice',
            duration: 2,
            overbooked: true,
        }
        expect(mapReservationRow(row)).toEqual({
            slotId: '10:00',
            date: '2025-01-06',
            userId: 'u1',
            userName: 'Alice',
            duration: 2,
            overbooked: true,
        })
    })

    it('overbooked null → false', () => {
        const row = {
            slot_id: '10:00',
            date: '2025-01-06',
            user_id: 'u1',
            user_name: 'A',
            duration: 1,
            overbooked: null,
        }
        expect(mapReservationRow(row).overbooked).toBe(false)
    })

    it('overbooked undefined → false', () => {
        const row = {
            slot_id: '10:00',
            date: '2025-01-06',
            user_id: 'u1',
            user_name: 'A',
            duration: 1,
        }
        expect(mapReservationRow(row).overbooked).toBe(false)
    })
})

// ==================== applyReservationPayload ====================

describe('applyReservationPayload', () => {
    const weekRange = { start: '2025-01-06', end: '2025-01-12' }
    let setEvents

    beforeEach(() => {
        setEvents = vi.fn((updater) => updater([]))
    })

    it('INSERT ajoute un événement', () => {
        const payload = {
            eventType: 'INSERT',
            new: {
                slot_id: '10:00',
                date: '2025-01-06',
                user_id: 'u1',
                user_name: 'A',
                duration: 1,
                overbooked: false,
            },
            old: null,
        }
        const result = applyReservationPayload(payload, setEvents, weekRange)
        expect(result).toBe(true)
        expect(setEvents).toHaveBeenCalled()
    })

    it("DELETE supprime l'événement correspondant", () => {
        const existing = [
            { slotId: '10:00', date: '2025-01-06', userId: 'u1' },
            { slotId: '11:00', date: '2025-01-06', userId: 'u2' },
        ]
        let updatedList
        setEvents = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'DELETE',
            new: null,
            old: { slot_id: '10:00', date: '2025-01-06', user_id: 'u1' },
        }
        expect(applyReservationPayload(payload, setEvents, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].userId).toBe('u2')
    })

    it("UPDATE remplace l'événement avec les nouvelles données", () => {
        const existing = [{ slotId: '10:00', date: '2025-01-06', userId: 'u1', userName: 'Old' }]
        let updatedList
        setEvents = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'UPDATE',
            old: { slot_id: '10:00', date: '2025-01-06', user_id: 'u1' },
            new: {
                slot_id: '10:00',
                date: '2025-01-06',
                user_id: 'u1',
                user_name: 'New',
                duration: 1,
                overbooked: false,
            },
        }
        expect(applyReservationPayload(payload, setEvents, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].userName).toBe('New')
    })

    it('retourne false si la date est hors de la semaine', () => {
        const payload = {
            eventType: 'INSERT',
            new: {
                slot_id: '10:00',
                date: '2025-02-01',
                user_id: 'u1',
                user_name: 'A',
                duration: 1,
            },
            old: null,
        }
        expect(applyReservationPayload(payload, setEvents, weekRange)).toBe(false)
    })

    it('retourne false si pas de date', () => {
        const payload = { eventType: 'INSERT', new: { slot_id: '10:00' }, old: null }
        expect(applyReservationPayload(payload, setEvents, weekRange)).toBe(false)
    })

    it('retourne false pour un eventType inconnu', () => {
        const payload = {
            eventType: 'UNKNOWN',
            new: { slot_id: '10:00', date: '2025-01-06', user_id: 'u1' },
            old: null,
        }
        expect(applyReservationPayload(payload, setEvents, weekRange)).toBe(false)
    })
})

// ==================== mapInvitationRow ====================

describe('mapInvitationRow', () => {
    it('mappe snake_case vers camelCase', () => {
        const row = {
            slot_id: '14:00',
            user_id: 'u2',
            user_name: 'Bob',
            status: 'pending',
            invited_by: 'u1',
            duration: 2,
        }
        expect(mapInvitationRow(row)).toEqual({
            slotId: '14:00',
            userId: 'u2',
            name: 'Bob',
            status: 'pending',
            invitedBy: 'u1',
            duration: 2,
        })
    })

    it('duration null → 1', () => {
        const row = {
            slot_id: '14:00',
            user_id: 'u2',
            user_name: 'B',
            status: 'pending',
            invited_by: 'u1',
            duration: null,
        }
        expect(mapInvitationRow(row).duration).toBe(1)
    })

    it('duration undefined → 1', () => {
        const row = {
            slot_id: '14:00',
            user_id: 'u2',
            user_name: 'B',
            status: 'pending',
            invited_by: 'u1',
        }
        expect(mapInvitationRow(row).duration).toBe(1)
    })
})

// ==================== applyInvitationPayload ====================

describe('applyInvitationPayload', () => {
    const weekRange = { start: '2025-01-06', end: '2025-01-12' }
    let setInvitations

    beforeEach(() => {
        setInvitations = vi.fn((updater) => updater([]))
    })

    it('INSERT ajoute une invitation', () => {
        const payload = {
            eventType: 'INSERT',
            new: {
                slot_id: '10:00',
                date: '2025-01-06',
                user_id: 'u1',
                user_name: 'A',
                status: 'pending',
                invited_by: 'u2',
                duration: 1,
            },
            old: null,
        }
        expect(applyInvitationPayload(payload, setInvitations, weekRange)).toBe(true)
        expect(setInvitations).toHaveBeenCalled()
    })

    it("DELETE supprime l'invitation correspondante", () => {
        const existing = [
            { slotId: '10:00', date: '2025-01-06', userId: 'u1' },
            { slotId: '10:00', date: '2025-01-06', userId: 'u2' },
        ]
        let updatedList
        setInvitations = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'DELETE',
            new: null,
            old: { slot_id: '10:00', date: '2025-01-06', user_id: 'u1' },
        }
        expect(applyInvitationPayload(payload, setInvitations, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].userId).toBe('u2')
    })

    it("UPDATE change le status d'une invitation", () => {
        const existing = [{ slotId: '10:00', date: '2025-01-06', userId: 'u1', status: 'pending' }]
        let updatedList
        setInvitations = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'UPDATE',
            old: { slot_id: '10:00', date: '2025-01-06', user_id: 'u1' },
            new: {
                slot_id: '10:00',
                date: '2025-01-06',
                user_id: 'u1',
                user_name: 'A',
                status: 'accepted',
                invited_by: 'u2',
                duration: 1,
            },
        }
        expect(applyInvitationPayload(payload, setInvitations, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].status).toBe('accepted')
    })

    it('retourne false si la date est hors de la semaine', () => {
        const payload = {
            eventType: 'INSERT',
            new: { slot_id: '10:00', date: '2025-02-01', user_id: 'u1' },
            old: null,
        }
        expect(applyInvitationPayload(payload, setInvitations, weekRange)).toBe(false)
    })

    it('retourne false si pas de date', () => {
        const payload = { eventType: 'INSERT', new: { slot_id: '10:00' }, old: null }
        expect(applyInvitationPayload(payload, setInvitations, weekRange)).toBe(false)
    })
})

// ==================== mapOpenedSlotRow ====================

describe('mapOpenedSlotRow', () => {
    it('mappe snake_case vers camelCase', () => {
        const row = {
            id: 'os1',
            date: '2025-01-06',
            slot_id: '10:00',
            opened_by: 'u1',
            target: 'all',
            created_at: '2025-01-06T08:00:00Z',
        }
        expect(mapOpenedSlotRow(row)).toEqual({
            id: 'os1',
            date: '2025-01-06',
            slotId: '10:00',
            openedBy: 'u1',
            target: 'all',
            createdAt: '2025-01-06T08:00:00Z',
        })
    })
})

// ==================== applyOpenedSlotPayload ====================

describe('applyOpenedSlotPayload', () => {
    const weekRange = { start: '2025-01-06', end: '2025-01-12' }
    let setOpenedSlots

    beforeEach(() => {
        setOpenedSlots = vi.fn((updater) => updater([]))
    })

    it('INSERT ajoute un slot ouvert', () => {
        const payload = {
            eventType: 'INSERT',
            new: {
                id: 'os1',
                date: '2025-01-06',
                slot_id: '10:00',
                opened_by: 'u1',
                target: 'all',
                created_at: 'ts',
            },
            old: null,
        }
        expect(applyOpenedSlotPayload(payload, setOpenedSlots, weekRange)).toBe(true)
        expect(setOpenedSlots).toHaveBeenCalled()
    })

    it('DELETE supprime le slot ouvert correspondant', () => {
        const existing = [
            { slotId: '10:00', date: '2025-01-06' },
            { slotId: '11:00', date: '2025-01-06' },
        ]
        let updatedList
        setOpenedSlots = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'DELETE',
            new: null,
            old: { slot_id: '10:00', date: '2025-01-06' },
        }
        expect(applyOpenedSlotPayload(payload, setOpenedSlots, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].slotId).toBe('11:00')
    })

    it("UPDATE change le target d'un slot ouvert", () => {
        const existing = [{ slotId: '10:00', date: '2025-01-06', target: 'all' }]
        let updatedList
        setOpenedSlots = vi.fn((updater) => {
            updatedList = updater(existing)
        })
        const payload = {
            eventType: 'UPDATE',
            old: { slot_id: '10:00', date: '2025-01-06' },
            new: {
                id: 'os1',
                date: '2025-01-06',
                slot_id: '10:00',
                opened_by: 'u1',
                target: 'loisir',
                created_at: 'ts',
            },
        }
        expect(applyOpenedSlotPayload(payload, setOpenedSlots, weekRange)).toBe(true)
        expect(updatedList).toHaveLength(1)
        expect(updatedList[0].target).toBe('loisir')
    })

    it('retourne false si la date est hors de la semaine', () => {
        const payload = {
            eventType: 'INSERT',
            new: { id: 'os1', date: '2025-02-01', slot_id: '10:00' },
            old: null,
        }
        expect(applyOpenedSlotPayload(payload, setOpenedSlots, weekRange)).toBe(false)
    })
})
