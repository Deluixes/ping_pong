import { useMemo, useCallback } from 'react'
import { format, isSameWeek, startOfDay } from 'date-fns'
import { DEFAULT_OPENING_TIME, DEFAULT_CLOSING_TIME } from '../constants'
import { TIME_SLOTS, SLOT_INDEX_MAP, DURATION_OPTIONS } from '../components/calendar/calendarUtils'

export function useSlotHelpers({
    events,
    selectedDate,
    weekSlots,
    weekHours,
    isWeekConfigured,
    openedSlots,
    invitations,
    maxPersons,
    user,
}) {
    const getSlotIndex = useCallback((slotId) => SLOT_INDEX_MAP.get(slotId) ?? -1, [])

    // Compute dateStr once
    const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])

    // Pre-compute events for current date (single pass)
    const dayEvents = useMemo(() => events.filter((e) => e.date === dateStr), [events, dateStr])

    // Pre-compute events grouped by slotId (single pass, O(1) lookup per slot)
    const eventsBySlot = useMemo(() => {
        const map = new Map()
        for (const e of dayEvents) {
            if (!map.has(e.slotId)) map.set(e.slotId, [])
            map.get(e.slotId).push(e)
        }
        return map
    }, [dayEvents])

    // Pre-compute opened slots lookup for current date (O(1) per slot)
    const openedSlotsBySlotId = useMemo(() => {
        const map = new Map()
        for (const os of openedSlots) {
            if (os.date === dateStr) map.set(os.slotId, os)
        }
        return map
    }, [openedSlots, dateStr])

    // Pre-compute blocked slot info for current date (O(1) per slot)
    const blockedSlotsBySlotId = useMemo(() => {
        const map = new Map()
        const daySlots = weekSlots.filter((slot) => slot.date === dateStr)
        for (const slot of TIME_SLOTS) {
            const [hour, minute] = slot.id.split(':').map(Number)
            const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            const blocked = daySlots.find((ws) => {
                const startTime = ws.startTime.slice(0, 5)
                const endTime = ws.endTime.slice(0, 5)
                return slotTime >= startTime && slotTime < endTime
            })
            if (blocked) map.set(slot.id, blocked)
        }
        return map
    }, [weekSlots, dateStr])

    // Pre-compute opening hours for current date
    const dayOpeningHours = useMemo(
        () => weekHours.filter((h) => h.date === dateStr),
        [weekHours, dateStr]
    )

    // Pre-compute participants for ALL slots in a single pass
    const participantsBySlot = useMemo(() => {
        const map = new Map()

        // Add registered users from events
        for (const e of dayEvents) {
            if (!map.has(e.slotId)) map.set(e.slotId, [])
            map.get(e.slotId).push({
                id: e.userId,
                name: e.userName || 'Inconnu',
                isGuest: false,
                status: 'accepted',
                duration: e.duration,
            })
        }

        // Add invitations for current date (spread across duration slots)
        for (const inv of invitations) {
            if (inv.date !== dateStr) continue
            const invSlotIndex = SLOT_INDEX_MAP.get(inv.slotId) ?? -1
            if (invSlotIndex === -1) continue
            const invDuration = inv.duration || 1
            const participant = {
                id: inv.userId,
                name: inv.name,
                isGuest: true,
                status: inv.status,
                invitedBy: inv.invitedBy,
                duration: invDuration,
            }
            for (let i = 0; i < invDuration; i++) {
                const slot = TIME_SLOTS[invSlotIndex + i]
                if (!slot) break
                if (!map.has(slot.id)) map.set(slot.id, [])
                map.get(slot.id).push(participant)
            }
        }

        return map
    }, [dayEvents, invitations, dateStr])

    // Pre-compute accepted counts and user participation for ALL slots
    const slotStats = useMemo(() => {
        const acceptedCounts = new Map()
        const userParticipating = new Map()
        const userOnSlot = new Map()

        for (const [slotId, participants] of participantsBySlot) {
            let acceptedCount = 0
            let isParticipating = false
            let isOnSlot = false

            for (const p of participants) {
                if (p.status === 'accepted') acceptedCount++
                if (p.id === user?.id) {
                    isOnSlot = true
                    if (p.status === 'accepted' || !p.isGuest) {
                        isParticipating = true
                    }
                }
            }

            acceptedCounts.set(slotId, acceptedCount)
            userParticipating.set(slotId, isParticipating)
            userOnSlot.set(slotId, isOnSlot)
        }

        return { acceptedCounts, userParticipating, userOnSlot }
    }, [participantsBySlot, user?.id])

    const getSlotEvents = useCallback((slotId) => eventsBySlot.get(slotId) || [], [eventsBySlot])

    const getParticipants = useCallback(
        (slotId) => participantsBySlot.get(slotId) || [],
        [participantsBySlot]
    )

    const getAcceptedParticipantCount = useCallback(
        (slotId) => slotStats.acceptedCounts.get(slotId) || 0,
        [slotStats]
    )

    const getParticipantColor = useCallback(
        (participant, slotId) => {
            const acceptedCount = slotStats.acceptedCounts.get(slotId) || 0
            const isSlotOverbooked = acceptedCount > maxPersons
            if (participant.isGuest && participant.status === 'pending') {
                return '#9CA3AF'
            }
            return isSlotOverbooked ? '#EF4444' : '#10B981'
        },
        [slotStats, maxPersons]
    )

    const isUserParticipating = useCallback(
        (slotId) => slotStats.userParticipating.get(slotId) || false,
        [slotStats]
    )

    const isUserOnSlot = useCallback(
        (slotId) => slotStats.userOnSlot.get(slotId) || false,
        [slotStats]
    )

    const getUserRegistration = useCallback(
        (slotId) => {
            const slotEvents = eventsBySlot.get(slotId)
            if (!slotEvents) return undefined
            return slotEvents.find((e) => e.userId === user?.id)
        },
        [eventsBySlot, user?.id]
    )

    const getUserInvitation = useCallback(
        (slotId) => {
            const participants = participantsBySlot.get(slotId)
            if (!participants) return undefined
            return participants.find((p) => p.id === user?.id && p.isGuest)
        },
        [participantsBySlot, user?.id]
    )

    const findInvitationStartSlot = useCallback(
        (slotId) => {
            const inv = getUserInvitation(slotId)
            if (!inv) return null
            const duration = inv.duration || 1
            const clickedIndex = getSlotIndex(slotId)
            // Remonter tant que le slot précédent a la même invitation (même objet spread)
            let startIndex = clickedIndex
            for (let i = 1; i < duration; i++) {
                const prevIndex = clickedIndex - i
                if (prevIndex < 0) break
                const prevInv = getUserInvitation(TIME_SLOTS[prevIndex].id)
                if (!prevInv) break
                startIndex = prevIndex
            }
            return { startSlotId: TIME_SLOTS[startIndex].id, startIndex, duration }
        },
        [getUserInvitation, getSlotIndex]
    )

    const getBlockedSlotInfo = useCallback(
        (slotId) => blockedSlotsBySlotId.get(slotId),
        [blockedSlotsBySlotId]
    )

    const isSlotInOpeningHours = useCallback(
        (slotId) => {
            const [hour, minute] = slotId.split(':').map(Number)
            const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            if (!isWeekConfigured || dayOpeningHours.length === 0) {
                return slotTime >= DEFAULT_OPENING_TIME && slotTime < DEFAULT_CLOSING_TIME
            }
            return dayOpeningHours.some((h) => {
                const startTime = h.startTime.slice(0, 5)
                const endTime = h.endTime.slice(0, 5)
                return slotTime >= startTime && slotTime < endTime
            })
        },
        [isWeekConfigured, dayOpeningHours]
    )

    const getOpenedSlotInfo = useCallback(
        (slotId) => openedSlotsBySlotId.get(slotId),
        [openedSlotsBySlotId]
    )

    const isSlotAvailable = useCallback(
        (slotId) => {
            const blockedInfo = blockedSlotsBySlotId.get(slotId)
            if (blockedInfo && blockedInfo.isBlocking === false) {
                return { available: true, type: 'course', target: 'all', blockedInfo }
            }
            if (blockedInfo && blockedInfo.isBlocking === true) {
                return { available: false, type: 'training', reason: 'blocked', blockedInfo }
            }
            const openedInfo = openedSlotsBySlotId.get(slotId)
            if (openedInfo) {
                return { available: true, type: 'opened', target: openedInfo.target, openedInfo }
            }
            return { available: false, type: 'closed', reason: 'not_opened' }
        },
        [blockedSlotsBySlotId, openedSlotsBySlotId]
    )

    const isCurrentWeek = useCallback(() => {
        const today = startOfDay(new Date())
        return isSameWeek(selectedDate, today, { weekStartsOn: 1 })
    }, [selectedDate])

    const canReserveOnWeek = useCallback(() => {
        if (isWeekConfigured) return true
        return isCurrentWeek()
    }, [isWeekConfigured, isCurrentWeek])

    const canUserRegister = useCallback(
        (slotId) => {
            if (!canReserveOnWeek()) return false
            const { available, target } = isSlotAvailable(slotId)
            if (!available) return false
            if (target === 'all') return true
            if (target === 'loisir' && user?.licenseType === 'L') return true
            if (target === 'competition' && user?.licenseType === 'C') return true
            return false
        },
        [canReserveOnWeek, isSlotAvailable, user?.licenseType]
    )

    const getAvailableDurations = useCallback(
        (startSlotId, { adminOpen = false } = {}) => {
            const startIndex = SLOT_INDEX_MAP.get(startSlotId) ?? -1
            if (startIndex === -1) return []

            const available = []
            const startAvailability = adminOpen ? null : isSlotAvailable(startSlotId)

            for (const duration of DURATION_OPTIONS) {
                if (startIndex + duration.slots > TIME_SLOTS.length) break

                let isValidDuration = true
                for (let i = 0; i < duration.slots; i++) {
                    const slot = TIME_SLOTS[startIndex + i]
                    const blockedInfo = blockedSlotsBySlotId.get(slot.id)
                    if (blockedInfo && blockedInfo.isBlocking !== false) {
                        isValidDuration = false
                        break
                    }
                    if (!adminOpen && i > 0) {
                        const slotAvailability = isSlotAvailable(slot.id)
                        if (!slotAvailability.available) {
                            isValidDuration = false
                            break
                        }
                        if (
                            startAvailability.type === 'opened' &&
                            slotAvailability.type === 'opened' &&
                            slotAvailability.target !== 'all' &&
                            slotAvailability.target !== startAvailability.target
                        ) {
                            isValidDuration = false
                            break
                        }
                    }
                }

                if (isValidDuration) available.push(duration)
            }

            return available
        },
        [isSlotAvailable, blockedSlotsBySlotId]
    )

    const getDayParticipantCount = useCallback(
        (day) => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayEvts = events.filter((e) => e.date === dayStr)
            return new Set(dayEvts.map((e) => e.userId)).size
        },
        [events]
    )

    const getEndTime = useCallback((startSlotId, durationSlots) => {
        const startIndex = SLOT_INDEX_MAP.get(startSlotId) ?? -1
        const endSlot = TIME_SLOTS[startIndex + durationSlots]
        if (endSlot) return endSlot.label
        return '22:00'
    }, [])

    const getAvailableOpenDurations = useCallback(
        (startSlotId) => getAvailableDurations(startSlotId, { adminOpen: true }),
        [getAvailableDurations]
    )

    return {
        getSlotIndex,
        getSlotEvents,
        getParticipants,
        getAcceptedParticipantCount,
        getParticipantColor,
        isUserParticipating,
        isUserOnSlot,
        getUserRegistration,
        getUserInvitation,
        findInvitationStartSlot,
        getAvailableDurations,
        getDayParticipantCount,
        isCurrentWeek,
        canReserveOnWeek,
        getBlockedSlotInfo,
        isSlotInOpeningHours,
        getOpenedSlotInfo,
        isSlotAvailable,
        canUserRegister,
        getAvailableOpenDurations,
        getEndTime,
    }
}
