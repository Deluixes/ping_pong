// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSlotHelpers } from '../useSlotHelpers'
import { TIME_SLOTS } from '../../components/calendar/calendarUtils'

// ==================== HELPERS ====================

const TODAY = new Date('2025-01-06') // Monday
const DATE_STR = '2025-01-06'

function createProps(overrides = {}) {
    return {
        events: [],
        selectedDate: TODAY,
        weekSlots: [],
        weekHours: [],
        isWeekConfigured: false,
        openedSlots: [],
        invitations: [],
        maxPersons: 16,
        user: { id: 'u1', licenseType: 'L' },
        ...overrides,
    }
}

function renderSlotHelpers(overrides = {}) {
    const { result } = renderHook(() => useSlotHelpers(createProps(overrides)))
    return result.current
}

// ==================== getSlotIndex ====================

describe('getSlotIndex', () => {
    it("retourne l'index correct pour un slot existant", () => {
        const helpers = renderSlotHelpers()
        // TIME_SLOTS starts at 8:00 (index 0), 8:30 (index 1), 9:00 (index 2)...
        expect(helpers.getSlotIndex('8:00')).toBe(0)
        expect(helpers.getSlotIndex('8:30')).toBe(1)
        expect(helpers.getSlotIndex('9:00')).toBe(2)
    })

    it('retourne -1 pour un slot inconnu', () => {
        const helpers = renderSlotHelpers()
        expect(helpers.getSlotIndex('99:99')).toBe(-1)
    })
})

// ==================== getParticipants ====================

describe('getParticipants', () => {
    it('retourne les participants inscrits depuis les events', () => {
        const helpers = renderSlotHelpers({
            events: [
                { slotId: '10:00', date: DATE_STR, userId: 'u1', userName: 'Alice', duration: 1 },
                { slotId: '10:00', date: DATE_STR, userId: 'u2', userName: 'Bob', duration: 1 },
            ],
        })
        const participants = helpers.getParticipants('10:00')
        expect(participants).toHaveLength(2)
        expect(participants[0].name).toBe('Alice')
        expect(participants[0].isGuest).toBe(false)
        expect(participants[0].status).toBe('accepted')
    })

    it('inclut les invitations dans les participants', () => {
        const helpers = renderSlotHelpers({
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u2',
                    name: 'Bob',
                    status: 'pending',
                    invitedBy: 'u1',
                    duration: 1,
                },
            ],
        })
        const participants = helpers.getParticipants('10:00')
        expect(participants).toHaveLength(1)
        expect(participants[0].isGuest).toBe(true)
        expect(participants[0].status).toBe('pending')
    })

    it('spread les invitations sur les slots de la durée', () => {
        const helpers = renderSlotHelpers({
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u2',
                    name: 'Bob',
                    status: 'accepted',
                    invitedBy: 'u1',
                    duration: 2,
                },
            ],
        })
        expect(helpers.getParticipants('10:00')).toHaveLength(1)
        expect(helpers.getParticipants('10:30')).toHaveLength(1)
        expect(helpers.getParticipants('11:00')).toHaveLength(0)
    })

    it('retourne un tableau vide pour un slot sans participants', () => {
        const helpers = renderSlotHelpers()
        expect(helpers.getParticipants('10:00')).toEqual([])
    })
})

// ==================== getAcceptedParticipantCount ====================

describe('getAcceptedParticipantCount', () => {
    it('compte seulement les participants avec status accepted', () => {
        const helpers = renderSlotHelpers({
            events: [
                { slotId: '10:00', date: DATE_STR, userId: 'u1', userName: 'Alice', duration: 1 },
            ],
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u2',
                    name: 'Bob',
                    status: 'accepted',
                    invitedBy: 'u1',
                    duration: 1,
                },
                {
                    slotId: '10:00',
                    userId: 'u3',
                    name: 'Charlie',
                    status: 'pending',
                    invitedBy: 'u1',
                    duration: 1,
                },
            ],
        })
        // Events have status 'accepted', one invitation 'accepted', one 'pending'
        expect(helpers.getAcceptedParticipantCount('10:00')).toBe(2)
    })

    it('retourne 0 pour un slot vide', () => {
        const helpers = renderSlotHelpers()
        expect(helpers.getAcceptedParticipantCount('10:00')).toBe(0)
    })
})

// ==================== getParticipantColor ====================

describe('getParticipantColor', () => {
    it('retourne gris pour un invité pending', () => {
        const helpers = renderSlotHelpers()
        const participant = { isGuest: true, status: 'pending' }
        expect(helpers.getParticipantColor(participant, '10:00')).toBe('#9CA3AF')
    })

    it('retourne vert quand pas de surréservation', () => {
        const helpers = renderSlotHelpers({
            events: [
                { slotId: '10:00', date: DATE_STR, userId: 'u1', userName: 'Alice', duration: 1 },
            ],
            maxPersons: 16,
        })
        const participant = { isGuest: false, status: 'accepted' }
        expect(helpers.getParticipantColor(participant, '10:00')).toBe('#10B981')
    })

    it('retourne rouge quand surréservation', () => {
        // maxPersons=1 et 2 personnes inscrites → overbooked
        const helpers = renderSlotHelpers({
            events: [
                { slotId: '10:00', date: DATE_STR, userId: 'u1', userName: 'Alice', duration: 1 },
                { slotId: '10:00', date: DATE_STR, userId: 'u2', userName: 'Bob', duration: 1 },
            ],
            maxPersons: 1,
        })
        const participant = { isGuest: false, status: 'accepted' }
        expect(helpers.getParticipantColor(participant, '10:00')).toBe('#EF4444')
    })
})

// ==================== isUserParticipating / isUserOnSlot ====================

describe('isUserParticipating', () => {
    it("retourne true si l'utilisateur est inscrit", () => {
        const helpers = renderSlotHelpers({
            events: [
                { slotId: '10:00', date: DATE_STR, userId: 'u1', userName: 'Alice', duration: 1 },
            ],
        })
        expect(helpers.isUserParticipating('10:00')).toBe(true)
    })

    it("retourne true si l'utilisateur a une invitation acceptée", () => {
        const helpers = renderSlotHelpers({
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u1',
                    name: 'Alice',
                    status: 'accepted',
                    invitedBy: 'u2',
                    duration: 1,
                },
            ],
        })
        expect(helpers.isUserParticipating('10:00')).toBe(true)
    })

    it("retourne false si l'utilisateur a une invitation pending", () => {
        const helpers = renderSlotHelpers({
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u1',
                    name: 'Alice',
                    status: 'pending',
                    invitedBy: 'u2',
                    duration: 1,
                },
            ],
        })
        expect(helpers.isUserParticipating('10:00')).toBe(false)
    })

    it("retourne false si l'utilisateur n'est pas sur le slot", () => {
        const helpers = renderSlotHelpers()
        expect(helpers.isUserParticipating('10:00')).toBe(false)
    })
})

describe('isUserOnSlot', () => {
    it('retourne true même pour une invitation pending', () => {
        const helpers = renderSlotHelpers({
            invitations: [
                {
                    slotId: '10:00',
                    userId: 'u1',
                    name: 'Alice',
                    status: 'pending',
                    invitedBy: 'u2',
                    duration: 1,
                },
            ],
        })
        expect(helpers.isUserOnSlot('10:00')).toBe(true)
    })
})

// ==================== isSlotAvailable ====================

describe('isSlotAvailable', () => {
    it('retourne indisponible si le slot est bloqué (isBlocking=true)', () => {
        const helpers = renderSlotHelpers({
            weekSlots: [
                {
                    date: DATE_STR,
                    startTime: '10:00',
                    endTime: '11:00',
                    isBlocking: true,
                    name: 'Entraînement',
                },
            ],
        })
        const result = helpers.isSlotAvailable('10:00')
        expect(result.available).toBe(false)
        expect(result.type).toBe('training')
    })

    it('retourne disponible si le slot est un cours (isBlocking=false)', () => {
        const helpers = renderSlotHelpers({
            weekSlots: [
                {
                    date: DATE_STR,
                    startTime: '10:00',
                    endTime: '11:00',
                    isBlocking: false,
                    name: 'Cours',
                },
            ],
        })
        const result = helpers.isSlotAvailable('10:00')
        expect(result.available).toBe(true)
        expect(result.type).toBe('course')
    })

    it('retourne disponible si le slot est ouvert manuellement', () => {
        const helpers = renderSlotHelpers({
            openedSlots: [
                { id: 'os1', date: DATE_STR, slotId: '10:00', openedBy: 'u1', target: 'all' },
            ],
        })
        const result = helpers.isSlotAvailable('10:00')
        expect(result.available).toBe(true)
        expect(result.type).toBe('opened')
        expect(result.target).toBe('all')
    })

    it('retourne fermé si aucune config', () => {
        const helpers = renderSlotHelpers()
        const result = helpers.isSlotAvailable('10:00')
        expect(result.available).toBe(false)
        expect(result.type).toBe('closed')
    })
})

// ==================== canUserRegister ====================

describe('canUserRegister', () => {
    it('autorise un utilisateur loisir sur un slot target=all', () => {
        const helpers = renderSlotHelpers({
            isWeekConfigured: true,
            openedSlots: [
                { id: 'os1', date: DATE_STR, slotId: '10:00', openedBy: 'admin', target: 'all' },
            ],
            user: { id: 'u1', licenseType: 'L' },
        })
        expect(helpers.canUserRegister('10:00')).toBe(true)
    })

    it('autorise un utilisateur loisir sur un slot target=loisir', () => {
        const helpers = renderSlotHelpers({
            isWeekConfigured: true,
            openedSlots: [
                { id: 'os1', date: DATE_STR, slotId: '10:00', openedBy: 'admin', target: 'loisir' },
            ],
            user: { id: 'u1', licenseType: 'L' },
        })
        expect(helpers.canUserRegister('10:00')).toBe(true)
    })

    it('refuse un utilisateur loisir sur un slot target=competition', () => {
        const helpers = renderSlotHelpers({
            isWeekConfigured: true,
            openedSlots: [
                {
                    id: 'os1',
                    date: DATE_STR,
                    slotId: '10:00',
                    openedBy: 'admin',
                    target: 'competition',
                },
            ],
            user: { id: 'u1', licenseType: 'L' },
        })
        expect(helpers.canUserRegister('10:00')).toBe(false)
    })

    it('autorise un utilisateur compétition sur target=competition', () => {
        const helpers = renderSlotHelpers({
            isWeekConfigured: true,
            openedSlots: [
                {
                    id: 'os1',
                    date: DATE_STR,
                    slotId: '10:00',
                    openedBy: 'admin',
                    target: 'competition',
                },
            ],
            user: { id: 'u1', licenseType: 'C' },
        })
        expect(helpers.canUserRegister('10:00')).toBe(true)
    })

    it("refuse si le slot n'est pas disponible", () => {
        const helpers = renderSlotHelpers()
        expect(helpers.canUserRegister('10:00')).toBe(false)
    })
})

// ==================== getAvailableDurations ====================

describe('getAvailableDurations', () => {
    it('retourne toutes les durées pour un slot ouvert sans blocage', () => {
        // Open all slots from 10:00 to 14:00
        const openedSlots = []
        for (let h = 10; h < 14; h++) {
            openedSlots.push({
                id: `os-${h}`,
                date: DATE_STR,
                slotId: `${h}:00`,
                openedBy: 'admin',
                target: 'all',
            })
            openedSlots.push({
                id: `os-${h}b`,
                date: DATE_STR,
                slotId: `${h}:30`,
                openedBy: 'admin',
                target: 'all',
            })
        }
        const helpers = renderSlotHelpers({ openedSlots })
        const durations = helpers.getAvailableDurations('10:00')
        expect(durations.length).toBeGreaterThan(0)
        expect(durations[0].slots).toBe(1) // 30 min
    })

    it('limite les durées quand un slot bloqué suit', () => {
        const helpers = renderSlotHelpers({
            openedSlots: [
                { id: 'os1', date: DATE_STR, slotId: '10:00', openedBy: 'admin', target: 'all' },
                { id: 'os2', date: DATE_STR, slotId: '10:30', openedBy: 'admin', target: 'all' },
            ],
            weekSlots: [
                {
                    date: DATE_STR,
                    startTime: '11:00',
                    endTime: '12:00',
                    isBlocking: true,
                    name: 'Block',
                },
            ],
        })
        const durations = helpers.getAvailableDurations('10:00')
        // Max 2 slots (30min each = 1h) before hitting the blocked slot
        expect(durations.every((d) => d.slots <= 2)).toBe(true)
    })

    it('retourne un tableau vide pour un slot inconnu', () => {
        const helpers = renderSlotHelpers()
        expect(helpers.getAvailableDurations('99:99')).toEqual([])
    })
})

// ==================== getEndTime ====================

describe('getEndTime', () => {
    it("calcule l'heure de fin correctement", () => {
        const helpers = renderSlotHelpers()
        // 10:00 + 2 slots (1h) → 11:00
        expect(helpers.getEndTime('10:00', 2)).toBe('11:00')
    })

    it('retourne 22:00 si le slot dépasse la grille', () => {
        const helpers = renderSlotHelpers()
        const lastSlot = TIME_SLOTS[TIME_SLOTS.length - 1]
        expect(helpers.getEndTime(lastSlot.id, 2)).toBe('22:00')
    })
})
