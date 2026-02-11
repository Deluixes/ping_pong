import { useState } from 'react'
import { format } from 'date-fns'
import { storageService } from '../services/storage'
import { MAX_GUESTS } from '../constants'
import { TIME_SLOTS, DURATION_OPTIONS } from '../components/calendar/calendarUtils'

export function useRegistrationModal({ user, selectedDate, slotHelpers, calendarData }) {
    const {
        getSlotIndex,
        getParticipants,
        getAcceptedParticipantCount,
        isUserParticipating,
        isUserOnSlot,
        getUserRegistration,
        getAvailableDurations,
        getAvailableOpenDurations,
        getBlockedSlotInfo,
        isSlotAvailable,
        canUserRegister,
    } = slotHelpers

    const {
        loadData,
        loadInvitations,
        loadOpenedSlots,
        loadWeekConfig,
        approvedMembers,
        maxPersons,
        isWeekConfigured,
    } = calendarData

    const isAdmin = user?.isAdmin
    const canManageSlots = user?.isAdminSalles

    // Modal state - inscription
    const [modalStep, setModalStep] = useState(null)
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [guests, setGuests] = useState([{ odId: '', name: '' }])
    const [inviteOnlyMode, setInviteOnlyMode] = useState(false)

    // Modal choix d'action et liste joueurs
    const [showActionChoice, setShowActionChoice] = useState(false)
    const [showParticipantsList, setShowParticipantsList] = useState(false)
    const [participantsToShow, setParticipantsToShow] = useState([])

    // Modal ouverture creneau
    const [showOpenSlotModal, setShowOpenSlotModal] = useState(false)
    const [slotToOpen, setSlotToOpen] = useState(null)
    const [selectedTarget, setSelectedTarget] = useState('all')
    const [selectedOpenDuration, setSelectedOpenDuration] = useState(1)

    // Valeurs derivees
    const availableDurations = selectedSlotId ? getAvailableDurations(selectedSlotId) : []
    const currentSlotAccepted = selectedSlotId ? getAcceptedParticipantCount(selectedSlotId) : 0
    const isCurrentSlotOverbooked = currentSlotAccepted >= maxPersons

    // Options de vue selon le role
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
        if (!isAdmin || !window.confirm('Supprimer ce créneau de cette semaine ?')) return
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
        if (guests.length < MAX_GUESTS) {
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

    return {
        // Modal inscription
        modalStep,
        selectedSlotId,
        selectedDuration,
        guests,
        inviteOnlyMode,
        availableDurations,
        currentSlotAccepted,
        isCurrentSlotOverbooked,

        // Modal participants
        showParticipantsList,
        participantsToShow,

        // Modal choix d'action
        showActionChoice,

        // Modal ouverture creneau
        showOpenSlotModal,
        slotToOpen,
        selectedTarget,
        selectedOpenDuration,

        // Handlers
        handleSlotClick,
        handleShowParticipants,
        handleOpenInviteModal,
        handleDurationSelect,
        handleModeChoice,
        addGuestField,
        updateGuest,
        removeGuest,
        handleRegister,
        handleUnregister,
        handleAdminDelete,
        handleOpenSlot,
        handleCloseSlot,
        handleDeleteWeekSlot,
        closeModal,
        getViewOptions,

        // Setters exposes pour les composants modaux
        setShowOpenSlotModal,
        setSlotToOpen,
        setSelectedTarget,
        setShowParticipantsList,
        setShowActionChoice,
        setModalStep,
        setSelectedDuration,
        setInviteOnlyMode,
        setSelectedOpenDuration,
    }
}
