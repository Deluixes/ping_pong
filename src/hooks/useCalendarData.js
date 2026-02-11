import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { storageService } from '../services/storage'
import { DEFAULT_TOTAL_TABLES } from '../constants'
import { getCachedEvents, setCachedEvents } from '../components/calendar/calendarUtils'

// ==================== OPTIMISTIC UPDATE HELPERS ====================

export function mapReservationRow(r) {
    return {
        slotId: r.slot_id,
        date: r.date,
        userId: r.user_id,
        userName: r.user_name,
        duration: r.duration,
        overbooked: r.overbooked || false,
    }
}

export function applyReservationPayload(payload, setEvents, weekRange) {
    const { eventType, new: newRow, old: oldRow } = payload
    const row = newRow || oldRow
    if (!row?.date || row.date < weekRange.start || row.date > weekRange.end) return false

    if (eventType === 'INSERT' && newRow) {
        setEvents((prev) => {
            const updated = [...prev, mapReservationRow(newRow)]
            setCachedEvents(updated)
            return updated
        })
        return true
    }
    if (eventType === 'DELETE' && oldRow) {
        setEvents((prev) => {
            const updated = prev.filter(
                (e) =>
                    !(
                        e.slotId === oldRow.slot_id &&
                        e.date === oldRow.date &&
                        e.userId === oldRow.user_id
                    )
            )
            setCachedEvents(updated)
            return updated
        })
        return true
    }
    if (eventType === 'UPDATE' && newRow && oldRow) {
        setEvents((prev) => {
            const updated = prev.map((e) =>
                e.slotId === oldRow.slot_id && e.date === oldRow.date && e.userId === oldRow.user_id
                    ? mapReservationRow(newRow)
                    : e
            )
            setCachedEvents(updated)
            return updated
        })
        return true
    }
    return false
}

export function mapInvitationRow(r) {
    return {
        slotId: r.slot_id,
        userId: r.user_id,
        name: r.user_name,
        status: r.status,
        invitedBy: r.invited_by,
        duration: r.duration || 1,
    }
}

export function applyInvitationPayload(payload, setInvitations, dateStr) {
    const { eventType, new: newRow, old: oldRow } = payload
    const row = newRow || oldRow
    if (!row?.date || row.date !== dateStr) return false

    if (eventType === 'INSERT' && newRow) {
        setInvitations((prev) => [...prev, mapInvitationRow(newRow)])
        return true
    }
    if (eventType === 'DELETE' && oldRow) {
        setInvitations((prev) =>
            prev.filter((i) => !(i.slotId === oldRow.slot_id && i.userId === oldRow.user_id))
        )
        return true
    }
    if (eventType === 'UPDATE' && newRow && oldRow) {
        setInvitations((prev) =>
            prev.map((i) =>
                i.slotId === oldRow.slot_id && i.userId === oldRow.user_id
                    ? mapInvitationRow(newRow)
                    : i
            )
        )
        return true
    }
    return false
}

export function mapOpenedSlotRow(r) {
    return {
        id: r.id,
        date: r.date,
        slotId: r.slot_id,
        openedBy: r.opened_by,
        target: r.target,
        createdAt: r.created_at,
    }
}

export function applyOpenedSlotPayload(payload, setOpenedSlots, dateStr) {
    const { eventType, new: newRow, old: oldRow } = payload
    const row = newRow || oldRow
    if (!row?.date || row.date !== dateStr) return false

    if (eventType === 'INSERT' && newRow) {
        setOpenedSlots((prev) => [...prev, mapOpenedSlotRow(newRow)])
        return true
    }
    if (eventType === 'DELETE' && oldRow) {
        setOpenedSlots((prev) =>
            prev.filter((s) => !(s.slotId === oldRow.slot_id && s.date === oldRow.date))
        )
        return true
    }
    if (eventType === 'UPDATE' && newRow && oldRow) {
        setOpenedSlots((prev) =>
            prev.map((s) =>
                s.slotId === oldRow.slot_id && s.date === oldRow.date ? mapOpenedSlotRow(newRow) : s
            )
        )
        return true
    }
    return false
}

// ==================== HOOK ====================

export function useCalendarData(user, selectedDate, weekStart) {
    const [events, setEvents] = useState(getCachedEvents)
    const [loading, setLoading] = useState(() => getCachedEvents().length === 0)
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const [approvedMembers, setApprovedMembers] = useState([])
    const [invitations, setInvitations] = useState([])
    const [weekConfig, setWeekConfig] = useState(null)
    const [weekSlots, setWeekSlots] = useState([])
    const [weekHours, setWeekHours] = useState([])
    const [isWeekConfigured, setIsWeekConfigured] = useState(false)
    const [openedSlots, setOpenedSlots] = useState([])

    const maxPersons = totalTables * 2

    const userIdRef = useRef(user?.id)

    // ==================== DATA LOADING ====================

    const loadData = useCallback(
        async (signal) => {
            const currentUserId = userIdRef.current
            if (!currentUserId) {
                setLoading(false)
                return
            }
            try {
                const weekStartStr = format(weekStart, 'yyyy-MM-dd')
                const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')
                const [tablesSettings, loadedEvents, members] = await Promise.all([
                    storageService.getSetting('total_tables'),
                    storageService.getEvents(weekStartStr, weekEndStr),
                    storageService.getMembers(user?.role === 'super_admin'),
                ])
                if (signal?.aborted) return
                if (tablesSettings) setTotalTables(parseInt(tablesSettings))
                setEvents(loadedEvents)
                setCachedEvents(loadedEvents)
                setApprovedMembers(members.approved.filter((m) => m.userId !== currentUserId))
                setLoading(false)
            } catch (error) {
                console.error('Error loading data:', error)
                if (!signal?.aborted) setLoading(false)
            }
        },
        [user, weekStart]
    )

    const loadWeekConfig = useCallback(
        async (signal) => {
            const weekStartStr = format(weekStart, 'yyyy-MM-dd')
            try {
                const config = await storageService.getWeekConfig(weekStartStr)
                if (signal?.aborted) return
                if (config) {
                    setWeekConfig(config)
                    setWeekSlots(config.slots || [])
                    setWeekHours(config.hours || [])
                    setIsWeekConfigured(true)
                } else {
                    setWeekConfig(null)
                    setWeekSlots([])
                    setWeekHours([])
                    setIsWeekConfigured(false)
                }
            } catch (error) {
                console.error('Error loading week config:', error)
                setWeekConfig(null)
                setWeekSlots([])
                setWeekHours([])
                setIsWeekConfigured(false)
            }
        },
        [weekStart]
    )

    const loadInvitations = useCallback(
        async (signal) => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const loadedInvitations = await storageService.getAllInvitationsForDate(dateStr)
            if (!signal?.aborted) {
                setInvitations(loadedInvitations)
            }
        },
        [selectedDate]
    )

    const loadOpenedSlots = useCallback(
        async (signal) => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const slots = await storageService.getOpenedSlotsForDate(dateStr)
            if (!signal?.aborted) {
                setOpenedSlots(slots)
            }
        },
        [selectedDate]
    )

    // ==================== EFFECTS ====================

    // Effect 1: user data + week config
    useEffect(() => {
        const controller = new AbortController()
        userIdRef.current = user?.id
        if (user?.id) loadData(controller.signal)
        loadWeekConfig(controller.signal)
        return () => controller.abort()
    }, [user?.id, loadData, loadWeekConfig])

    // Effect 2: date-dependent data
    useEffect(() => {
        const controller = new AbortController()
        loadInvitations(controller.signal)
        loadOpenedSlots(controller.signal)
        return () => controller.abort()
    }, [loadInvitations, loadOpenedSlots])

    // Effect 3: realtime subscriptions with optimistic updates
    useEffect(() => {
        const weekRange = {
            start: format(weekStart, 'yyyy-MM-dd'),
            end: format(addDays(weekStart, 6), 'yyyy-MM-dd'),
        }
        const dateStr = format(selectedDate, 'yyyy-MM-dd')

        const subs = [
            storageService.subscribeToReservations((payload) => {
                if (!applyReservationPayload(payload, setEvents, weekRange)) {
                    loadData()
                }
            }),
            storageService.subscribeToInvitations((payload) => {
                if (!applyInvitationPayload(payload, setInvitations, dateStr)) {
                    loadInvitations()
                }
            }),
            storageService.subscribeToOpenedSlots((payload) => {
                if (!applyOpenedSlotPayload(payload, setOpenedSlots, dateStr)) {
                    loadOpenedSlots()
                }
            }),
        ]
        return () => subs.forEach((sub) => storageService.unsubscribe(sub))
    }, [loadData, loadInvitations, loadOpenedSlots, weekStart, selectedDate])

    return {
        events,
        loading,
        weekConfig,
        weekSlots,
        weekHours,
        isWeekConfigured,
        openedSlots,
        invitations,
        approvedMembers,
        totalTables,
        maxPersons,
        loadData,
        loadInvitations,
        loadOpenedSlots,
        loadWeekConfig,
    }
}
