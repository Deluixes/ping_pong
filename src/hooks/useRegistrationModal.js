import { useState } from 'react'
import { format } from 'date-fns'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
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
        getUserInvitation,
        findInvitationStartSlot,
        getAvailableDurations,
        getBlockedSlotInfo,
        isSlotAvailable,
        canUserRegister,
    } = slotHelpers

    const { loadData, loadWeekInvitations, maxPersons, isWeekConfigured } = calendarData

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
    const isCurrentSlotOverbooked = currentSlotAccepted > maxPersons
    const userInvitation = selectedSlotId ? getUserInvitation(selectedSlotId) : null
    const isModifying = selectedSlotId
        ? !!(
              getUserRegistration(selectedSlotId) ||
              (userInvitation && userInvitation.status === 'accepted')
          )
        : false
    const isInvited = !!userInvitation && userInvitation.status === 'pending'

    // ==================== SUB-HOOKS ====================

    const slotMgmt = useSlotManagement({ user, selectedDate, slotHelpers, calendarData })

    const participantsModal = useParticipantsModal({
        slotHelpers,
        calendarData,
        user,
    })

    // ==================== HELPERS ====================

    const findStartSlot = (slotId) => {
        const reg = getUserRegistration(slotId)
        if (!reg) return { startIndex: getSlotIndex(slotId), duration: 1 }
        const clickedIndex = getSlotIndex(slotId)
        const duration = reg.duration || 1
        let startIndex = clickedIndex
        for (let i = 1; i < duration; i++) {
            const prevSlot = TIME_SLOTS[clickedIndex - i]
            if (!prevSlot) break
            const prevReg = getUserRegistration(prevSlot.id)
            // Vérifier que c'est le même bloc (même durée)
            if (prevReg && prevReg.duration === duration) {
                startIndex = clickedIndex - i
            } else {
                break
            }
        }
        return { startIndex, duration }
    }

    // ==================== HANDLERS ====================

    const handleSlotClick = (slotId, { fromInfo = false } = {}) => {
        const userReg = getUserRegistration(slotId)

        // Déjà inscrit → pop-up unifié en mode modification
        if (userReg) {
            const { startIndex, duration } = findStartSlot(slotId)
            setSelectedSlotId(TIME_SLOTS[startIndex].id)
            setSelectedDuration(
                DURATION_OPTIONS.find((d) => d.slots === duration) || DURATION_OPTIONS[0]
            )
            setSelfRegister(true)
            setGuests([{ userId: '', name: '' }])
            setModalStep('registration')
            return
        }

        // Créneau non disponible
        const availability = isSlotAvailable(slotId)
        if (!availability.available && !fromInfo) {
            if (canManageSlots) {
                slotMgmt.openSlotModal(slotId)
            } else {
                addToast("Ce créneau n'est pas ouvert aux réservations.", 'warning')
            }
            return
        }

        // Licence incompatible (ne bloque pas le clic info)
        if (!canUserRegister(slotId) && !fromInfo) {
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
        const userIsInvited = isUserOnSlot(slotId) && !getUserRegistration(slotId)
        setSelectedSlotId(slotId)
        setSelectedDuration(null)
        setSelfRegister(!userIsInvited)
        setGuests([{ userId: '', name: '' }])
        setModalStep('registration')
    }

    const handleGuestUnregister = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const result = await storageService.removeGuestFromSlot(slotId, dateStr, user.id)
            if (!result.success) {
                addToast('Erreur lors de la désinscription.', 'error')
                return
            }
            addToast('Désinscription confirmée.', 'success')
            await Promise.all([loadData(), loadWeekInvitations()])
        } catch {
            addToast('Erreur lors de la désinscription.', 'error')
        }
    }

    const handleDurationSelect = (duration) => {
        setSelectedDuration(duration)
        setModalStep('registration')
    }

    const addGuestField = () => {
        setGuests([...guests, { userId: '', name: '' }])
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

        // Vérifier l'overbooking sur TOUS les slots de la durée sélectionnée
        let maxAccepted = 0
        for (let i = 0; i < selectedDuration.slots; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (slot) {
                const slotAccepted = getAcceptedParticipantCount(slot.id)
                if (slotAccepted > maxAccepted) maxAccepted = slotAccepted
            }
        }
        const totalAfter = maxAccepted + (selfRegister ? 1 : 0)
        const isOverbooked = totalAfter > maxPersons

        try {
            const promises = []

            if (selfRegister && !isModifying && !isInvited) {
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
                !selfRegister || isModifying
                    ? 'Invitation(s) envoyée(s).'
                    : 'Inscription confirmée.',
                'success'
            )
            await Promise.all([loadData(), loadWeekInvitations()])
        } catch (error) {
            console.error('Registration error:', error)
            addToast("Erreur lors de l'inscription.", 'error')
        }
    }

    const handleUnregister = async (slotId) => {
        const confirmed = await confirm({
            title: 'Se désinscrire',
            message: 'Voulez-vous vraiment vous désinscrire de ce créneau ?',
            confirmLabel: 'Se désinscrire',
        })
        if (!confirmed) return

        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const registration = getUserRegistration(slotId)

            if (registration) {
                const { startIndex, duration } = findStartSlot(slotId)
                const clickedIndex = getSlotIndex(slotId)
                const positionInSequence = clickedIndex - startIndex
                const promises = []

                if (positionInSequence === 0 && duration > 1) {
                    // Premier slot d'une inscription multi-créneaux → supprimer uniquement celui-ci
                    promises.push(storageService.unregisterFromSlot(slotId, dateStr, user.id))
                    // Mettre à jour la durée des slots restants
                    const newDuration = duration - 1
                    for (let i = 1; i < duration; i++) {
                        const slot = TIME_SLOTS[startIndex + i]
                        if (slot) {
                            promises.push(
                                storageService.updateSlotDuration(
                                    slot.id,
                                    dateStr,
                                    user.id,
                                    newDuration
                                )
                            )
                        }
                    }
                } else if (positionInSequence > 0) {
                    // Slot intermédiaire ou dernier → supprimer celui-ci et tous ceux après
                    for (let i = positionInSequence; i < duration; i++) {
                        const slot = TIME_SLOTS[startIndex + i]
                        if (slot) {
                            promises.push(
                                storageService.unregisterFromSlot(slot.id, dateStr, user.id)
                            )
                        }
                    }
                    // Mettre à jour la durée des slots qui restent avant
                    const newDuration = positionInSequence
                    for (let i = 0; i < positionInSequence; i++) {
                        const slot = TIME_SLOTS[startIndex + i]
                        if (slot) {
                            promises.push(
                                storageService.updateSlotDuration(
                                    slot.id,
                                    dateStr,
                                    user.id,
                                    newDuration
                                )
                            )
                        }
                    }
                } else {
                    // Inscription sur un seul créneau → supprimer tout
                    promises.push(storageService.unregisterFromSlot(slotId, dateStr, user.id))
                }

                await Promise.all(promises)
                closeModal()
                addToast('Désinscription confirmée.', 'success')
                await loadData()
            } else if (isUserOnSlot(slotId)) {
                const invStart = findInvitationStartSlot(slotId)
                if (!invStart || invStart.duration <= 1) {
                    // Invitation simple → supprimer
                    await handleGuestUnregister(invStart ? invStart.startSlotId : slotId)
                } else {
                    // Invitation multi-slots → logique partielle
                    const clickedIndex = getSlotIndex(slotId)
                    const positionInSequence = clickedIndex - invStart.startIndex

                    if (positionInSequence === 0) {
                        // Premier slot → décaler le start et réduire la durée
                        const newStartSlot = TIME_SLOTS[invStart.startIndex + 1]
                        const newDuration = invStart.duration - 1
                        await storageService.updateInvitation(
                            invStart.startSlotId,
                            dateStr,
                            user.id,
                            { slot_id: newStartSlot.id, duration: newDuration }
                        )
                    } else {
                        // Slot intermédiaire ou dernier → réduire la durée
                        const newDuration = positionInSequence
                        await storageService.updateInvitation(
                            invStart.startSlotId,
                            dateStr,
                            user.id,
                            { duration: newDuration }
                        )
                    }
                    closeModal()
                    addToast('Désinscription confirmée.', 'success')
                    await Promise.all([loadData(), loadWeekInvitations()])
                }
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
                await loadWeekInvitations()
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
            const invStart = findInvitationStartSlot(slotId)
            const realSlotId = invStart ? invStart.startSlotId : slotId
            const result = await storageService.acceptInvitation(realSlotId, dateStr, user.id)
            if (!result.success) {
                addToast("Erreur lors de l'acceptation.", 'error')
                return
            }
            addToast('Invitation acceptée.', 'success')
            await Promise.all([loadData(), loadWeekInvitations()])
        } catch {
            addToast("Erreur lors de l'acceptation.", 'error')
        }
    }

    const handleDeclineInvitation = async (slotId) => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const invStart = findInvitationStartSlot(slotId)
            const realSlotId = invStart ? invStart.startSlotId : slotId
            const result = await storageService.declineInvitation(realSlotId, dateStr, user.id)
            if (!result.success) {
                addToast('Erreur lors du refus.', 'error')
                return
            }
            addToast('Invitation refusée.', 'success')
            await Promise.all([loadData(), loadWeekInvitations()])
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
        isModifying,
        isInvited,
        availableDurations,
        currentSlotAccepted,
        isCurrentSlotOverbooked,

        // Modal participants (delegue)
        showParticipantsList: participantsModal.showParticipantsList,
        participantsToShow: participantsModal.participantsToShow,

        // Modal ouverture creneau (delegue)
        showOpenSlotModal: slotMgmt.showOpenSlotModal,
        slotToOpen: slotMgmt.slotToOpen,
        selectedTarget: slotMgmt.selectedTarget,
        selectedOpenDuration: slotMgmt.selectedOpenDuration,

        // Handlers
        handleSlotClick,
        handleShowParticipants: participantsModal.handleShowParticipants,
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
        closeParticipantsModal: participantsModal.closeParticipantsModal,
        closeOpenSlotModal: slotMgmt.closeOpenSlotModal,

        // Setters restants (necessaires pour OpenSlotModal)
        setSelectedTarget: slotMgmt.setSelectedTarget,
        setSelectedOpenDuration: slotMgmt.setSelectedOpenDuration,
        setModalStep,
    }
}
