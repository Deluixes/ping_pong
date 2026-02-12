// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock RegistrationContext
const mockRegistration = {
    modalStep: null,
    selectedSlotId: '18:00',
    selectedDate: new Date(2025, 2, 10),
    selectedDuration: null,
    guests: [{ userId: '' }],
    approvedMembers: [],
    inviteOnlyMode: false,
    availableDurations: [
        { value: '30min', label: '30 min', slots: 1 },
        { value: '1h', label: '1 heure', slots: 2 },
    ],
    currentSlotAccepted: 0,
    isCurrentSlotOverbooked: false,
    totalTables: 8,
    isUserParticipating: vi.fn().mockReturnValue(false),
    getParticipants: vi.fn().mockReturnValue([]),
    getEndTime: vi.fn().mockReturnValue('19:00'),
    handleDurationSelect: vi.fn(),
    handleModeChoice: vi.fn(),
    setModalStep: vi.fn(),
    updateGuest: vi.fn(),
    removeGuest: vi.fn(),
    addGuestField: vi.fn(),
    handleRegister: vi.fn(),
    closeModal: vi.fn(),
}

vi.mock('../../../contexts/RegistrationContext', () => ({
    useRegistration: () => mockRegistration,
}))

import RegistrationModal from '../RegistrationModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockRegistration.modalStep = null
})

describe('RegistrationModal', () => {
    it('retourne null si modalStep est null', () => {
        const { container } = render(<RegistrationModal />)
        expect(container.innerHTML).toBe('')
    })

    it("affiche l'étape durée", () => {
        mockRegistration.modalStep = 'duration'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Durée de réservation')).toBeTruthy()
    })

    it('affiche les boutons de durée disponibles', () => {
        mockRegistration.modalStep = 'duration'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('30 min')).toBeTruthy()
        expect(getByText('1 heure')).toBeTruthy()
    })

    it('appelle handleDurationSelect au clic sur une durée', () => {
        mockRegistration.modalStep = 'duration'
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('30 min'))
        expect(mockRegistration.handleDurationSelect).toHaveBeenCalledWith(
            mockRegistration.availableDurations[0]
        )
    })

    it("affiche l'étape choix", () => {
        mockRegistration.modalStep = 'choice'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Type de réservation')).toBeTruthy()
        expect(getByText("S'inscrire")).toBeTruthy()
        expect(getByText('Inviter seulement')).toBeTruthy()
    })

    it('appelle handleModeChoice("register") au clic sur S\'inscrire', () => {
        mockRegistration.modalStep = 'choice'
        const { container } = render(<RegistrationModal />)
        // Le bouton S'inscrire contient le texte dans un sous-élément
        const registerBtn = container.querySelector('[class*="registerBtn"]')
        fireEvent.click(registerBtn)
        expect(mockRegistration.handleModeChoice).toHaveBeenCalledWith('register')
    })

    it('appelle closeModal au clic sur le bouton X', () => {
        mockRegistration.modalStep = 'duration'
        const { container } = render(<RegistrationModal />)
        const closeBtn = container.querySelector('.icon-btn')
        fireEvent.click(closeBtn)
        expect(mockRegistration.closeModal).toHaveBeenCalledTimes(1)
    })

    it("affiche l'étape invités avec le bouton de confirmation", () => {
        mockRegistration.modalStep = 'guests'
        mockRegistration.selectedDuration = { value: '1h', label: '1 heure', slots: 2 }
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Confirmer la réservation')).toBeTruthy()
        expect(getByText('Inviter des membres (optionnel)')).toBeTruthy()
    })

    it("affiche le bouton Retour dans l'étape choix pour revenir à durée", () => {
        mockRegistration.modalStep = 'choice'
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('← Changer la durée'))
        expect(mockRegistration.setModalStep).toHaveBeenCalledWith('duration')
    })

    it('appelle handleRegister au clic sur Confirmer la réservation', () => {
        mockRegistration.modalStep = 'guests'
        mockRegistration.selectedDuration = { value: '1h', label: '1 heure', slots: 2 }
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('✓ Confirmer la réservation'))
        expect(mockRegistration.handleRegister).toHaveBeenCalledTimes(1)
    })
})
