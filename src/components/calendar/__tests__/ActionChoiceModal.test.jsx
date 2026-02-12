// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock RegistrationContext
const mockRegistration = {
    showActionChoice: false,
    selectedSlotId: '18:00',
    selectedDate: new Date(2025, 2, 10),
    handleShowParticipants: vi.fn(),
    handleOpenInviteModal: vi.fn(),
    closeActionChoiceModal: vi.fn(),
}

vi.mock('../../../contexts/RegistrationContext', () => ({
    useRegistration: () => mockRegistration,
}))

import ActionChoiceModal from '../ActionChoiceModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockRegistration.showActionChoice = false
})

describe('ActionChoiceModal', () => {
    it('retourne null si showActionChoice est false', () => {
        const { container } = render(<ActionChoiceModal />)
        expect(container.innerHTML).toBe('')
    })

    it('affiche les boutons quand showActionChoice est true', () => {
        mockRegistration.showActionChoice = true
        const { getByText } = render(<ActionChoiceModal />)
        expect(getByText('Voir les joueurs')).toBeTruthy()
        expect(getByText("Modifier l'inscription")).toBeTruthy()
        expect(getByText('Annuler')).toBeTruthy()
    })

    it('affiche le créneau sélectionné', () => {
        mockRegistration.showActionChoice = true
        const { getByText } = render(<ActionChoiceModal />)
        expect(getByText('Créneau de 18:00')).toBeTruthy()
    })

    it('appelle handleShowParticipants au clic sur Voir les joueurs', () => {
        mockRegistration.showActionChoice = true
        const { getByText } = render(<ActionChoiceModal />)
        fireEvent.click(getByText('Voir les joueurs'))
        expect(mockRegistration.handleShowParticipants).toHaveBeenCalledWith('18:00')
    })

    it("appelle handleOpenInviteModal au clic sur Modifier l'inscription", () => {
        mockRegistration.showActionChoice = true
        const { getByText } = render(<ActionChoiceModal />)
        fireEvent.click(getByText("Modifier l'inscription"))
        expect(mockRegistration.handleOpenInviteModal).toHaveBeenCalledTimes(1)
    })

    it('appelle closeActionChoiceModal au clic sur Annuler', () => {
        mockRegistration.showActionChoice = true
        const { getByText } = render(<ActionChoiceModal />)
        fireEvent.click(getByText('Annuler'))
        expect(mockRegistration.closeActionChoiceModal).toHaveBeenCalledTimes(1)
    })
})
