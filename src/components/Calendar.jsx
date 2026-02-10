import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { startOfWeek, addDays, format, isSameWeek, startOfDay } from 'date-fns'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'

import {
    TIME_SLOTS,
    DEFAULT_TOTAL_TABLES,
    DURATION_OPTIONS,
    getCachedEvents,
    setCachedEvents,
} from './calendar/calendarUtils'
import RegistrationModal from './calendar/RegistrationModal'
import OpenSlotModal from './calendar/OpenSlotModal'
import ActionChoiceModal from './calendar/ActionChoiceModal'
import ParticipantsModal from './calendar/ParticipantsModal'
import CalendarNavigation from './calendar/CalendarNavigation'
import WeekViewGrid from './calendar/WeekViewGrid'
import DayViewSlots from './calendar/DayViewSlots'

export default function Calendar() {
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedDate, setSelectedDate] = useState(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) {
            const parsed = new Date(dateParam)
            if (!isNaN(parsed.getTime())) {
                return parsed
            }
        }
        return new Date()
    })
    const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))
    const [events, setEvents] = useState(getCachedEvents)
    const [loading, setLoading] = useState(() => getCachedEvents().length === 0)

    // Mode de vue : all | occupied | week | manage_slots | edit
    const [viewMode, setViewMode] = useState('occupied')

    // Modal state - 3 steps (duration -> choice -> guests)
    const [modalStep, setModalStep] = useState(null)
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [guests, setGuests] = useState([{ odId: '', name: '' }])
    const [inviteOnlyMode, setInviteOnlyMode] = useState(false)

    // Modal choix d'action et liste joueurs
    const [showActionChoice, setShowActionChoice] = useState(false)
    const [showParticipantsList, setShowParticipantsList] = useState(false)
    const [participantsToShow, setParticipantsToShow] = useState([])

    // Settings
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const maxPersons = totalTables * 2

    // Admin check
    const isAdmin = user?.isAdmin

    // Approved members for guest selection
    const [approvedMembers, setApprovedMembers] = useState([])

    // Invitations pour la date sélectionnée
    const [invitations, setInvitations] = useState([])

    // Week configuration
    const [weekConfig, setWeekConfig] = useState(null)
    const [weekSlots, setWeekSlots] = useState([])
    const [weekHours, setWeekHours] = useState([])
    const [isWeekConfigured, setIsWeekConfigured] = useState(false)

    // Créneaux ouverts par admin_salles
    const [openedSlots, setOpenedSlots] = useState([])
    const [showOpenSlotModal, setShowOpenSlotModal] = useState(false)
    const [slotToOpen, setSlotToOpen] = useState(null)
    const [selectedTarget, setSelectedTarget] = useState('all')
    const [selectedOpenDuration, setSelectedOpenDuration] = useState(1)
    const openedSlotsSubscriptionRef = useRef(null)

    // Peut ouvrir/fermer des créneaux (admin ou admin_salles)
    const canManageSlots = user?.isAdminSalles

    // Options de vue selon le rôle
    const getViewOptions = () => {
        const options = [
            { value: 'occupied', label: 'Vue des créneaux ouverts' },
            { value: 'all', label: 'Vue de tous les créneaux' },
            { value: 'week', label: 'Vue semaine' },
        ]
        if (canManageSlots) {
            options.push({ value: 'manage_slots', label: 'Ouverture/Fermeture de créneaux' })
        }
        if (isAdmin && isWeekConfigured) {
            options.push({ value: 'edit', label: 'Modification depuis le planning' })
        }
        return options
    }

    // Refs
    const subscriptionRef = useRef(null)
    const invitationsSubscriptionRef = useRef(null)
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
            const tablesSettings = await storageService.getSetting('total_tables')
            if (!isMountedRef.current) return
            if (tablesSettings) setTotalTables(parseInt(tablesSettings))

            const loadedEvents = await storageService.getEvents()
            if (!isMountedRef.current) return
            setEvents(loadedEvents)
            setCachedEvents(loadedEvents)
            setLoading(false)

            const members = await storageService.getMembers(user?.role === 'super_admin')
            if (!isMountedRef.current) return
            setApprovedMembers(members.approved.filter((m) => m.userId !== currentUserId))
        } catch (error) {
            console.error('Error loading data:', error)
            if (isMountedRef.current) setLoading(false)
        }
    }, [user])

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
        const dateParam = searchParams.get('date')
        const slotParam = searchParams.get('slot')
        if (dateParam || slotParam) {
            setSearchParams({}, { replace: true })
        }
    }, [])

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

    // ==================== NAVIGATION ====================

    const nextWeek = () => {
        setWeekStart((d) => addDays(d, 7))
        setSelectedDate((d) => addDays(d, 7))
    }
    const prevWeek = () => {
        setWeekStart((d) => addDays(d, -7))
        setSelectedDate((d) => addDays(d, -7))
    }

    const weekDays = []
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i))
    }

    // ==================== SLOT HELPERS ====================

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

    const getDayParticipantCount = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter((e) => e.date === dateStr)
        return new Set(dayEvents.map((e) => e.userId)).size
    }

    const isCurrentWeek = () => {
        const today = startOfDay(new Date())
        return isSameWeek(selectedDate, today, { weekStartsOn: 1 })
    }

    const canReserveOnWeek = () => {
        if (isWeekConfigured) return true
        return isCurrentWeek()
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
            return slotTime >= '08:00' && slotTime < '23:00'
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

    const canUserRegister = (slotId) => {
        if (!canReserveOnWeek()) return false
        const { available, target } = isSlotAvailable(slotId)
        if (!available) return false
        if (target === 'all') return true
        if (target === 'loisir' && user?.licenseType === 'L') return true
        if (target === 'competition' && user?.licenseType === 'C') return true
        return false
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

    const getEndTime = (startSlotId, durationSlots) => {
        const startIndex = getSlotIndex(startSlotId)
        const endSlot = TIME_SLOTS[startIndex + durationSlots]
        if (endSlot) return endSlot.label
        return '22:00'
    }

    // ==================== HANDLERS ====================

    const handleOpenSlot = async () => {
        if (!slotToOpen || !canManageSlots) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(slotToOpen)
        for (let i = 0; i < selectedOpenDuration; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (slot) {
                await storageService.openSlot(dateStr, slot.id, user.id, selectedTarget)
            }
        }
        setShowOpenSlotModal(false)
        setSlotToOpen(null)
        setSelectedTarget('all')
        setSelectedOpenDuration(1)
        await loadOpenedSlots()
    }

    const handleCloseSlot = async (slotId) => {
        if (!canManageSlots) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const participants = getParticipants(slotId)
        if (participants.length > 0) {
            const confirmed = window.confirm(
                `${participants.length} personne(s) inscrite(s) sur ce créneau :\n` +
                    participants.map((p) => `- ${p.name}`).join('\n') +
                    `\n\nVoulez-vous vraiment fermer ce créneau ?\nLeurs réservations seront supprimées.`
            )
            if (!confirmed) return
            await storageService.deleteReservationsForSlot(dateStr, slotId)
            await loadData()
        }
        await storageService.closeSlot(dateStr, slotId)
        await loadOpenedSlots()
    }

    const handleSlotClick = (slotId) => {
        const userReg = getUserRegistration(slotId)
        const participants = getParticipants(slotId)

        if (userReg) {
            setSelectedSlotId(slotId)
            setSelectedDuration(
                DURATION_OPTIONS.find((d) => d.slots === userReg?.duration) || DURATION_OPTIONS[0]
            )
            if (participants.length > 0) {
                setShowActionChoice(true)
                return
            }
            setInviteOnlyMode(true)
            setGuests([{ odId: '', name: '' }])
            setModalStep('guests')
            return
        }
        if (isUserOnSlot(slotId)) {
            handleGuestUnregister(slotId)
            return
        }

        const availability = isSlotAvailable(slotId)
        if (!availability.available) {
            if (canManageSlots) {
                setSlotToOpen(slotId)
                setSelectedTarget('all')
                setShowOpenSlotModal(true)
            } else {
                alert("Ce créneau n'est pas ouvert aux réservations.")
            }
            return
        }

        if (!canUserRegister(slotId)) {
            const { target } = availability
            if (target === 'loisir') {
                alert('Ce créneau est réservé aux licences Loisir.')
            } else if (target === 'competition') {
                alert('Ce créneau est réservé aux licences Compétition.')
            } else if (!user?.licenseType) {
                alert("Votre type de licence n'est pas défini. Contactez un administrateur.")
            } else {
                alert('Vous ne pouvez pas vous inscrire à ce créneau.')
            }
            return
        }

        if (participants.length > 0) {
            setSelectedSlotId(slotId)
            handleShowParticipants(slotId)
            return
        }

        setSelectedSlotId(slotId)
        setSelectedDuration(null)
        setModalStep('duration')
    }

    const handleShowParticipants = async (slotId) => {
        const participants = getParticipants(slotId)
        const enrichedParticipants = await Promise.all(
            participants.map(async (p) => {
                const member = approvedMembers.find((m) => m.userId === p.id)
                return {
                    ...p,
                    profilePhotoUrl: p.id ? await storageService.getProfilePhotoUrl(p.id) : null,
                    licenseType: member?.licenseType || null,
                }
            })
        )
        setParticipantsToShow(enrichedParticipants)
        setShowParticipantsList(true)
        setShowActionChoice(false)
    }

    const handleOpenInviteModal = () => {
        setShowActionChoice(false)
        setInviteOnlyMode(true)
        setGuests([{ odId: '', name: '' }])
        setModalStep('guests')
    }

    const handleDeleteWeekSlot = async (slotId) => {
        if (!isAdmin || viewMode !== 'edit') return
        if (!window.confirm('Supprimer ce créneau de cette semaine ?')) return
        await storageService.deleteWeekSlot(slotId)
        await loadWeekConfig()
    }

    const handleGuestUnregister = async (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        await storageService.removeGuestFromSlot(slotId, dateStr, user.id)
        await loadInvitations()
    }

    const handleDurationSelect = (duration) => {
        setSelectedDuration(duration)
        setGuests([{ odId: '', name: '' }])
        if (isUserParticipating(selectedSlotId)) {
            setModalStep('guests')
        } else {
            setModalStep('choice')
        }
    }

    const handleModeChoice = (mode) => {
        setInviteOnlyMode(mode === 'invite_only')
        setModalStep('guests')
    }

    const addGuestField = () => {
        if (guests.length < 3) {
            setGuests([...guests, { odId: '', name: '' }])
        }
    }

    const updateGuest = (index, odId) => {
        const member = approvedMembers.find((m) => m.userId === odId)
        const newGuests = [...guests]
        newGuests[index] = { odId, name: member?.name || '' }
        setGuests(newGuests)
    }

    const removeGuest = (index) => {
        const newGuests = guests.filter((_, i) => i !== index)
        setGuests(newGuests.length > 0 ? newGuests : [{ odId: '', name: '' }])
    }

    const handleRegister = async () => {
        if (!selectedSlotId || !selectedDuration) return

        const validGuests = guests.filter((g) => g.odId)
        if (inviteOnlyMode && validGuests.length === 0) {
            alert('Veuillez sélectionner au moins une personne à inviter.')
            return
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(selectedSlotId)

        for (let i = 0; i < selectedDuration.slots; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (!slot) continue
            const blockedInfo = getBlockedSlotInfo(slot.id)
            if (blockedInfo && blockedInfo.isBlocking !== false) {
                alert(
                    `La durée sélectionnée chevauche un créneau bloqué (${blockedInfo.name}). Veuillez réduire la durée.`
                )
                return
            }
        }

        const currentAccepted = getAcceptedParticipantCount(selectedSlotId)
        const totalAfter = currentAccepted + (inviteOnlyMode ? 0 : 1)
        const isOverbooked = totalAfter > maxPersons

        try {
            if (!inviteOnlyMode) {
                for (let i = 0; i < selectedDuration.slots; i++) {
                    const slot = TIME_SLOTS[startIndex + i]
                    await storageService.registerForSlot(
                        slot.id,
                        dateStr,
                        user.id,
                        user.name,
                        selectedDuration.slots,
                        isOverbooked
                    )
                }
            }

            const firstSlot = TIME_SLOTS[startIndex]
            for (const guest of validGuests) {
                await storageService.inviteToSlot(
                    firstSlot.id,
                    dateStr,
                    guest.odId,
                    guest.name,
                    user.id,
                    selectedDuration.slots
                )
            }

            closeModal()
            await loadData()
            await loadInvitations()
        } catch (error) {
            console.error('Registration error:', error)
        }
    }

    const handleUnregister = async (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const registration = getUserRegistration(slotId)

        if (registration) {
            const startIndex = getSlotIndex(slotId)
            const duration = registration.duration || 1
            for (let i = 0; i < duration; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                if (slot) {
                    await storageService.unregisterFromSlot(slot.id, dateStr, user.id)
                }
            }
        }

        await loadData()
    }

    const handleAdminDelete = async (slotId, participantId, participantName, isGuest) => {
        if (!isAdmin) return
        if (!window.confirm(`Supprimer ${participantName} de ce créneau ?`)) return

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        if (isGuest) {
            await storageService.adminDeleteInvitation(slotId, dateStr, participantId)
            await loadInvitations()
        } else {
            await storageService.adminDeleteEvent(slotId, dateStr, participantId)
            await loadData()
        }
    }

    const closeModal = () => {
        setModalStep(null)
        setSelectedSlotId(null)
        setSelectedDuration(null)
        setGuests([{ odId: '', name: '' }])
        setInviteOnlyMode(false)
    }

    // ==================== RENDER ====================

    if (loading) {
        return (
            <div className="text-center mt-4">
                <p>Chargement du planning...</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn"
                    style={{ marginTop: '1rem' }}
                >
                    Recharger la page
                </button>
            </div>
        )
    }

    const availableDurations = selectedSlotId ? getAvailableDurations(selectedSlotId) : []
    const currentSlotAccepted = selectedSlotId ? getAcceptedParticipantCount(selectedSlotId) : 0
    const isCurrentSlotOverbooked = currentSlotAccepted >= maxPersons

    return (
        <div className="calendar-view" style={{ paddingBottom: '2rem' }}>
            <RegistrationModal
                modalStep={modalStep}
                selectedSlotId={selectedSlotId}
                selectedDate={selectedDate}
                selectedDuration={selectedDuration}
                guests={guests}
                approvedMembers={approvedMembers}
                inviteOnlyMode={inviteOnlyMode}
                availableDurations={availableDurations}
                currentSlotAccepted={currentSlotAccepted}
                isCurrentSlotOverbooked={isCurrentSlotOverbooked}
                totalTables={totalTables}
                isUserParticipating={isUserParticipating}
                getParticipants={getParticipants}
                getEndTime={getEndTime}
                onDurationSelect={handleDurationSelect}
                onModeChoice={handleModeChoice}
                onSetModalStep={setModalStep}
                onUpdateGuest={updateGuest}
                onRemoveGuest={removeGuest}
                onAddGuestField={addGuestField}
                onRegister={handleRegister}
                onClose={closeModal}
            />

            {showOpenSlotModal && (
                <OpenSlotModal
                    slotToOpen={slotToOpen}
                    selectedDate={selectedDate}
                    selectedTarget={selectedTarget}
                    selectedOpenDuration={selectedOpenDuration}
                    availableOpenDurations={slotToOpen ? getAvailableOpenDurations(slotToOpen) : []}
                    getEndTime={getEndTime}
                    onSetSelectedTarget={setSelectedTarget}
                    onSetSelectedOpenDuration={setSelectedOpenDuration}
                    onOpenSlot={handleOpenSlot}
                    onClose={() => setShowOpenSlotModal(false)}
                />
            )}

            {showActionChoice && (
                <ActionChoiceModal
                    selectedSlotId={selectedSlotId}
                    selectedDate={selectedDate}
                    onShowParticipants={handleShowParticipants}
                    onOpenInviteModal={handleOpenInviteModal}
                    onClose={() => setShowActionChoice(false)}
                />
            )}

            {showParticipantsList && (
                <ParticipantsModal
                    selectedSlotId={selectedSlotId}
                    selectedDate={selectedDate}
                    participantsToShow={participantsToShow}
                    isUserRegistered={!!getUserRegistration(selectedSlotId)}
                    isUserOnSlot={isUserOnSlot(selectedSlotId)}
                    onRegister={() => {
                        setShowParticipantsList(false)
                        setSelectedDuration(null)
                        setModalStep('duration')
                        setInviteOnlyMode(false)
                    }}
                    onInviteOnly={() => {
                        setShowParticipantsList(false)
                        setSelectedDuration(null)
                        setModalStep('duration')
                        setInviteOnlyMode(true)
                    }}
                    onClose={() => setShowParticipantsList(false)}
                />
            )}

            <CalendarNavigation
                weekStart={weekStart}
                selectedDate={selectedDate}
                weekDays={weekDays}
                viewMode={viewMode}
                isWeekConfigured={isWeekConfigured}
                isCurrentWeek={isCurrentWeek()}
                viewOptions={getViewOptions()}
                getDayParticipantCount={getDayParticipantCount}
                onPrevWeek={prevWeek}
                onNextWeek={nextWeek}
                onSelectDate={setSelectedDate}
                onSetViewMode={setViewMode}
            />

            {viewMode === 'week' ? (
                <WeekViewGrid
                    weekStart={weekStart}
                    selectedDate={selectedDate}
                    weekSlots={weekSlots}
                    openedSlots={openedSlots}
                    onSelectDay={(day) => {
                        setSelectedDate(day)
                        setViewMode('occupied')
                    }}
                />
            ) : (
                <DayViewSlots
                    viewMode={viewMode}
                    userId={user.id}
                    isAdmin={isAdmin}
                    maxPersons={maxPersons}
                    canReserveOnWeek={canReserveOnWeek()}
                    getBlockedSlotInfo={getBlockedSlotInfo}
                    isSlotInOpeningHours={isSlotInOpeningHours}
                    isSlotAvailable={isSlotAvailable}
                    canUserRegister={canUserRegister}
                    isUserParticipating={isUserParticipating}
                    getParticipants={getParticipants}
                    getAcceptedParticipantCount={getAcceptedParticipantCount}
                    getParticipantColor={getParticipantColor}
                    getOpenedSlotInfo={getOpenedSlotInfo}
                    onSlotClick={handleSlotClick}
                    onUnregister={handleUnregister}
                    onAdminDelete={handleAdminDelete}
                    onCloseSlot={handleCloseSlot}
                    onDeleteWeekSlot={handleDeleteWeekSlot}
                />
            )}
        </div>
    )
}
