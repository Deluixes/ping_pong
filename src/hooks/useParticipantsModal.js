import { useState } from 'react'
import { storageService } from '../services/storage'

export function useParticipantsModal({ slotHelpers, calendarData, onStartRegistration }) {
    const { getParticipants } = slotHelpers
    const { approvedMembers } = calendarData

    const [showActionChoice, setShowActionChoice] = useState(false)
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
        setShowActionChoice(false)
    }

    const handleOpenInviteModal = () => {
        setShowActionChoice(false)
        onStartRegistration({ inviteOnly: false })
    }

    const openRegistrationFromParticipants = () => {
        setShowParticipantsList(false)
        onStartRegistration({ inviteOnly: false })
    }

    const openInviteOnlyFromParticipants = () => {
        setShowParticipantsList(false)
        onStartRegistration({ inviteOnly: true })
    }

    const closeParticipantsModal = () => setShowParticipantsList(false)
    const closeActionChoiceModal = () => setShowActionChoice(false)

    return {
        showActionChoice,
        setShowActionChoice,
        showParticipantsList,
        participantsToShow,
        handleShowParticipants,
        handleOpenInviteModal,
        openRegistrationFromParticipants,
        openInviteOnlyFromParticipants,
        closeParticipantsModal,
        closeActionChoiceModal,
    }
}
