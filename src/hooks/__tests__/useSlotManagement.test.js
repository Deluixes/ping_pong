// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TIME_SLOTS } from '../../components/calendar/calendarUtils'

// ==================== MOCKS ====================

const mockStorageService = {
    openSlot: vi.fn().mockResolvedValue({ success: true }),
    closeSlot: vi.fn().mockResolvedValue({ success: true }),
    deleteReservationsForSlot: vi.fn().mockResolvedValue({ success: true }),
    deleteWeekSlot: vi.fn().mockResolvedValue({ success: true }),
}

vi.mock('../../services/storage', () => ({
    storageService: {
        openSlot: (...args) => mockStorageService.openSlot(...args),
        closeSlot: (...args) => mockStorageService.closeSlot(...args),
        deleteReservationsForSlot: (...args) =>
            mockStorageService.deleteReservationsForSlot(...args),
        deleteWeekSlot: (...args) => mockStorageService.deleteWeekSlot(...args),
    },
}))

const mockAddToast = vi.fn()
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}))

const mockConfirm = vi.fn().mockResolvedValue(true)
vi.mock('../../contexts/ConfirmContext', () => ({
    useConfirm: () => mockConfirm,
}))

import { useSlotManagement } from '../useSlotManagement'

// ==================== HELPERS ====================

const TODAY = new Date('2025-01-06')

function createProps(overrides = {}) {
    return {
        user: { id: 'u1', isAdmin: true, isAdminSalles: true },
        selectedDate: TODAY,
        slotHelpers: {
            getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
            getParticipants: vi.fn(() => []),
            ...overrides.slotHelpers,
        },
        calendarData: {
            loadData: vi.fn().mockResolvedValue(undefined),
            loadWeekOpenedSlots: vi.fn().mockResolvedValue(undefined),
            loadWeekConfig: vi.fn().mockResolvedValue(undefined),
            ...overrides.calendarData,
        },
        ...overrides,
    }
}

function renderSlotMgmt(overrides = {}) {
    const props = createProps(overrides)
    const { result } = renderHook(() => useSlotManagement(props))
    return { result, props }
}

// ==================== SETUP ====================

beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
})

// ==================== openSlotModal ====================

describe('openSlotModal', () => {
    it("ouvre le modal avec le slotId et target='all' par défaut", () => {
        const { result } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
        })

        expect(result.current.showOpenSlotModal).toBe(true)
        expect(result.current.slotToOpen).toBe('10:00')
        expect(result.current.selectedTarget).toBe('all')
    })
})

// ==================== handleOpenSlot ====================

describe('handleOpenSlot', () => {
    it('ne fait rien si pas de slotToOpen', async () => {
        const { result } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockStorageService.openSlot).not.toHaveBeenCalled()
    })

    it("ne fait rien si l'utilisateur n'est pas adminSalles", async () => {
        const { result } = renderSlotMgmt({
            user: { id: 'u1', isAdmin: false, isAdminSalles: false },
        })

        act(() => {
            result.current.openSlotModal('10:00')
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockStorageService.openSlot).not.toHaveBeenCalled()
    })

    it('ouvre un seul slot quand selectedOpenDuration est 1', async () => {
        const { result } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockStorageService.openSlot).toHaveBeenCalledTimes(1)
        expect(mockStorageService.openSlot).toHaveBeenCalledWith('2025-01-06', '10:00', 'u1', 'all')
    })

    it('ouvre N slots consécutifs selon la durée', async () => {
        const { result } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
            result.current.setSelectedOpenDuration(3)
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockStorageService.openSlot).toHaveBeenCalledTimes(3)
        expect(mockStorageService.openSlot).toHaveBeenCalledWith('2025-01-06', '10:00', 'u1', 'all')
        expect(mockStorageService.openSlot).toHaveBeenCalledWith('2025-01-06', '10:30', 'u1', 'all')
        expect(mockStorageService.openSlot).toHaveBeenCalledWith('2025-01-06', '11:00', 'u1', 'all')
    })

    it('utilise le target sélectionné', async () => {
        const { result } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
            result.current.setSelectedTarget('loisir')
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockStorageService.openSlot).toHaveBeenCalledWith(
            '2025-01-06',
            '10:00',
            'u1',
            'loisir'
        )
    })

    it("réinitialise l'état et recharge après succès", async () => {
        const { result, props } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(result.current.showOpenSlotModal).toBe(false)
        expect(result.current.slotToOpen).toBe(null)
        expect(result.current.selectedTarget).toBe('all')
        expect(result.current.selectedOpenDuration).toBe(1)
        expect(props.calendarData.loadWeekOpenedSlots).toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.openSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderSlotMgmt()

        act(() => {
            result.current.openSlotModal('10:00')
        })

        await act(async () => {
            await result.current.handleOpenSlot()
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})

// ==================== handleCloseSlot ====================

describe('handleCloseSlot', () => {
    it("ne fait rien si l'utilisateur n'est pas adminSalles", async () => {
        const { result } = renderSlotMgmt({
            user: { id: 'u1', isAdmin: false, isAdminSalles: false },
        })

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockStorageService.closeSlot).not.toHaveBeenCalled()
    })

    it('ferme directement si aucun participant', async () => {
        const { result, props } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockConfirm).not.toHaveBeenCalled()
        expect(mockStorageService.closeSlot).toHaveBeenCalledWith('2025-01-06', '10:00')
        expect(props.calendarData.loadWeekOpenedSlots).toHaveBeenCalled()
    })

    it('demande confirmation si des participants existent', async () => {
        const { result } = renderSlotMgmt({
            slotHelpers: {
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getParticipants: vi.fn(() => [{ name: 'Alice' }, { name: 'Bob' }]),
            },
        })

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Fermer le créneau',
                message: expect.stringContaining('Alice'),
            })
        )
    })

    it('supprime les réservations puis ferme si confirmé', async () => {
        const { result, props } = renderSlotMgmt({
            slotHelpers: {
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getParticipants: vi.fn(() => [{ name: 'Alice' }]),
            },
        })

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockStorageService.deleteReservationsForSlot).toHaveBeenCalledWith(
            '2025-01-06',
            '10:00'
        )
        expect(props.calendarData.loadData).toHaveBeenCalled()
        expect(mockStorageService.closeSlot).toHaveBeenCalledWith('2025-01-06', '10:00')
    })

    it('ne ferme pas si confirmation refusée', async () => {
        mockConfirm.mockResolvedValueOnce(false)
        const { result } = renderSlotMgmt({
            slotHelpers: {
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getParticipants: vi.fn(() => [{ name: 'Alice' }]),
            },
        })

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockStorageService.closeSlot).not.toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.closeSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleCloseSlot('10:00')
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})

// ==================== handleDeleteWeekSlot ====================

describe('handleDeleteWeekSlot', () => {
    it("ne fait rien si l'utilisateur n'est pas admin", async () => {
        const { result } = renderSlotMgmt({
            user: { id: 'u1', isAdmin: false, isAdminSalles: true },
        })

        await act(async () => {
            await result.current.handleDeleteWeekSlot('slot-1')
        })

        expect(mockConfirm).not.toHaveBeenCalled()
        expect(mockStorageService.deleteWeekSlot).not.toHaveBeenCalled()
    })

    it('supprime si confirmé', async () => {
        const { result, props } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleDeleteWeekSlot('slot-1')
        })

        expect(mockConfirm).toHaveBeenCalled()
        expect(mockStorageService.deleteWeekSlot).toHaveBeenCalledWith('slot-1')
        expect(props.calendarData.loadWeekConfig).toHaveBeenCalled()
    })

    it('ne supprime pas si confirmation refusée', async () => {
        mockConfirm.mockResolvedValueOnce(false)
        const { result } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleDeleteWeekSlot('slot-1')
        })

        expect(mockStorageService.deleteWeekSlot).not.toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.deleteWeekSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderSlotMgmt()

        await act(async () => {
            await result.current.handleDeleteWeekSlot('slot-1')
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})
