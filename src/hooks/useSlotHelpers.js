import { format, isSameWeek, startOfDay } from 'date-fns'
import { DEFAULT_OPENING_TIME, DEFAULT_CLOSING_TIME } from '../constants'
import { TIME_SLOTS, DURATION_OPTIONS } from '../components/calendar/calendarUtils'

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
    const getSlotIndex = (slotId) => TIME_SLOTS.findIndex((s) => s.id === slotId)

    const getSlotEvents = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.filter((e) => e.date === dateStr && e.slotId === slotId)
    }

    const getParticipants = (slotId) => {
        const slotEvents = getSlotEvents(slotId)
        const participants = []
        const currentSlotIndex = getSlotIndex(slotId)

        slotEvents.forEach((e) => {
            participants.push({
                id: e.userId,
                name: e.userName || 'Inconnu',
                isGuest: false,
                status: 'accepted',
                duration: e.duration,
            })
        })

        invitations.forEach((inv) => {
            const invSlotIndex = getSlotIndex(inv.slotId)
            const invDuration = inv.duration || 1
            if (currentSlotIndex >= invSlotIndex && currentSlotIndex < invSlotIndex + invDuration) {
                participants.push({
                    id: inv.odId,
                    name: inv.name,
                    isGuest: true,
                    status: inv.status,
                    invitedBy: inv.invitedBy,
                    duration: invDuration,
                })
            }
        })

        return participants
    }

    const getAcceptedParticipantCount = (slotId) => {
        return getParticipants(slotId).filter((p) => p.status === 'accepted').length
    }

    const getParticipantColor = (participant, slotId) => {
        const acceptedCount = getAcceptedParticipantCount(slotId)
        const isSlotOverbooked = acceptedCount > maxPersons
        if (participant.isGuest && participant.status === 'pending') {
            return '#9CA3AF'
        }
        return isSlotOverbooked ? '#EF4444' : '#10B981'
    }

    const isUserParticipating = (slotId) => {
        const participants = getParticipants(slotId)
        return participants.some((p) => p.id === user.id && (p.status === 'accepted' || !p.isGuest))
    }

    const isUserOnSlot = (slotId) => {
        const participants = getParticipants(slotId)
        return participants.some((p) => p.id === user.id)
    }

    const getUserRegistration = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.find((e) => e.date === dateStr && e.slotId === slotId && e.userId === user.id)
    }

    const getBlockedSlotInfo = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const [hour, minute] = slotId.split(':').map(Number)
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        return weekSlots.find((slot) => {
            if (slot.date !== dateStr) return false
            const startTime = slot.startTime.slice(0, 5)
            const endTime = slot.endTime.slice(0, 5)
            return slotTime >= startTime && slotTime < endTime
        })
    }

    const isSlotInOpeningHours = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const [hour, minute] = slotId.split(':').map(Number)
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const dayHours = weekHours.filter((h) => h.date === dateStr)
        if (!isWeekConfigured || dayHours.length === 0) {
            return slotTime >= DEFAULT_OPENING_TIME && slotTime < DEFAULT_CLOSING_TIME
        }
        return dayHours.some((h) => {
            const startTime = h.startTime.slice(0, 5)
            const endTime = h.endTime.slice(0, 5)
            return slotTime >= startTime && slotTime < endTime
        })
    }

    const getOpenedSlotInfo = (slotId) => {
        return openedSlots.find((os) => os.slotId === slotId)
    }

    const isSlotAvailable = (slotId) => {
        const blockedInfo = getBlockedSlotInfo(slotId)
        if (blockedInfo && blockedInfo.isBlocking === false) {
            return { available: true, type: 'course', target: 'all', blockedInfo }
        }
        if (blockedInfo && blockedInfo.isBlocking === true) {
            return { available: false, type: 'training', reason: 'blocked', blockedInfo }
        }
        const openedInfo = getOpenedSlotInfo(slotId)
        if (openedInfo) {
            return { available: true, type: 'opened', target: openedInfo.target, openedInfo }
        }
        return { available: false, type: 'closed', reason: 'not_opened' }
    }

    const isCurrentWeek = () => {
        const today = startOfDay(new Date())
        return isSameWeek(selectedDate, today, { weekStartsOn: 1 })
    }

    const canReserveOnWeek = () => {
        if (isWeekConfigured) return true
        return isCurrentWeek()
    }

    const canUserRegister = (slotId) => {
        if (!canReserveOnWeek()) return false
        const { available, target } = isSlotAvailable(slotId)
        if (!available) return false
        if (target === 'all') return true
        if (target === 'loisir' && user?.licenseType === 'L') return true
        if (target === 'competition' && user?.licenseType === 'C') return true
        return false
    }

    const getAvailableDurations = (startSlotId) => {
        const startIndex = getSlotIndex(startSlotId)
        if (startIndex === -1) return []

        const available = []
        const startAvailability = isSlotAvailable(startSlotId)

        for (const duration of DURATION_OPTIONS) {
            if (startIndex + duration.slots > TIME_SLOTS.length) break

            let isValidDuration = true
            for (let i = 0; i < duration.slots; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                const blockedInfo = getBlockedSlotInfo(slot.id)
                if (blockedInfo && blockedInfo.isBlocking !== false) {
                    isValidDuration = false
                    break
                }
                if (startAvailability.type === 'opened' && i > 0) {
                    const slotAvailability = isSlotAvailable(slot.id)
                    if (!slotAvailability.available) {
                        isValidDuration = false
                        break
                    }
                    if (
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
    }

    const getAvailableOpenDurations = (startSlotId) => {
        const startIndex = getSlotIndex(startSlotId)
        if (startIndex === -1) return []

        const available = []
        for (const duration of DURATION_OPTIONS) {
            if (startIndex + duration.slots > TIME_SLOTS.length) break
            let isValidDuration = true
            for (let i = 0; i < duration.slots; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                const blockedInfo = getBlockedSlotInfo(slot.id)
                if (blockedInfo && blockedInfo.isBlocking !== false) {
                    isValidDuration = false
                    break
                }
            }
            if (isValidDuration) available.push(duration)
        }
        return available
    }

    const getDayParticipantCount = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter((e) => e.date === dateStr)
        return new Set(dayEvents.map((e) => e.userId)).size
    }

    const getEndTime = (startSlotId, durationSlots) => {
        const startIndex = getSlotIndex(startSlotId)
        const endSlot = TIME_SLOTS[startIndex + durationSlots]
        if (endSlot) return endSlot.label
        return '22:00'
    }

    return {
        getSlotIndex,
        getSlotEvents,
        getParticipants,
        getAcceptedParticipantCount,
        getParticipantColor,
        isUserParticipating,
        isUserOnSlot,
        getUserRegistration,
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
