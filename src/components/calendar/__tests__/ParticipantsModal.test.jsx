// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock RegistrationContext
const mockRegistration = {
    showParticipantsList: false,
    selectedSlotId: '18:00',
    selectedDate: new Date(2025, 2, 10),
    participantsToShow: [],
    getUserRegistration: vi.fn().mockReturnValue(null),
    isUserOnSlot: vi.fn().mockReturnValue(false),
    openRegistrationFromParticipants: vi.fn(),
    openInviteOnlyFromParticipants: vi.fn(),
    closeParticipantsModal: vi.fn(),
}

vi.mock('../../../contexts/RegistrationContext', () => ({
    useRegistration: () => mockRegistration,
}))

import ParticipantsModal from '../ParticipantsModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockRegistration.showParticipantsList = false
    mockRegistration.participantsToShow = []
    mockRegistration.getUserRegistration.mockReturnValue(null)
    mockRegistration.isUserOnSlot.mockReturnValue(false)
})

describe('ParticipantsModal', () => {
    it('retourne null si showParticipantsList est false', () => {
        const { container } = render(<ParticipantsModal />)
        expect(container.innerHTML).toBe('')
    })

    it('affiche le titre quand visible', () => {
        mockRegistration.showParticipantsList = true
        const { getByText } = render(<ParticipantsModal />)
        expect(getByText('Joueurs sur ce créneau')).toBeTruthy()
    })

    it('affiche les participants', () => {
        mockRegistration.showParticipantsList = true
        mockRegistration.participantsToShow = [
            { id: '1', name: 'Alice', status: 'accepted', licenseType: 'Loisir' },
            { id: '2', name: 'Bob', status: 'accepted', licenseType: 'Compétition' },
        ]
        const { getByText } = render(<ParticipantsModal />)
        expect(getByText('Alice')).toBeTruthy()
        expect(getByText('Bob')).toBeTruthy()
    })

    it("affiche 'Aucun joueur' si liste vide", () => {
        mockRegistration.showParticipantsList = true
        const { getByText } = render(<ParticipantsModal />)
        expect(getByText('Aucun joueur sur ce créneau')).toBeTruthy()
    })

    it("affiche S'inscrire et Inviter si l'utilisateur n'est pas inscrit", () => {
        mockRegistration.showParticipantsList = true
        const { getByText } = render(<ParticipantsModal />)
        expect(getByText("S'inscrire")).toBeTruthy()
        expect(getByText('Inviter seulement')).toBeTruthy()
    })

    it("n'affiche pas S'inscrire si l'utilisateur est déjà inscrit", () => {
        mockRegistration.showParticipantsList = true
        mockRegistration.getUserRegistration.mockReturnValue({ id: '1' })
        const { queryByText } = render(<ParticipantsModal />)
        expect(queryByText("S'inscrire")).toBeNull()
    })

    it('appelle closeParticipantsModal au clic sur Fermer', () => {
        mockRegistration.showParticipantsList = true
        const { getByText } = render(<ParticipantsModal />)
        fireEvent.click(getByText('Fermer'))
        expect(mockRegistration.closeParticipantsModal).toHaveBeenCalledTimes(1)
    })

    it("appelle openRegistrationFromParticipants au clic sur S'inscrire", () => {
        mockRegistration.showParticipantsList = true
        const { getByText } = render(<ParticipantsModal />)
        fireEvent.click(getByText("S'inscrire"))
        expect(mockRegistration.openRegistrationFromParticipants).toHaveBeenCalledTimes(1)
    })

    it('affiche le statut (en attente) pour les invitations pending', () => {
        mockRegistration.showParticipantsList = true
        mockRegistration.participantsToShow = [{ id: '1', name: 'Claire', status: 'pending' }]
        const { getByText } = render(<ParticipantsModal />)
        expect(getByText('(en attente)')).toBeTruthy()
    })
})
