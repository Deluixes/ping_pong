import { useState } from 'react'
import { format } from 'date-fns'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { MAX_GUESTS } from '../constants'
import { TIME_SLOTS, DURATION_OPTIONS } from '../components/calendar/calendarUtils'
import { useSlotManagement } from './useSlotManagement'
import { useParticipantsModal } from './useParticipantsModal'
import { getViewOptions } from './getViewOptions'

export function useRegistrationModal({ user, selectedDate, slotHelpers, calendarData }) {
    const { addToast } = useToast()
    const confirm = useConfirm()
    const {
        getSlotIndex,
        getParticipants,
        getAcceptedParticipantCount,
        isUserParticipating,
        isUserOnSlot,
        getUserRegistration,
        getAvailableDurations,
        getBlockedSlotInfo,
        isSlotAvailable,
        canUserRegister,
    } = slotHelpers

    const { loadData, loadInvitations, maxPersons, isWeekConfigured } = calendarData

    const isAdmin = user?.isAdmin
    const canManageSlots = user?.isAdminSalles

    // ==================== REGISTRATION STATE ====================

    const [modalStep, setModalStep] = useState(null)
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [guests, setGuests] = useState([{ userId: '', name: '' }])
    const [selfRegister, setSelfRegister] = useState(true)

    // Valeurs derivees
    const availableDurations = selectedSlotId ? getAvailableDurations(selectedSlotId) : []
    const currentSlotAccepted = selectedSlotId ? getAcceptedParticipantCount(selectedSlotId) : 0
    const isCurrentSlotOverbooked = currentSlotAccepted >= maxPersons

    // ==================== SUB-HOOKS ====================

    const slotMgmt = useSlotManagement({ user, selectedDate, slotHelpers, calendarData })

    const participantsModal = useParticipantsModal({
        slotHelpers,
        calendarData,
        onStartRegistration: ({ inviteOnly }) => {
            setSelfRegister(!inviteOnly)
            setGuests([{ userId: '', name: '' }])
            setModalStep('registration')
        },
    })

    // ==================== HANDLERS ====================

    const handleSlotClick = (slotId) => {
        const userReg = getUserRegistration(slotId)

        // Déjà inscrit → ActionChoiceModal
        if (userReg) {
            setSelectedSlotId(slotId)
            setSelectedDuration(
                DURATION_OPTIONS.find((d) => d.slots === userReg?.duration) || DURATION_OPTIONS[0]
            )
            participantsModal.setShowActionChoice(true)
            return
        }

        // Invité → désinscription directe
        if (isUserOnSlot(slotId)) {
            handleGuestUnregister(slotId)
            return
        }

        // Créneau non disponible
        const availability = isSlotAvailable(slotId)
        if (!availability.available) {
            if (canManageSlots) {
                slotMgmt.openSlotModal(slotId)
            } else {
                addToast("Ce créneau n'est pas ouvert aux réservations.", 'warning')
            }
            return
        }

        // Licence incompatible
        if (!canUserRegister(slotId)) {
            const { target } = availability
            if (target === 'loisir') {
                addToast('Ce créneau est réservé aux licences Loisir.', 'warning')
            } else if (target === 'competition') {
                addToast('Ce créneau est réservé aux licences Compétition.', 'warning')
            } else if (!user?.licenseType) {
                addToast(
                    "Votre type de licence n'est pas défini. Contactez un administrateur.",
                    'warning'
                )
            } else {
                addToast('Vous ne pouvez pas vous inscrire à ce créneau.', 'warning')
            }
            return
        }

        // Cas normal → pop-up unifié
        setSelectedSlotId(slotId)
        setSelectedDuration(null)
        setSelfRegister(true)
        setGuests([{ userId: '', name: '' }])
        setModalStep('registration')
    }

    const handleGuestUnregister = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            await storageService.removeGuestFromSlot(slotId, dateStr, user.id)
            addToast('Désinscription confirmée.', 'success')
            await loadInvitations()
        } catch {
            addToast('Erreur lors de la désinscription.', 'error')
        }
    }

    const handleDurationSelect = (duration) => {
        setSelectedDuration(duration)
        setModalStep('registration')
    }

    const addGuestField = () => {
        if (guests.length < MAX_GUESTS) {
            setGuests([...guests, { userId: '', name: '' }])
        }
    }

    const updateGuest = (index, userId) => {
        const member = calendarData.approvedMembers.find((m) => m.userId === userId)
        const newGuests = [...guests]
        newGuests[index] = { userId, name: member?.name || '' }
        setGuests(newGuests)
    }

    const removeGuest = (index) => {
        const newGuests = guests.filter((_, i) => i !== index)
        setGuests(newGuests.length > 0 ? newGuests : [{ userId: '', name: '' }])
    }

    const handleRegister = async () => {
        if (!selectedSlotId || !selectedDuration) return

        const validGuests = guests.filter((g) => g.userId)
        if (!selfRegister && validGuests.length === 0) {
            addToast('Cochez "M\'inscrire" ou invitez au moins une personne.', 'warning')
            return
        }

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(selectedSlotId)

        for (let i = 0; i < selectedDuration.slots; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (!slot) continue
            const blockedInfo = getBlockedSlotInfo(slot.id)
            if (blockedInfo && blockedInfo.isBlocking !== false) {
                addToast(
                    `La durée sélectionnée chevauche un créneau bloqué (${blockedInfo.name}). Veuillez réduire la durée.`,
                    'warning'
                )
                return
            }
        }

        const currentAccepted = getAcceptedParticipantCount(selectedSlotId)
        const totalAfter = currentAccepted + (selfRegister ? 1 : 0)
        const isOverbooked = totalAfter > maxPersons

        try {
            const promises = []

            if (selfRegister) {
                for (let i = 0; i < selectedDuration.slots; i++) {
                    const slot = TIME_SLOTS[startIndex + i]
                    if (slot) {
                        promises.push(
                            storageService.registerForSlot(
                                slot.id,
                                dateStr,
                                user.id,
                                user.name,
                                selectedDuration.slots,
                                isOverbooked
                            )
                        )
                    }
                }
            }

            const firstSlot = TIME_SLOTS[startIndex]
            for (const guest of validGuests) {
                promises.push(
                    storageService.inviteToSlot(
                        firstSlot.id,
                        dateStr,
                        guest.userId,
                        guest.name,
                        user.id,
                        selectedDuration.slots
                    )
                )
            }

            await Promise.all(promises)
            closeModal()
            addToast(
                !selfRegister ? 'Invitation(s) envoyée(s).' : 'Inscription confirmée.',
                'success'
            )
            await Promise.all([loadData(), loadInvitations()])
        } catch (error) {
            console.error('Registration error:', error)
            addToast("Erreur lors de l'inscription.", 'error')
        }
    }

    const handleUnregister = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const registration = getUserRegistration(slotId)

            if (registration) {
                const startIndex = getSlotIndex(slotId)
                const duration = registration.duration || 1
                const unregisterPromises = []
                for (let i = 0; i < duration; i++) {
                    const slot = TIME_SLOTS[startIndex + i]
                    if (slot) {
                        unregisterPromises.push(
                            storageService.unregisterFromSlot(slot.id, dateStr, user.id)
                        )
                    }
                }
                await Promise.all(unregisterPromises)
                addToast('Désinscription confirmée.', 'success')
                await loadData()
            } else if (isUserOnSlot(slotId)) {
                await handleGuestUnregister(slotId)
            }
        } catch {
            addToast('Erreur lors de la désinscription.', 'error')
        }
    }

    const handleAdminDelete = async (slotId, participantId, participantName, isGuest) => {
        if (!isAdmin) return
        const confirmed = await confirm({
            title: 'Supprimer',
            message: `Supprimer ${participantName} de ce créneau ?`,
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return

        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            if (isGuest) {
                await storageService.adminDeleteInvitation(slotId, dateStr, participantId)
                await loadInvitations()
            } else {
                await storageService.unregisterFromSlot(slotId, dateStr, participantId)
                await loadData()
            }
            addToast(`${participantName} a été retiré du créneau.`, 'success')
        } catch {
            addToast('Erreur lors de la suppression.', 'error')
        }
    }

    const handleAcceptInvitation = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            await storageService.acceptInvitation(slotId, dateStr, user.id)
            addToast('Invitation acceptée.', 'success')
            await loadInvitations()
        } catch {
            addToast("Erreur lors de l'acceptation.", 'error')
        }
    }

    const handleDeclineInvitation = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            await storageService.declineInvitation(slotId, dateStr, user.id)
            addToast('Invitation refusée.', 'success')
            await loadInvitations()
        } catch {
            addToast('Erreur lors du refus.', 'error')
        }
    }

    const closeModal = () => {
        setModalStep(null)
        setSelectedSlotId(null)
        setSelectedDuration(null)
        setGuests([{ userId: '', name: '' }])
        setSelfRegister(true)
    }

    // ==================== PUBLIC API (identique a l'ancienne) ====================

    return {
        // Modal inscription
        modalStep,
        selectedSlotId,
        selectedDuration,
        guests,
        selfRegister,
        availableDurations,
        currentSlotAccepted,
        isCurrentSlotOverbooked,

        // Modal participants (delegue)
        showParticipantsList: participantsModal.showParticipantsList,
        participantsToShow: participantsModal.participantsToShow,

        // Modal choix d'action (delegue)
        showActionChoice: participantsModal.showActionChoice,

        // Modal ouverture creneau (delegue)
        showOpenSlotModal: slotMgmt.showOpenSlotModal,
        slotToOpen: slotMgmt.slotToOpen,
        selectedTarget: slotMgmt.selectedTarget,
        selectedOpenDuration: slotMgmt.selectedOpenDuration,

        // Handlers
        handleSlotClick,
        handleShowParticipants: participantsModal.handleShowParticipants,
        handleOpenInviteModal: participantsModal.handleOpenInviteModal,
        handleDurationSelect,
        setSelfRegister,
        addGuestField,
        updateGuest,
        removeGuest,
        handleRegister,
        handleUnregister,
        handleAdminDelete,
        handleOpenSlot: slotMgmt.handleOpenSlot,
        handleCloseSlot: slotMgmt.handleCloseSlot,
        handleDeleteWeekSlot: slotMgmt.handleDeleteWeekSlot,
        handleAcceptInvitation,
        handleDeclineInvitation,
        closeModal,
        getViewOptions: () => getViewOptions({ canManageSlots, isAdmin, isWeekConfigured }),

        // Intent-based modal handlers (delegues)
        openRegistrationFromParticipants: participantsModal.openRegistrationFromParticipants,
        openInviteOnlyFromParticipants: participantsModal.openInviteOnlyFromParticipants,
        closeParticipantsModal: participantsModal.closeParticipantsModal,
        closeActionChoiceModal: participantsModal.closeActionChoiceModal,
        closeOpenSlotModal: slotMgmt.closeOpenSlotModal,

        // Setters restants (necessaires pour OpenSlotModal)
        setSelectedTarget: slotMgmt.setSelectedTarget,
        setSelectedOpenDuration: slotMgmt.setSelectedOpenDuration,
        setModalStep,
    }
}
