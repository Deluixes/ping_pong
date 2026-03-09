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
    selfRegister: true,
    isModifying: false,
    isInvited: false,
    availableDurations: [
        { value: '30min', label: '30 min', slots: 1 },
        { value: '1h', label: '1 heure', slots: 2 },
    ],
    currentSlotAccepted: 0,
    isCurrentSlotOverbooked: false,
    totalTables: 8,
    getParticipants: vi.fn().mockReturnValue([]),
    getEndTime: vi.fn().mockReturnValue('19:00'),
    handleDurationSelect: vi.fn(),
    handleShowParticipants: vi.fn(),
    handleUnregister: vi.fn(),
    setSelfRegister: vi.fn(),
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
    mockRegistration.selectedDuration = null
    mockRegistration.selfRegister = true
    mockRegistration.isModifying = false
    mockRegistration.isInvited = false
})

describe('RegistrationModal', () => {
    it('retourne null si modalStep est null', () => {
        const { container } = render(<RegistrationModal />)
        expect(container.innerHTML).toBe('')
    })

    it('affiche le sous-modal de sélection de durée', () => {
        mockRegistration.modalStep = 'duration-picker'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Choisir la durée')).toBeTruthy()
    })

    it('affiche les boutons de durée disponibles', () => {
        mockRegistration.modalStep = 'duration-picker'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('30 min')).toBeTruthy()
        expect(getByText('1 heure')).toBeTruthy()
    })

    it('appelle handleDurationSelect au clic sur une durée', () => {
        mockRegistration.modalStep = 'duration-picker'
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('30 min'))
        expect(mockRegistration.handleDurationSelect).toHaveBeenCalledWith(
            mockRegistration.availableDurations[0]
        )
    })

    it("affiche le modal d'inscription unifié", () => {
        mockRegistration.modalStep = 'registration'
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Inscription')).toBeTruthy()
        expect(getByText('Choisir la durée...')).toBeTruthy()
    })

    it('appelle closeModal au clic sur le bouton X', () => {
        mockRegistration.modalStep = 'registration'
        const { container } = render(<RegistrationModal />)
        const closeBtn = container.querySelector('.icon-btn')
        fireEvent.click(closeBtn)
        expect(mockRegistration.closeModal).toHaveBeenCalledTimes(1)
    })

    it('affiche le bouton Confirmer quand durée et selfRegister sont remplis', () => {
        mockRegistration.modalStep = 'registration'
        mockRegistration.selectedDuration = { value: '1h', label: '1 heure', slots: 2 }
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Confirmer')).toBeTruthy()
    })

    it('appelle handleRegister au clic sur Confirmer', () => {
        mockRegistration.modalStep = 'registration'
        mockRegistration.selectedDuration = { value: '1h', label: '1 heure', slots: 2 }
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('Confirmer'))
        expect(mockRegistration.handleRegister).toHaveBeenCalledTimes(1)
    })

    it("affiche 'Modifier l'inscription' en mode modification", () => {
        mockRegistration.modalStep = 'registration'
        mockRegistration.isModifying = true
        const { getByText } = render(<RegistrationModal />)
        expect(getByText("Modifier l'inscription")).toBeTruthy()
        expect(getByText('Vous êtes inscrit(e)')).toBeTruthy()
    })

    it("affiche le message d'invitation en mode invité", () => {
        mockRegistration.modalStep = 'registration'
        mockRegistration.isInvited = true
        const { getByText } = render(<RegistrationModal />)
        expect(getByText('Vous êtes invité(e) sur ce créneau')).toBeTruthy()
    })

    it('ouvre le duration-picker au clic sur le sélecteur de durée', () => {
        mockRegistration.modalStep = 'registration'
        const { getByText } = render(<RegistrationModal />)
        fireEvent.click(getByText('Choisir la durée...'))
        expect(mockRegistration.setModalStep).toHaveBeenCalledWith('duration-picker')
    })
})
