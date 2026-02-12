import { useState } from 'react'
import { format } from 'date-fns'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { TIME_SLOTS } from '../components/calendar/calendarUtils'

export function useSlotManagement({ user, selectedDate, slotHelpers, calendarData }) {
    const { addToast } = useToast()
    const confirm = useConfirm()
    const { getSlotIndex, getParticipants } = slotHelpers
    const { loadData, loadOpenedSlots, loadWeekConfig } = calendarData

    const isAdmin = user?.isAdmin
    const canManageSlots = user?.isAdminSalles

    // State
    const [showOpenSlotModal, setShowOpenSlotModal] = useState(false)
    const [slotToOpen, setSlotToOpen] = useState(null)
    const [selectedTarget, setSelectedTarget] = useState('all')
    const [selectedOpenDuration, setSelectedOpenDuration] = useState(1)

    const openSlotModal = (slotId) => {
        setSlotToOpen(slotId)
        setSelectedTarget('all')
        setShowOpenSlotModal(true)
    }

    const handleOpenSlot = async () => {
        if (!slotToOpen || !canManageSlots) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(slotToOpen)
        const openPromises = []
        for (let i = 0; i < selectedOpenDuration; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (slot) {
                openPromises.push(
                    storageService.openSlot(dateStr, slot.id, user.id, selectedTarget)
                )
            }
        }
        try {
            await Promise.all(openPromises)
            setShowOpenSlotModal(false)
            setSlotToOpen(null)
            setSelectedTarget('all')
            setSelectedOpenDuration(1)
            await loadOpenedSlots()
        } catch {
            addToast("Erreur lors de l'ouverture du créneau.", 'error')
        }
    }

    const handleCloseSlot = async (slotId) => {
        if (!canManageSlots) return
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const participants = getParticipants(slotId)
        if (participants.length > 0) {
            const confirmed = await confirm({
                title: 'Fermer le créneau',
                message:
                    `${participants.length} personne(s) inscrite(s) sur ce créneau :\n` +
                    participants.map((p) => `- ${p.name}`).join('\n') +
                    `\n\nVoulez-vous vraiment fermer ce créneau ?\nLeurs réservations seront supprimées.`,
                confirmLabel: 'Fermer',
            })
            if (!confirmed) return
        }
        try {
            if (participants.length > 0) {
                await storageService.deleteReservationsForSlot(dateStr, slotId)
                await loadData()
            }
            await storageService.closeSlot(dateStr, slotId)
            await loadOpenedSlots()
        } catch {
            addToast('Erreur lors de la fermeture du créneau.', 'error')
        }
    }

    const handleDeleteWeekSlot = async (slotId) => {
        if (!isAdmin) return
        const confirmed = await confirm({
            title: 'Supprimer le créneau',
            message: 'Supprimer ce créneau de cette semaine ?',
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return
        try {
            await storageService.deleteWeekSlot(slotId)
            await loadWeekConfig()
        } catch {
            addToast('Erreur lors de la suppression du créneau.', 'error')
        }
    }

    const closeOpenSlotModal = () => setShowOpenSlotModal(false)

    return {
        showOpenSlotModal,
        slotToOpen,
        selectedTarget,
        selectedOpenDuration,
        openSlotModal,
        handleOpenSlot,
        handleCloseSlot,
        handleDeleteWeekSlot,
        closeOpenSlotModal,
        setSelectedTarget,
        setSelectedOpenDuration,
    }
}
