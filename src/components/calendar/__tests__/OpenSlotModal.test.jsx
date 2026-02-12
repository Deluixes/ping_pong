// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock RegistrationContext
const mockRegistration = {
    showOpenSlotModal: false,
    slotToOpen: null,
    selectedDate: new Date(2025, 2, 10),
    selectedTarget: 'all',
    selectedOpenDuration: 1,
    getEndTime: vi.fn().mockReturnValue('19:00'),
    getAvailableOpenDurations: vi.fn().mockReturnValue([
        { value: '30min', label: '30 min', slots: 1 },
        { value: '1h', label: '1 heure', slots: 2 },
    ]),
    setSelectedTarget: vi.fn(),
    setSelectedOpenDuration: vi.fn(),
    handleOpenSlot: vi.fn(),
    closeOpenSlotModal: vi.fn(),
}

vi.mock('../../../contexts/RegistrationContext', () => ({
    useRegistration: () => mockRegistration,
}))

import OpenSlotModal from '../OpenSlotModal'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockRegistration.showOpenSlotModal = false
    mockRegistration.slotToOpen = null
})

describe('OpenSlotModal', () => {
    it('retourne null si showOpenSlotModal est false', () => {
        const { container } = render(<OpenSlotModal />)
        expect(container.innerHTML).toBe('')
    })

    it('retourne null si slotToOpen est null', () => {
        mockRegistration.showOpenSlotModal = true
        const { container } = render(<OpenSlotModal />)
        expect(container.innerHTML).toBe('')
    })

    it('affiche le modal avec le titre', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { getByText } = render(<OpenSlotModal />)
        expect(getByText('Ouvrir des créneaux')).toBeTruthy()
    })

    it('affiche les options de cible (Tous, Loisir, Compétition)', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { getByText } = render(<OpenSlotModal />)
        expect(getByText('Tous les membres')).toBeTruthy()
        expect(getByText('Loisir uniquement')).toBeTruthy()
        expect(getByText('Compétition uniquement')).toBeTruthy()
    })

    it('affiche les durées disponibles', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { getByText } = render(<OpenSlotModal />)
        expect(getByText('30 min')).toBeTruthy()
        expect(getByText('1 heure')).toBeTruthy()
    })

    it('appelle handleOpenSlot au clic sur Ouvrir', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { container } = render(<OpenSlotModal />)
        const confirmBtn = container.querySelector('[class*="confirmBtn"]')
        fireEvent.click(confirmBtn)
        expect(mockRegistration.handleOpenSlot).toHaveBeenCalledTimes(1)
    })

    it('appelle closeOpenSlotModal au clic sur Annuler', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { getByText } = render(<OpenSlotModal />)
        fireEvent.click(getByText('Annuler'))
        expect(mockRegistration.closeOpenSlotModal).toHaveBeenCalledTimes(1)
    })

    it('appelle setSelectedOpenDuration au clic sur une durée', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { getByText } = render(<OpenSlotModal />)
        fireEvent.click(getByText('1 heure'))
        expect(mockRegistration.setSelectedOpenDuration).toHaveBeenCalledWith(2)
    })

    it('appelle setSelectedTarget au clic sur une option de cible', () => {
        mockRegistration.showOpenSlotModal = true
        mockRegistration.slotToOpen = '18:00'
        const { container } = render(<OpenSlotModal />)
        // Les radios ont name="target" et value="loisir"
        const loisirRadio = container.querySelector('input[value="loisir"]')
        fireEvent.click(loisirRadio)
        expect(mockRegistration.setSelectedTarget).toHaveBeenCalledWith('loisir')
    })
})
