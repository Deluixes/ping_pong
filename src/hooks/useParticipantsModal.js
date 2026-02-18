import { useState } from 'react'
import { storageService } from '../services/storage'

export function useParticipantsModal({ slotHelpers, calendarData }) {
    const { getParticipants } = slotHelpers
    const { approvedMembers } = calendarData

    const [showParticipantsList, setShowParticipantsList] = useState(false)
    const [participantsToShow, setParticipantsToShow] = useState([])

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
    }

    const closeParticipantsModal = () => setShowParticipantsList(false)

    return {
        showParticipantsList,
        participantsToShow,
        handleShowParticipants,
        closeParticipantsModal,
    }
}
