import { useState, useEffect, useCallback, useRef } from 'react'
import { format, addDays } from 'date-fns'
import { storageService } from '../services/storage'
import { DEFAULT_TOTAL_TABLES } from '../constants'
import { getCachedEvents, setCachedEvents } from '../components/calendar/calendarUtils'

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

    // Refs
    const subscriptionRef = useRef(null)
    const invitationsSubscriptionRef = useRef(null)
    const openedSlotsSubscriptionRef = useRef(null)
    const userIdRef = useRef(user?.id)
    const isMountedRef = useRef(true)

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    // ==================== DATA LOADING ====================

    const loadData = useCallback(async () => {
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
            if (!isMountedRef.current) return
            if (tablesSettings) setTotalTables(parseInt(tablesSettings))
            setEvents(loadedEvents)
            setCachedEvents(loadedEvents)
            setApprovedMembers(members.approved.filter((m) => m.userId !== currentUserId))
            setLoading(false)
        } catch (error) {
            console.error('Error loading data:', error)
            if (isMountedRef.current) setLoading(false)
        }
    }, [user, weekStart])

    const loadWeekConfig = useCallback(async () => {
        const weekStartStr = format(weekStart, 'yyyy-MM-dd')
        try {
            const config = await storageService.getWeekConfig(weekStartStr)
            if (!isMountedRef.current) return
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
    }, [weekStart])

    const loadInvitations = useCallback(async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const loadedInvitations = await storageService.getAllInvitationsForDate(dateStr)
        if (isMountedRef.current) {
            setInvitations(loadedInvitations)
        }
    }, [selectedDate])

    const loadOpenedSlots = useCallback(async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const slots = await storageService.getOpenedSlotsForDate(dateStr)
        if (isMountedRef.current) {
            setOpenedSlots(slots)
        }
    }, [selectedDate])

    // ==================== EFFECTS ====================

    useEffect(() => {
        loadInvitations()
    }, [loadInvitations])

    useEffect(() => {
        loadOpenedSlots()
    }, [loadOpenedSlots])

    useEffect(() => {
        loadWeekConfig()
    }, [loadWeekConfig])

    useEffect(() => {
        userIdRef.current = user?.id
        if (user?.id) {
            loadData()
        }
    }, [user?.id, loadData])

    useEffect(() => {
        subscriptionRef.current = storageService.subscribeToReservations(() => {
            loadData()
        })
        invitationsSubscriptionRef.current = storageService.subscribeToInvitations(() => {
            loadInvitations()
        })
        openedSlotsSubscriptionRef.current = storageService.subscribeToOpenedSlots(() => {
            loadOpenedSlots()
        })
        return () => {
            if (subscriptionRef.current) {
                storageService.unsubscribe(subscriptionRef.current)
                subscriptionRef.current = null
            }
            if (invitationsSubscriptionRef.current) {
                storageService.unsubscribe(invitationsSubscriptionRef.current)
                invitationsSubscriptionRef.current = null
            }
            if (openedSlotsSubscriptionRef.current) {
                storageService.unsubscribe(openedSlotsSubscriptionRef.current)
                openedSlotsSubscriptionRef.current = null
            }
        }
    }, [loadData, loadInvitations, loadOpenedSlots])

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
