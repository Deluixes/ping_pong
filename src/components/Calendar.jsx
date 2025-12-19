import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { startOfWeek, addDays, format, isSameDay, isSameWeek, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { Users, ChevronLeft, ChevronRight, X, Clock, Trash2, UserPlus, Edit3, Lock, Info, Unlock } from 'lucide-react'

// Generate 30-min slots from 8:00 to 23:00 (for unconfigured weeks)
const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 23; hour++) {
        slots.push({ id: `${hour}:00`, label: `${hour}:00`, hour, minute: 0 })
        slots.push({ id: `${hour}:30`, label: `${hour}:30`, hour, minute: 30 })
    }
    return slots
}

const TIME_SLOTS = generateTimeSlots()
const DEFAULT_TOTAL_TABLES = 8

const DURATION_OPTIONS = [
    { slots: 1, label: '30 min', value: 1 },
    { slots: 2, label: '1 h', value: 2 },
    { slots: 3, label: '1 h 30', value: 3 },
    { slots: 4, label: '2 h', value: 4 },
    { slots: 5, label: '2 h 30', value: 5 },
    { slots: 6, label: '3 h', value: 6 },
    { slots: 7, label: '3 h 30', value: 7 },
    { slots: 8, label: '4 h', value: 8 }
]

// Cache events in localStorage for instant display
const getCachedEvents = () => {
    try {
        const cached = localStorage.getItem('pingpong_events')
        if (cached) {
            const { events, timestamp } = JSON.parse(cached)
            // Cache valid for 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return events
            }
        }
    } catch { /* ignore */ }
    return []
}

const setCachedEvents = (events) => {
    try {
        localStorage.setItem('pingpong_events', JSON.stringify({
            events,
            timestamp: Date.now()
        }))
    } catch { /* ignore */ }
}

export default function Calendar() {
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedDate, setSelectedDate] = useState(() => {
        // Lire la date depuis les paramètres URL si présente
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
    const [modalStep, setModalStep] = useState(null) // 'duration' | 'choice' | 'guests' | null
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [guests, setGuests] = useState([{ odId: '', name: '' }])
    const [inviteOnlyMode, setInviteOnlyMode] = useState(false)

    // Settings
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const maxPersons = totalTables * 2

    // Admin check
    const isAdmin = user?.isAdmin

    // Approved members for guest selection
    const [approvedMembers, setApprovedMembers] = useState([])

    // Invitations pour la date sélectionnée
    const [invitations, setInvitations] = useState([])

    // Week configuration (remplace blockedSlots et openingHours)
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
            { value: 'week', label: 'Vue semaine' }
        ]
        if (canManageSlots) {
            options.push({ value: 'manage_slots', label: 'Ouverture/Fermeture de créneaux' })
        }
        if (isAdmin && isWeekConfigured) {
            options.push({ value: 'edit', label: 'Modification depuis le planning' })
        }
        return options
    }

    // Ref for subscription to avoid re-subscriptions
    const subscriptionRef = useRef(null)
    const invitationsSubscriptionRef = useRef(null)
    const userIdRef = useRef(user?.id)
    const isMountedRef = useRef(true)

    // Cleanup au démontage
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    const loadData = useCallback(async () => {
        const currentUserId = userIdRef.current
        if (!currentUserId) {
            setLoading(false)
            return
        }
        try {
            // Load settings
            const tablesSettings = await storageService.getSetting('total_tables')
            if (!isMountedRef.current) return
            if (tablesSettings) setTotalTables(parseInt(tablesSettings))

            // Load events first (most important), members can wait
            const loadedEvents = await storageService.getEvents()
            if (!isMountedRef.current) return
            setEvents(loadedEvents)
            setCachedEvents(loadedEvents)
            setLoading(false)

            // Load members in background (for guest selection)
            const members = await storageService.getMembers()
            if (!isMountedRef.current) return
            setApprovedMembers(members.approved.filter(m => m.userId !== currentUserId))
        } catch (error) {
            console.error('Error loading data:', error)
            if (isMountedRef.current) setLoading(false)
        }
    }, [])

    // Charger la configuration de la semaine quand weekStart change
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

    // Charger les invitations quand la date change
    const loadInvitations = useCallback(async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const loadedInvitations = await storageService.getAllInvitationsForDate(dateStr)
        if (isMountedRef.current) {
            setInvitations(loadedInvitations)
        }
    }, [selectedDate])

    // Charger les créneaux ouverts quand la date change
    const loadOpenedSlots = useCallback(async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const slots = await storageService.getOpenedSlotsForDate(dateStr)
        if (isMountedRef.current) {
            setOpenedSlots(slots)
        }
    }, [selectedDate])

    // Recharger les invitations quand la date change
    useEffect(() => {
        loadInvitations()
    }, [loadInvitations])

    // Recharger les créneaux ouverts quand la date change
    useEffect(() => {
        loadOpenedSlots()
    }, [loadOpenedSlots])

    // Recharger la config de la semaine quand la date change
    useEffect(() => {
        loadWeekConfig()
    }, [loadWeekConfig])

    // Update userIdRef when user changes
    useEffect(() => {
        userIdRef.current = user?.id
        if (user?.id) {
            loadData()
        }
    }, [user?.id, loadData])

    // Gérer les paramètres URL (date et slot depuis les invitations)
    useEffect(() => {
        const dateParam = searchParams.get('date')
        const slotParam = searchParams.get('slot')

        if (dateParam || slotParam) {
            // Nettoyer les paramètres URL après les avoir lus
            setSearchParams({}, { replace: true })
        }
    }, [])

    // Setup subscription once on mount
    useEffect(() => {
        // Subscribe to real-time changes (only once)
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

    // Navigation
    const nextWeek = () => {
        setWeekStart(d => addDays(d, 7))
        setSelectedDate(d => addDays(d, 7))
    }
    const prevWeek = () => {
        setWeekStart(d => addDays(d, -7))
        setSelectedDate(d => addDays(d, -7))
    }

    const weekDays = []
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i))
    }

    // Get slot index
    const getSlotIndex = (slotId) => TIME_SLOTS.findIndex(s => s.id === slotId)

    // Check if a slot has a table available for the user
    const getSlotEvents = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.filter(e => e.date === dateStr && e.slotId === slotId)
    }

    const getParticipants = (slotId) => {
        const slotEvents = getSlotEvents(slotId)
        const participants = []

        // Les owners (réservations directes)
        slotEvents.forEach(e => {
            participants.push({
                id: e.userId,
                name: e.userName || 'Inconnu',
                isGuest: false,
                status: 'accepted',
                duration: e.duration
            })
        })

        // Les invités (depuis la table slot_invitations)
        const slotInvitations = invitations.filter(inv => inv.slotId === slotId)
        slotInvitations.forEach(inv => {
            participants.push({
                id: inv.odId,
                name: inv.name,
                isGuest: true,
                status: inv.status,
                invitedBy: inv.invitedBy
            })
        })

        return participants
    }

    // Compte uniquement les participants acceptés (pour le calcul de surcharge)
    const getAcceptedParticipantCount = (slotId) => {
        const participants = getParticipants(slotId)
        return participants.filter(p => p.status === 'accepted').length
    }

    const getSlotParticipantCount = (slotId) => {
        return getParticipants(slotId).length
    }

    // Détermine la couleur d'un participant
    const getParticipantColor = (participant, slotId) => {
        const acceptedCount = getAcceptedParticipantCount(slotId)
        const isSlotOverbooked = acceptedCount > maxPersons

        if (participant.isGuest && participant.status === 'pending') {
            return '#9CA3AF' // Gris - en attente
        }

        // Accepté (ou owner)
        return isSlotOverbooked ? '#EF4444' : '#10B981' // Rouge ou Vert
    }

    // Vérifie si l'utilisateur participe au créneau (owner OU invité accepté)
    const isUserParticipating = (slotId) => {
        const participants = getParticipants(slotId)
        // Participe si owner (isGuest=false) ou invité accepté
        return participants.some(p => p.id === user.id && (p.status === 'accepted' || !p.isGuest))
    }

    // Vérifie si l'utilisateur est présent sur le créneau (owner, invité pending OU accepté)
    // Pour bloquer l'inscription s'il est déjà invité (même pending)
    const isUserOnSlot = (slotId) => {
        const participants = getParticipants(slotId)
        return participants.some(p => p.id === user.id)
    }

    const getUserRegistration = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.find(e => e.date === dateStr && e.slotId === slotId && e.userId === user.id)
    }

    // Calculate available durations from a starting slot
    const getAvailableDurations = (startSlotId) => {
        const startIndex = getSlotIndex(startSlotId)
        if (startIndex === -1) return []

        const available = []

        // Vérifier le type du créneau de départ
        const startAvailability = isSlotAvailable(startSlotId)

        for (const duration of DURATION_OPTIONS) {
            // Check if we have enough slots remaining in the day
            if (startIndex + duration.slots > TIME_SLOTS.length) {
                break
            }

            // Check if any slot in this duration overlaps with a blocking slot
            // OR if slot is not available (closed or wrong target)
            let isValidDuration = true
            for (let i = 0; i < duration.slots; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                const blockedInfo = getBlockedSlotInfo(slot.id)

                // Slot bloquant (training) → durée invalide
                if (blockedInfo && blockedInfo.isBlocking !== false) {
                    isValidDuration = false
                    break
                }

                // Pour les créneaux "opened" (ouverts par admin_salles),
                // vérifier que les créneaux suivants sont aussi ouverts
                if (startAvailability.type === 'opened' && i > 0) {
                    const slotAvailability = isSlotAvailable(slot.id)
                    // Si le créneau suivant n'est pas disponible
                    if (!slotAvailability.available) {
                        isValidDuration = false
                        break
                    }
                    // Vérifier aussi que le target est compatible
                    if (slotAvailability.type === 'opened' &&
                        slotAvailability.target !== 'all' &&
                        slotAvailability.target !== startAvailability.target) {
                        isValidDuration = false
                        break
                    }
                }
            }

            if (isValidDuration) {
                available.push(duration)
            }
        }

        return available
    }

    const getDayParticipantCount = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter(e => e.date === dateStr)
        return new Set(dayEvents.map(e => e.userId)).size
    }

    // Vérifie si la semaine affichée est la semaine courante
    const isCurrentWeek = () => {
        const today = startOfDay(new Date())
        return isSameWeek(selectedDate, today, { weekStartsOn: 1 })
    }

    // Vérifie si les réservations sont autorisées pour cette semaine
    const canReserveOnWeek = () => {
        // Si semaine configurée, on peut réserver
        if (isWeekConfigured) return true
        // Sinon, seulement si c'est la semaine en cours
        return isCurrentWeek()
    }

    // Vérifie si un créneau est bloqué par un entraînement (utilise weekSlots)
    const getBlockedSlotInfo = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const [hour, minute] = slotId.split(':').map(Number)
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        return weekSlots.find(slot => {
            if (slot.date !== dateStr) return false
            const startTime = slot.startTime.slice(0, 5)
            const endTime = slot.endTime.slice(0, 5)
            return slotTime >= startTime && slotTime < endTime
        })
    }

    // Vérifie si un créneau est dans les heures d'ouverture (utilise weekHours)
    const isSlotInOpeningHours = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const [hour, minute] = slotId.split(':').map(Number)
        const slotTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

        // Filtrer les heures pour cette date
        const dayHours = weekHours.filter(h => h.date === dateStr)

        // Si semaine non configurée, plage par défaut 8h-23h
        if (!isWeekConfigured || dayHours.length === 0) {
            return slotTime >= '08:00' && slotTime < '23:00'
        }

        // Vérifier si le créneau est dans une des plages configurées
        return dayHours.some(h => {
            const startTime = h.startTime.slice(0, 5)
            const endTime = h.endTime.slice(0, 5)
            return slotTime >= startTime && slotTime < endTime
        })
    }

    // Récupérer info d'un créneau ouvert
    const getOpenedSlotInfo = (slotId) => {
        return openedSlots.find(os => os.slotId === slotId)
    }

    // Détermine la disponibilité d'un créneau et son type
    const isSlotAvailable = (slotId) => {
        const blockedInfo = getBlockedSlotInfo(slotId)

        // 1. Créneau de cours (indicatif, isBlocking === false) → ouvert à tous
        if (blockedInfo && blockedInfo.isBlocking === false) {
            return { available: true, type: 'course', target: 'all', blockedInfo }
        }

        // 2. Créneau d'entraînement (bloquant, isBlocking === true) → PAS d'inscription
        if (blockedInfo && blockedInfo.isBlocking === true) {
            return { available: false, type: 'training', reason: 'blocked', blockedInfo }
        }

        // 3. Créneau ouvert par admin_salles → vérifier target
        const openedInfo = getOpenedSlotInfo(slotId)
        if (openedInfo) {
            return { available: true, type: 'opened', target: openedInfo.target, openedInfo }
        }

        // 4. Par défaut → fermé
        return { available: false, type: 'closed', reason: 'not_opened' }
    }

    // Vérifie si l'utilisateur peut s'inscrire à un créneau
    const canUserRegister = (slotId) => {
        if (!canReserveOnWeek()) return false

        const { available, target } = isSlotAvailable(slotId)
        if (!available) return false
        if (target === 'all') return true
        if (target === 'loisir' && user?.licenseType === 'L') return true
        if (target === 'competition' && user?.licenseType === 'C') return true
        return false
    }

    // Calcul des durées disponibles pour l'ouverture d'un créneau
    const getAvailableOpenDurations = (startSlotId) => {
        const startIndex = getSlotIndex(startSlotId)
        if (startIndex === -1) return []

        const available = []

        for (const duration of DURATION_OPTIONS) {
            // Vérifier qu'on ne dépasse pas la journée
            if (startIndex + duration.slots > TIME_SLOTS.length) {
                break
            }

            // Vérifier qu'aucun créneau bloquant n'interfère
            let isValidDuration = true
            for (let i = 0; i < duration.slots; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                const blockedInfo = getBlockedSlotInfo(slot.id)

                // Slot bloquant (training) → durée invalide
                if (blockedInfo && blockedInfo.isBlocking !== false) {
                    isValidDuration = false
                    break
                }
            }

            if (isValidDuration) {
                available.push(duration)
            }
        }

        return available
    }

    // Ouvrir un créneau (admin_salles)
    const handleOpenSlot = async () => {
        if (!slotToOpen || !canManageSlots) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(slotToOpen)

        // Ouvrir tous les créneaux consécutifs selon la durée
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

    // Fermer un créneau (admin_salles)
    const handleCloseSlot = async (slotId) => {
        if (!canManageSlots) return

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const participants = getParticipants(slotId)

        if (participants.length > 0) {
            // Il y a des inscrits, demander confirmation
            const confirmed = window.confirm(
                `${participants.length} personne(s) inscrite(s) sur ce créneau :\n` +
                participants.map(p => `- ${p.name}`).join('\n') +
                `\n\nVoulez-vous vraiment fermer ce créneau ?\nLeurs réservations seront supprimées.`
            )
            if (!confirmed) return

            // Supprimer les réservations
            await storageService.deleteReservationsForSlot(dateStr, slotId)
            await loadData() // Recharger les événements
        }

        // Fermer le créneau
        await storageService.closeSlot(dateStr, slotId)
        await loadOpenedSlots()
    }

    // Actions
    const handleSlotClick = (slotId) => {
        const userReg = getUserRegistration(slotId)

        // Si déjà inscrit, ouvrir directement le modal d'invitation
        if (userReg) {
            setSelectedSlotId(slotId)
            setSelectedDuration(DURATION_OPTIONS.find(d => d.slots === userReg?.duration) || DURATION_OPTIONS[0])
            setInviteOnlyMode(true)
            setGuests([{ odId: '', name: '' }])
            setModalStep('guests')
            return
        }
        if (isUserOnSlot(slotId)) {
            handleGuestUnregister(slotId)
            return
        }

        // Vérifier la disponibilité du créneau
        const availability = isSlotAvailable(slotId)

        // Créneau fermé par défaut
        if (!availability.available) {
            // Si admin_salles, proposer d'ouvrir le créneau
            if (canManageSlots) {
                setSlotToOpen(slotId)
                setSelectedTarget('all')
                setShowOpenSlotModal(true)
            } else {
                alert('Ce créneau n\'est pas ouvert aux réservations.')
            }
            return
        }

        // Vérifier si l'utilisateur peut s'inscrire (licence compatible)
        if (!canUserRegister(slotId)) {
            const { target } = availability
            if (target === 'loisir') {
                alert('Ce créneau est réservé aux licences Loisir.')
            } else if (target === 'competition') {
                alert('Ce créneau est réservé aux licences Compétition.')
            } else if (!user?.licenseType) {
                alert('Votre type de licence n\'est pas défini. Contactez un administrateur.')
            } else {
                alert('Vous ne pouvez pas vous inscrire à ce créneau.')
            }
            return
        }

        // Tout est ok, ouvrir le modal d'inscription
        setSelectedSlotId(slotId)
        setSelectedDuration(null)
        setModalStep('duration')
    }

    // Admin: supprimer un créneau de la semaine
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
        setModalStep('choice')
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
        const member = approvedMembers.find(m => m.userId === odId)
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

        // En mode invite_only, il faut au moins un invité
        const validGuests = guests.filter(g => g.odId)
        if (inviteOnlyMode && validGuests.length === 0) {
            alert('Veuillez sélectionner au moins une personne à inviter.')
            return
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(selectedSlotId)

        // Vérifier que la durée ne chevauche pas un créneau bloquant
        for (let i = 0; i < selectedDuration.slots; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (!slot) continue
            const blockedInfo = getBlockedSlotInfo(slot.id)
            if (blockedInfo && blockedInfo.isBlocking !== false) {
                alert(`La durée sélectionnée chevauche un créneau bloqué (${blockedInfo.name}). Veuillez réduire la durée.`)
                return
            }
        }

        // Calculer overbooked en comptant SEULEMENT les acceptés
        const currentAccepted = getAcceptedParticipantCount(selectedSlotId)
        const totalAfter = currentAccepted + (inviteOnlyMode ? 0 : 1) // +1 seulement si on s'inscrit
        const isOverbooked = totalAfter > maxPersons

        try {
            // S'inscrire seulement si pas en mode invite_only
            if (!inviteOnlyMode) {
                for (let i = 0; i < selectedDuration.slots; i++) {
                    const slot = TIME_SLOTS[startIndex + i]
                    await storageService.registerForSlot(slot.id, dateStr, user.id, user.name, selectedDuration.slots, isOverbooked)
                }
            }

            // Créer une seule invitation par invité avec la durée totale
            const firstSlot = TIME_SLOTS[startIndex]
            for (const guest of validGuests) {
                await storageService.inviteToSlot(firstSlot.id, dateStr, guest.odId, guest.name, user.id, selectedDuration.slots)
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
            // Find all slots that are part of this booking (same table, consecutive)
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

    // Admin: delete any user's reservation or invitation
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

    // Calculate if slot is overbooked for warning display (only accepted count)
    const currentSlotAccepted = selectedSlotId ? getAcceptedParticipantCount(selectedSlotId) : 0
    const isCurrentSlotOverbooked = currentSlotAccepted >= maxPersons

    // Get end time for display
    const getEndTime = (startSlotId, durationSlots) => {
        const startIndex = getSlotIndex(startSlotId)
        const endSlot = TIME_SLOTS[startIndex + durationSlots]
        if (endSlot) return endSlot.label
        return '22:00'
    }

    return (
        <div className="calendar-view" style={{ paddingBottom: '2rem' }}>
            {/* Modal */}
            {modalStep && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '1.5rem 1.5rem 0 0',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '70vh',
                        overflow: 'auto',
                        animation: 'slideUp 0.2s ease-out'
                    }}>
                        <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} />
                                {modalStep === 'duration' ? 'Durée de réservation' :
                                 modalStep === 'choice' ? 'Type de réservation' :
                                 inviteOnlyMode ? 'Inviter des personnes' : 'Confirmer la réservation'}
                            </h3>
                            <button
                                onClick={closeModal}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <strong>{selectedSlotId}</strong> - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                            {selectedDuration && (
                                <span> → <strong>{getEndTime(selectedSlotId, selectedDuration.slots)}</strong></span>
                            )}
                        </p>

                        {/* Step 1: Duration Selection */}
                        {modalStep === 'duration' && (
                            <>
                                {availableDurations.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {availableDurations.map(duration => (
                                            <button
                                                key={duration.value}
                                                onClick={() => handleDurationSelect(duration)}
                                                style={{
                                                    padding: '1rem 1.5rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '2px solid var(--color-primary)',
                                                    background: 'white',
                                                    color: 'var(--color-primary)',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                                <span>{duration.label}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {selectedSlotId} → {getEndTime(selectedSlotId, duration.slots)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: '#FEE2E2',
                                        border: '1px solid #EF4444',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem',
                                        textAlign: 'center',
                                        color: '#991B1B'
                                    }}>
                                        Aucune durée disponible pour ce créneau.
                                    </div>
                                )}
                            </>
                        )}

                        {/* Step 2: Choice (S'inscrire / Inviter seulement) */}
                        {modalStep === 'choice' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setModalStep('duration')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        marginBottom: '0.5rem',
                                        padding: 0,
                                        textAlign: 'left',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    ← Changer la durée
                                </button>

                                <button
                                    onClick={() => handleModeChoice('register')}
                                    className="btn"
                                    style={{
                                        background: '#F0FDF4',
                                        color: '#166534',
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        border: '2px solid #22C55E'
                                    }}
                                >
                                    <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>✓</span>
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <div style={{ fontWeight: '600' }}>S'inscrire</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Je m'inscris et je peux inviter des personnes</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeChoice('invite_only')}
                                    className="btn"
                                    style={{
                                        background: '#DBEAFE',
                                        color: '#1E40AF',
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        border: '2px solid #3B82F6'
                                    }}
                                >
                                    <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                                        <UserPlus size={24} />
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <div style={{ fontWeight: '600' }}>Inviter seulement</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>J'invite des personnes sans m'inscrire</div>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Step 3: Invite Guests + Confirmation */}
                        {modalStep === 'guests' && (
                            <>
                                {/* Si déjà inscrit (inviteOnlyMode direct), fermer le modal */}
                                {/* Sinon retourner à l'étape choice */}
                                <button
                                    onClick={() => inviteOnlyMode && isUserParticipating(selectedSlotId) ? closeModal() : setModalStep('choice')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem',
                                        padding: 0
                                    }}
                                >
                                    {inviteOnlyMode && isUserParticipating(selectedSlotId) ? '← Annuler' : '← Retour'}
                                </button>

                                {/* Warning if overbooked */}
                                {isCurrentSlotOverbooked && (
                                    <div style={{
                                        background: '#FEF3C7',
                                        border: '1px solid #F59E0B',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <p style={{ margin: 0, color: '#92400E', fontWeight: '500' }}>
                                            ⚠️ Attention : il n'y a que {totalTables} tables disponibles et {currentSlotAccepted} personnes confirmées. Êtes-vous sûr de ce créneau ?
                                        </p>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <UserPlus size={18} />
                                    <span style={{ fontWeight: '500' }}>Inviter des membres (optionnel)</span>
                                </div>

                                {approvedMembers.length > 0 ? (
                                    <>
                                        {/* Info sur les invitations */}
                                        {guests.filter(g => g.odId).length > 0 && (
                                            <div style={{
                                                background: '#E0F2FE',
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                marginBottom: '1rem',
                                                fontSize: '0.9rem'
                                            }}>
                                                <strong>Info :</strong> {guests.filter(g => g.odId).length} personne(s) invitée(s) devront accepter l'invitation.
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                            {guests.map((guest, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <select
                                                        value={guest.odId}
                                                        onChange={(e) => updateGuest(idx, e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.75rem',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid #DDD',
                                                            fontSize: '0.95rem',
                                                            background: 'white'
                                                        }}
                                                    >
                                                        <option value="">-- Choisir un membre --</option>
                                                        {approvedMembers
                                                            .filter(m => {
                                                                // Exclure si déjà sélectionné dans un autre champ guest
                                                                if (guests.some(g => g.odId === m.userId) && m.userId !== guest.odId) {
                                                                    return false
                                                                }
                                                                // Exclure si déjà participant sur ce créneau (owner ou invité)
                                                                const slotParticipants = getParticipants(selectedSlotId)
                                                                if (slotParticipants.some(p => p.id === m.userId)) {
                                                                    return false
                                                                }
                                                                return true
                                                            })
                                                            .map(m => (
                                                                <option key={m.userId} value={m.userId}>{m.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    {guests.length > 1 && (
                                                        <button
                                                            onClick={() => removeGuest(idx)}
                                                            style={{
                                                                background: '#FEE2E2',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-md)',
                                                                padding: '0 0.75rem',
                                                                color: '#991B1B',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {(() => {
                                            // Calculer les membres disponibles (non sur le créneau et non déjà sélectionnés)
                                            const slotParticipants = getParticipants(selectedSlotId)
                                            const availableMembers = approvedMembers.filter(m =>
                                                !slotParticipants.some(p => p.id === m.userId) &&
                                                !guests.some(g => g.odId === m.userId)
                                            )
                                            return guests.length < 3 && availableMembers.length > 0
                                        })() && (
                                            <button
                                                onClick={addGuestField}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: 'var(--color-bg)',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <UserPlus size={16} />
                                                Ajouter un joueur
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div style={{
                                        background: 'var(--color-bg)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '1rem',
                                        textAlign: 'center',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.9rem'
                                    }}>
                                        Aucun autre membre dans le groupe pour le moment
                                    </div>
                                )}

                                <button
                                    onClick={handleRegister}
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {inviteOnlyMode ? '✓ Envoyer les invitations' : '✓ Confirmer la réservation'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Modal ouverture de créneau (admin_salles) */}
            {showOpenSlotModal && slotToOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                    onClick={(e) => e.target === e.currentTarget && setShowOpenSlotModal(false)}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '1.5rem 1.5rem 0 0',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        animation: 'slideUp 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Unlock size={20} />
                                Ouvrir des créneaux
                            </h3>
                            <button
                                onClick={() => setShowOpenSlotModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <strong>{slotToOpen}</strong> → <strong>{getEndTime(slotToOpen, selectedOpenDuration)}</strong>
                            <br />
                            {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                        </p>

                        {/* Sélecteur de durée */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                <Clock size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                Durée
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {getAvailableOpenDurations(slotToOpen).map(duration => (
                                    <button
                                        key={duration.value}
                                        onClick={() => setSelectedOpenDuration(duration.slots)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: selectedOpenDuration === duration.slots ? '2px solid var(--color-primary)' : '1px solid #E2E8F0',
                                            background: selectedOpenDuration === duration.slots ? '#EFF6FF' : 'white',
                                            color: selectedOpenDuration === duration.slots ? 'var(--color-primary)' : 'var(--color-text)',
                                            fontWeight: selectedOpenDuration === duration.slots ? '600' : '400',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {duration.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                Ouvrir pour :
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    border: selectedTarget === 'all' ? '2px solid var(--color-primary)' : '1px solid #E2E8F0',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: selectedTarget === 'all' ? '#F0FDF4' : 'white'
                                }}>
                                    <input
                                        type="radio"
                                        name="target"
                                        value="all"
                                        checked={selectedTarget === 'all'}
                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '500' }}>Tous les membres</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Loisir et Compétition</div>
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    border: selectedTarget === 'loisir' ? '2px solid #0369A1' : '1px solid #E2E8F0',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: selectedTarget === 'loisir' ? '#E0F2FE' : 'white'
                                }}>
                                    <input
                                        type="radio"
                                        name="target"
                                        value="loisir"
                                        checked={selectedTarget === 'loisir'}
                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '500', color: '#0369A1' }}>Loisir uniquement</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Licence L</div>
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    border: selectedTarget === 'competition' ? '2px solid #92400E' : '1px solid #E2E8F0',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    background: selectedTarget === 'competition' ? '#FEF3C7' : 'white'
                                }}>
                                    <input
                                        type="radio"
                                        name="target"
                                        value="competition"
                                        checked={selectedTarget === 'competition'}
                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '500', color: '#92400E' }}>Compétition uniquement</div>
                                        <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>Licence C</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowOpenSlotModal(false)}
                                className="btn"
                                style={{ flex: 1, background: 'var(--color-bg)' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleOpenSlot}
                                className="btn btn-primary"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <Unlock size={16} />
                                Ouvrir {selectedOpenDuration > 1 ? `(${selectedOpenDuration} créneaux)` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Week Navigation */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                marginTop: '1rem',
                background: 'var(--color-surface)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <button onClick={prevWeek} className="btn" style={{ background: 'var(--color-bg)', padding: '0.5rem' }}>
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={nextWeek} className="btn" style={{ background: 'var(--color-bg)', padding: '0.5rem' }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                padding: '0.5rem',
                marginBottom: '1rem',
                marginLeft: '-0.5rem',
                marginRight: '-0.5rem'
            }}>
                {weekDays.map(day => {
                    const isSelected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, new Date())
                    const participantCount = getDayParticipantCount(day)

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            style={{
                                flex: '0 0 auto',
                                minWidth: '70px',
                                padding: '0.75rem 0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: isSelected ? '2px solid var(--color-primary)' : '1px solid #E2E8F0',
                                background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: isSelected ? 'white' : 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.25rem',
                                position: 'relative'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7 }}>
                                {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                {format(day, 'd')}
                            </span>
                            {isToday && !isSelected && (
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    marginTop: '2px'
                                }} />
                            )}
                            {participantCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: isSelected ? 'white' : 'var(--color-primary)',
                                    color: isSelected ? 'var(--color-primary)' : 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    textAlign: 'center'
                                }}>
                                    {participantCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Warning if week not configured and not current week */}
            {!isWeekConfigured && !isCurrentWeek() && (
                <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#92400E'
                }}>
                    <Info size={18} />
                    <span style={{ fontSize: '0.9rem' }}>
                        Cette semaine n'est pas encore configurée. Les réservations ne sont pas ouvertes.
                    </span>
                </div>
            )}

            {/* Filter + Edit Mode - Centered */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <select
                    value={viewMode}
                    onChange={(e) => setViewMode(e.target.value)}
                    style={{
                        padding: '0.5rem 1.5rem 0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #E2E8F0',
                        background: viewMode === 'edit' ? '#FEE2E2' : viewMode === 'manage_slots' ? '#E0F2FE' : 'white',
                        fontSize: '0.85rem',
                        color: viewMode === 'edit' ? '#991B1B' : viewMode === 'manage_slots' ? '#0369A1' : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight: viewMode === 'edit' || viewMode === 'manage_slots' ? '500' : '400'
                    }}
                >
                    {getViewOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* Vue semaine ou vue jour */}
            {viewMode === 'week' ? (
                // Vue semaine : grille 7 colonnes
                <div style={{ overflowX: 'auto' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '50px repeat(7, 1fr)',
                        gap: '1px',
                        background: '#E2E8F0',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        minWidth: '600px'
                    }}>
                        {/* Header avec jours */}
                        <div style={{ background: 'var(--color-secondary)', padding: '0.5rem', color: 'white', fontWeight: 'bold', fontSize: '0.7rem' }}></div>
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                            const day = addDays(weekStart, dayOffset)
                            const isToday = isSameDay(day, new Date())
                            const isSelected = isSameDay(day, selectedDate)
                            return (
                                <div
                                    key={dayOffset}
                                    style={{
                                        background: isSelected ? 'var(--color-primary)' : isToday ? '#F0FDF4' : 'var(--color-secondary)',
                                        padding: '0.5rem 0.25rem',
                                        color: isSelected ? 'white' : isToday ? '#166534' : 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.7rem',
                                        textAlign: 'center'
                                    }}
                                >
                                    <div>{format(day, 'EEE', { locale: fr })}</div>
                                    <div style={{ fontSize: '0.85rem' }}>{format(day, 'd')}</div>
                                </div>
                            )
                        })}

                        {/* Lignes horaires de 8h à 22h */}
                        {Array.from({ length: 15 }, (_, i) => i + 8).map(hour => (
                            <React.Fragment key={hour}>
                                {/* Colonne heure */}
                                <div style={{
                                    background: '#F9FAFB',
                                    padding: '0.25rem',
                                    fontSize: '0.65rem',
                                    color: '#6B7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '500'
                                }}>
                                    {hour}h
                                </div>
                                {/* 7 colonnes pour les jours */}
                                {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                                    const day = addDays(weekStart, dayOffset)
                                    const dateStr = format(day, 'yyyy-MM-dd')
                                    const slotId = `${hour}:00`

                                    // Trouver les créneaux pour cette heure et ce jour
                                    const dayWeekSlots = weekSlots.filter(ws => ws.date === dateStr)
                                    const dayOpenedSlots = openedSlots.filter(os => os.date === dateStr)

                                    // Vérifier si un créneau bloquant ou indicatif existe à cette heure
                                    const matchingWeekSlot = dayWeekSlots.find(ws => {
                                        const startHour = parseInt(ws.startTime.split(':')[0])
                                        const endHour = parseInt(ws.endTime.split(':')[0])
                                        return hour >= startHour && hour < endHour
                                    })

                                    // Vérifier si un créneau ouvert existe à cette heure
                                    const matchingOpenedSlot = dayOpenedSlots.find(os => os.slotId === slotId)

                                    let bgColor = 'white'
                                    let content = ''
                                    let textColor = '#6B7280'

                                    if (matchingWeekSlot) {
                                        if (matchingWeekSlot.isBlocking === false) {
                                            // Cours indicatif
                                            bgColor = '#DBEAFE'
                                            textColor = '#1D4ED8'
                                            const startHour = parseInt(matchingWeekSlot.startTime.split(':')[0])
                                            if (hour === startHour) content = matchingWeekSlot.name?.substring(0, 8) || 'Cours'
                                        } else {
                                            // Entraînement bloquant
                                            bgColor = '#F3F4F6'
                                            textColor = '#6B7280'
                                            const startHour = parseInt(matchingWeekSlot.startTime.split(':')[0])
                                            if (hour === startHour) content = matchingWeekSlot.name?.substring(0, 8) || 'Entr.'
                                        }
                                    } else if (matchingOpenedSlot) {
                                        // Créneau ouvert
                                        bgColor = '#DCFCE7'
                                        textColor = '#166534'
                                    }

                                    return (
                                        <div
                                            key={dayOffset}
                                            onClick={() => {
                                                setSelectedDate(day)
                                                setViewMode('occupied')
                                            }}
                                            style={{
                                                background: bgColor,
                                                padding: '0.15rem',
                                                minHeight: '24px',
                                                fontSize: '0.55rem',
                                                color: textColor,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                textAlign: 'center',
                                                overflow: 'hidden',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {content}
                                        </div>
                                    )
                                })}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Légende */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '0.75rem',
                        flexWrap: 'wrap',
                        fontSize: '0.75rem',
                        color: '#6B7280'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', background: '#DCFCE7', borderRadius: '2px' }}></div>
                            <span>Ouvert</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', background: '#DBEAFE', borderRadius: '2px' }}></div>
                            <span>Cours</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', background: '#F3F4F6', borderRadius: '2px' }}></div>
                            <span>Entraînement</span>
                        </div>
                    </div>
                </div>
            ) : (
                // Vue jour standard
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {TIME_SLOTS
                        .filter(slot => {
                            // 1. Filtrer par plages horaires (sauf créneaux bloqués qui s'affichent toujours)
                            const blockedInfo = getBlockedSlotInfo(slot.id)
                            const isBlocked = blockedInfo !== undefined
                            if (!isBlocked && !isSlotInOpeningHours(slot.id)) return false

                            // 2. Filtre selon viewMode
                            if (viewMode === 'occupied') {
                                // Afficher :
                                // - Créneaux avec participants
                                // - Créneaux bloqués (bloquants ET indicatifs)
                                // - Créneaux ouverts (dans openedSlots)
                                const hasParticipants = getParticipants(slot.id).length > 0
                                const isOpenedSlot = getOpenedSlotInfo(slot.id) !== undefined
                                return hasParticipants || isBlocked || isOpenedSlot
                            }
                            return true
                        })
                    .map(slot => {
                        const blockedInfo = getBlockedSlotInfo(slot.id)
                        const availability = isSlotAvailable(slot.id)
                        const userCanRegister = canUserRegister(slot.id)
                        const isParticipating = isUserParticipating(slot.id)
                        const participants = getParticipants(slot.id)
                        const count = participants.length
                        const acceptedCount = getAcceptedParticipantCount(slot.id)
                        const isOverbooked = acceptedCount > maxPersons

                        // Si le créneau est un entraînement (bloquant) ou un cours (indicatif)
                        if (blockedInfo) {
                            const isCourse = blockedInfo.isBlocking === false
                            const isTraining = blockedInfo.isBlocking !== false

                            // Couleurs selon le type
                            let bgColor, timeColor, textColor
                            if (isCourse) {
                                // Cours indicatif : bleu, inscription possible
                                bgColor = isParticipating ? '#F0FDF4' : '#EFF6FF'
                                timeColor = isParticipating ? '#22C55E' : '#3B82F6'
                                textColor = '#1D4ED8'
                            } else {
                                // Entraînement bloquant : gris, pas d'inscription
                                bgColor = '#F3F4F6'
                                timeColor = '#9CA3AF'
                                textColor = '#6B7280'
                            }

                            return (
                                <div
                                    key={slot.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'stretch',
                                        background: bgColor,
                                        borderRadius: 'var(--radius-md)',
                                        overflow: 'hidden',
                                        boxShadow: 'var(--shadow-sm)',
                                        border: isParticipating ? '2px solid #22C55E' : (isCourse ? '1px solid #93C5FD' : '1px solid #E2E8F0'),
                                        opacity: isTraining ? 0.8 : 1
                                    }}
                                >
                                    {/* Time Label */}
                                    <div style={{
                                        width: '60px',
                                        padding: '0.75rem 0.5rem',
                                        background: timeColor,
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem'
                                    }}>
                                        <span>{slot.label}</span>
                                    </div>

                                    {/* Slot Info */}
                                    <div
                                        onClick={isParticipating && isCourse ? () => handleSlotClick(slot.id) : undefined}
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem 0.75rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            gap: '0.15rem',
                                            minWidth: 0,
                                            cursor: isParticipating && isCourse ? 'pointer' : 'default'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textColor, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '1rem' }}>🏓</span>
                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{blockedInfo.name}</span>
                                            {isCourse && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    background: '#DBEAFE',
                                                    color: '#1D4ED8',
                                                    padding: '0.1rem 0.4rem',
                                                    borderRadius: '4px'
                                                }}>
                                                    Info
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                            {blockedInfo.coach}
                                            {blockedInfo.group && <span style={{ marginLeft: '0.5rem', background: '#E5E7EB', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{blockedInfo.group}</span>}
                                        </div>
                                        {/* Participants pour cours indicatifs */}
                                        {isCourse && count > 0 && (
                                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                <Users size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                {participants.map(p => p.name).join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action/indicator */}
                                    {viewMode === 'edit' && isAdmin ? (
                                        <button
                                            onClick={() => handleDeleteWeekSlot(blockedInfo.id)}
                                            style={{
                                                width: '50px',
                                                background: '#FEE2E2',
                                                border: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#DC2626',
                                                cursor: 'pointer'
                                            }}
                                            title="Supprimer ce créneau"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    ) : isTraining ? (
                                        // Entraînement : cadenas, pas d'inscription
                                        <div style={{
                                            width: '50px',
                                            background: '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#9CA3AF'
                                        }}
                                        title="Entraînement réservé"
                                        >
                                            <Lock size={18} />
                                        </div>
                                    ) : isParticipating ? (
                                        // Cours : déjà inscrit, peut se désinscrire
                                        <button
                                            onClick={() => handleUnregister(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#22C55E',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Se désinscrire"
                                        >
                                            <X size={20} />
                                        </button>
                                    ) : canReserveOnWeek() ? (
                                        // Cours : peut s'inscrire
                                        <button
                                            onClick={() => handleSlotClick(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#DBEAFE',
                                                color: '#3B82F6',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="S'inscrire"
                                        >
                                            +
                                        </button>
                                    ) : (
                                        <div style={{
                                            width: '50px',
                                            background: '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#9CA3AF'
                                        }}
                                        title="Réservations fermées"
                                        >
                                            <Lock size={18} />
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        // Créneau normal (non entraînement, non cours)
                        const openedInfo = getOpenedSlotInfo(slot.id)
                        const isClosed = !availability.available
                        const isOpened = availability.type === 'opened'

                        // Couleurs selon l'état
                        let bgColor = 'var(--color-surface)'
                        let timeColor = 'var(--color-bg)'
                        let borderColor = '1px solid #E2E8F0'
                        let statusText = 'Fermé'
                        let statusColor = '#9CA3AF'

                        if (isParticipating) {
                            bgColor = '#F0FDF4'
                            timeColor = '#22C55E'
                            borderColor = '2px solid #22C55E'
                        } else if (isOpened) {
                            bgColor = '#F0FDF4'
                            timeColor = '#22C55E'
                            borderColor = '1px solid #86EFAC'
                            statusText = 'Ouvert'
                            statusColor = '#22C55E'
                        } else if (isClosed) {
                            bgColor = '#F9FAFB'
                            timeColor = '#D1D5DB'
                            borderColor = '1px solid #E5E7EB'
                            statusText = 'Fermé'
                            statusColor = '#9CA3AF'
                        }

                        // Badge de restriction si ouvert avec target spécifique
                        const targetBadge = isOpened && availability.target !== 'all' ? (
                            <span style={{
                                fontSize: '0.65rem',
                                background: availability.target === 'competition' ? '#FEF3C7' : '#E0F2FE',
                                color: availability.target === 'competition' ? '#92400E' : '#0369A1',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: '600'
                            }}>
                                {availability.target === 'competition' ? 'Compét' : 'Loisir'}
                            </span>
                        ) : null

                        return (
                            <div
                                key={slot.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'stretch',
                                    background: bgColor,
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    boxShadow: 'var(--shadow-sm)',
                                    border: borderColor
                                }}
                            >
                                {/* Time Label */}
                                <div style={{
                                    width: '60px',
                                    padding: '0.75rem 0.5rem',
                                    background: timeColor,
                                    color: isParticipating || isOpened ? 'white' : '#6B7280',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <span>{slot.label}</span>
                                </div>

                                {/* Participants Info */}
                                <div
                                    onClick={isParticipating ? () => handleSlotClick(slot.id) : undefined}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem 0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        minWidth: 0,
                                        cursor: isParticipating ? 'pointer' : 'default'
                                    }}
                                >
                                    {count > 0 ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverbooked ? '#EF4444' : 'var(--color-secondary)' }}>
                                                    <Users size={14} />
                                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                                        {acceptedCount}/{maxPersons}
                                                        {count > acceptedCount && (
                                                            <span style={{ color: '#9CA3AF', fontWeight: 'normal' }}> (+{count - acceptedCount})</span>
                                                        )}
                                                    </span>
                                                </div>
                                                {isOverbooked && (
                                                    <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: '500' }}>
                                                        ⚠️ Surbooké
                                                    </span>
                                                )}
                                                {targetBadge}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {participants.map((p, idx) => (
                                                    <span
                                                        key={`${p.id || p.name}-${idx}`}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.15rem',
                                                            color: getParticipantColor(p, slot.id),
                                                            fontWeight: p.status === 'pending' ? '400' : '500'
                                                        }}
                                                    >
                                                        {p.name}
                                                        {p.status === 'pending' && (
                                                            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>(en attente)</span>
                                                        )}
                                                        {isAdmin && p.id && p.id !== user.id && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAdminDelete(slot.id, p.id, p.name, p.isGuest) }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#EF4444',
                                                                    cursor: 'pointer',
                                                                    padding: '0 2px',
                                                                    display: 'inline-flex'
                                                                }}
                                                                title="Supprimer (admin)"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                        {idx < participants.length - 1 && ', '}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ color: statusColor, fontSize: '0.85rem' }}>
                                                {statusText}
                                            </span>
                                            {targetBadge}
                                            {/* Message si mauvaise licence */}
                                            {isOpened && !userCanRegister && availability.target !== 'all' && (
                                                <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                                    (licence {availability.target === 'competition' ? 'C' : 'L'} requise)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Action Button - selon viewMode */}
                                {viewMode === 'manage_slots' ? (
                                    // Vue gestion créneaux : seulement ouvrir/fermer
                                    isOpened ? (
                                        <button
                                            onClick={() => handleCloseSlot(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#FEE2E2',
                                                color: '#DC2626',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Fermer ce créneau"
                                        >
                                            <Lock size={18} />
                                        </button>
                                    ) : isClosed ? (
                                        <button
                                            onClick={() => handleSlotClick(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#E0F2FE',
                                                color: '#0369A1',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Ouvrir ce créneau"
                                        >
                                            <Unlock size={18} />
                                        </button>
                                    ) : (
                                        <div style={{
                                            width: '50px',
                                            background: '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#9CA3AF'
                                        }}
                                        title="Créneau géré par le template"
                                        >
                                            <Lock size={18} />
                                        </div>
                                    )
                                ) : (
                                    // Vues normales : inscription/désinscription
                                    isParticipating ? (
                                        <button
                                            onClick={() => handleUnregister(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#22C55E',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Se désinscrire"
                                        >
                                            <X size={20} />
                                        </button>
                                    ) : userCanRegister && canReserveOnWeek() ? (
                                        <button
                                            onClick={() => handleSlotClick(slot.id)}
                                            style={{
                                                width: '50px',
                                                border: 'none',
                                                background: '#DCFCE7',
                                                color: '#22C55E',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="S'inscrire"
                                        >
                                            +
                                        </button>
                                    ) : (
                                        <div style={{
                                            width: '50px',
                                            background: '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#9CA3AF'
                                        }}
                                        title={isClosed ? 'Créneau fermé' : (!userCanRegister ? 'Licence non compatible' : 'Non disponible')}
                                        >
                                            <Lock size={18} />
                                        </div>
                                    )
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

        </div>
    )
}
