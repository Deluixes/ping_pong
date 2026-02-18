// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TIME_SLOTS, DURATION_OPTIONS } from '../../components/calendar/calendarUtils'

// ==================== MOCKS ====================

const mockStorageService = {
    registerForSlot: vi.fn().mockResolvedValue({ success: true }),
    inviteToSlot: vi.fn().mockResolvedValue({ success: true }),
    unregisterFromSlot: vi.fn().mockResolvedValue({ success: true }),
    updateSlotDuration: vi.fn().mockResolvedValue({ success: true }),
    removeGuestFromSlot: vi.fn().mockResolvedValue({ success: true }),
    adminDeleteInvitation: vi.fn().mockResolvedValue({ success: true }),
}

vi.mock('../../services/storage', () => ({
    storageService: {
        registerForSlot: (...args) => mockStorageService.registerForSlot(...args),
        inviteToSlot: (...args) => mockStorageService.inviteToSlot(...args),
        unregisterFromSlot: (...args) => mockStorageService.unregisterFromSlot(...args),
        updateSlotDuration: (...args) => mockStorageService.updateSlotDuration(...args),
        removeGuestFromSlot: (...args) => mockStorageService.removeGuestFromSlot(...args),
        adminDeleteInvitation: (...args) => mockStorageService.adminDeleteInvitation(...args),
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

// Mock sub-hooks
const mockSlotMgmt = {
    showOpenSlotModal: false,
    slotToOpen: null,
    selectedTarget: 'all',
    selectedOpenDuration: 1,
    openSlotModal: vi.fn(),
    handleOpenSlot: vi.fn(),
    handleCloseSlot: vi.fn(),
    handleDeleteWeekSlot: vi.fn(),
    closeOpenSlotModal: vi.fn(),
    setSelectedTarget: vi.fn(),
    setSelectedOpenDuration: vi.fn(),
}
vi.mock('../useSlotManagement', () => ({
    useSlotManagement: () => mockSlotMgmt,
}))

const mockParticipantsModal = {
    showParticipantsList: false,
    participantsToShow: [],
    handleShowParticipants: vi.fn(),
    closeParticipantsModal: vi.fn(),
}
vi.mock('../useParticipantsModal', () => ({
    useParticipantsModal: () => mockParticipantsModal,
}))

import { useRegistrationModal } from '../useRegistrationModal'

// ==================== HELPERS ====================

const TODAY = new Date('2025-01-06')
const DURATION_1H = DURATION_OPTIONS.find((d) => d.slots === 2) // 1h = 2 slots

function createProps(overrides = {}) {
    return {
        user: { id: 'u1', name: 'Alice', isAdmin: false, isAdminSalles: false, licenseType: 'L' },
        selectedDate: TODAY,
        slotHelpers: {
            getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
            getParticipants: vi.fn(() => []),
            getAcceptedParticipantCount: vi.fn(() => 0),
            isUserParticipating: vi.fn(() => false),
            isUserOnSlot: vi.fn(() => false),
            getUserRegistration: vi.fn(() => undefined),
            getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
            getBlockedSlotInfo: vi.fn(() => undefined),
            isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
            canUserRegister: vi.fn(() => true),
            ...overrides.slotHelpers,
        },
        calendarData: {
            loadData: vi.fn().mockResolvedValue(undefined),
            loadWeekInvitations: vi.fn().mockResolvedValue(undefined),
            maxPersons: 16,
            isWeekConfigured: true,
            approvedMembers: [
                { userId: 'u2', name: 'Bob' },
                { userId: 'u3', name: 'Charlie' },
            ],
            ...overrides.calendarData,
        },
        ...overrides,
    }
}

function renderModal(overrides = {}) {
    const props = createProps(overrides)
    const { result } = renderHook(() => useRegistrationModal(props))
    return { result, props }
}

// ==================== SETUP ====================

beforeEach(() => {
    vi.clearAllMocks()
    mockConfirm.mockResolvedValue(true)
})

// ==================== handleSlotClick ====================

describe('handleSlotClick', () => {
    describe('utilisateur déjà inscrit', () => {
        it('ouvre le modal unifié en mode modification', () => {
            const { result } = renderModal({
                slotHelpers: {
                    getUserRegistration: vi.fn(() => ({ duration: 2 })),
                    getParticipants: vi.fn(() => [{ id: 'u2', name: 'Bob' }]),
                    isUserOnSlot: vi.fn(() => true),
                    isSlotAvailable: vi.fn(() => ({
                        available: true,
                        type: 'opened',
                        target: 'all',
                    })),
                    canUserRegister: vi.fn(() => true),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 1),
                    isUserParticipating: vi.fn(() => true),
                    getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(result.current.modalStep).toBe('registration')
            expect(result.current.isModifying).toBe(true)
            expect(result.current.selectedDuration).toBeTruthy()
        })
    })

    describe('créneau non disponible', () => {
        it("ouvre le modal d'ouverture si adminSalles", () => {
            const { result } = renderModal({
                user: {
                    id: 'u1',
                    name: 'Alice',
                    isAdmin: false,
                    isAdminSalles: true,
                    licenseType: 'L',
                },
                slotHelpers: {
                    getUserRegistration: vi.fn(() => undefined),
                    isUserOnSlot: vi.fn(() => false),
                    getParticipants: vi.fn(() => []),
                    isSlotAvailable: vi.fn(() => ({ available: false, type: 'closed' })),
                    canUserRegister: vi.fn(() => false),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 0),
                    isUserParticipating: vi.fn(() => false),
                    getAvailableDurations: vi.fn(() => []),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(mockSlotMgmt.openSlotModal).toHaveBeenCalledWith('10:00')
        })

        it("affiche un toast si l'utilisateur n'est pas admin", () => {
            const { result } = renderModal({
                slotHelpers: {
                    getUserRegistration: vi.fn(() => undefined),
                    isUserOnSlot: vi.fn(() => false),
                    getParticipants: vi.fn(() => []),
                    isSlotAvailable: vi.fn(() => ({ available: false, type: 'closed' })),
                    canUserRegister: vi.fn(() => false),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 0),
                    isUserParticipating: vi.fn(() => false),
                    getAvailableDurations: vi.fn(() => []),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(mockAddToast).toHaveBeenCalledWith(
                expect.stringContaining('pas ouvert'),
                'warning'
            )
        })
    })

    describe('licence incompatible', () => {
        it('toast licence loisir requise', () => {
            const { result } = renderModal({
                slotHelpers: {
                    getUserRegistration: vi.fn(() => undefined),
                    isUserOnSlot: vi.fn(() => false),
                    getParticipants: vi.fn(() => []),
                    isSlotAvailable: vi.fn(() => ({
                        available: true,
                        type: 'opened',
                        target: 'loisir',
                    })),
                    canUserRegister: vi.fn(() => false),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 0),
                    isUserParticipating: vi.fn(() => false),
                    getAvailableDurations: vi.fn(() => []),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
                user: {
                    id: 'u1',
                    name: 'Alice',
                    isAdmin: false,
                    isAdminSalles: false,
                    licenseType: 'C',
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Loisir'), 'warning')
        })

        it('toast licence compétition requise', () => {
            const { result } = renderModal({
                slotHelpers: {
                    getUserRegistration: vi.fn(() => undefined),
                    isUserOnSlot: vi.fn(() => false),
                    getParticipants: vi.fn(() => []),
                    isSlotAvailable: vi.fn(() => ({
                        available: true,
                        type: 'opened',
                        target: 'competition',
                    })),
                    canUserRegister: vi.fn(() => false),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 0),
                    isUserParticipating: vi.fn(() => false),
                    getAvailableDurations: vi.fn(() => []),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
                user: {
                    id: 'u1',
                    name: 'Alice',
                    isAdmin: false,
                    isAdminSalles: false,
                    licenseType: 'L',
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(mockAddToast).toHaveBeenCalledWith(
                expect.stringContaining('Compétition'),
                'warning'
            )
        })

        it('toast si licence non définie', () => {
            const { result } = renderModal({
                slotHelpers: {
                    getUserRegistration: vi.fn(() => undefined),
                    isUserOnSlot: vi.fn(() => false),
                    getParticipants: vi.fn(() => []),
                    isSlotAvailable: vi.fn(() => ({
                        available: true,
                        type: 'opened',
                        target: 'all',
                    })),
                    canUserRegister: vi.fn(() => false),
                    getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                    getAcceptedParticipantCount: vi.fn(() => 0),
                    isUserParticipating: vi.fn(() => false),
                    getAvailableDurations: vi.fn(() => []),
                    getBlockedSlotInfo: vi.fn(() => undefined),
                },
                user: {
                    id: 'u1',
                    name: 'Alice',
                    isAdmin: false,
                    isAdminSalles: false,
                    licenseType: null,
                },
            })

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('licence'), 'warning')
        })
    })

    describe('créneau disponible', () => {
        it('ouvre le modal inscription', () => {
            const { result } = renderModal()

            act(() => {
                result.current.handleSlotClick('10:00')
            })

            expect(result.current.modalStep).toBe('registration')
            expect(result.current.selectedSlotId).toBe('10:00')
            expect(result.current.selfRegister).toBe(true)
        })
    })
})

// ==================== handleDurationSelect ====================

describe('handleDurationSelect', () => {
    it('sélectionne la durée et passe au step registration', () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
        })

        act(() => {
            result.current.handleDurationSelect(DURATION_1H)
        })

        expect(result.current.modalStep).toBe('registration')
        expect(result.current.selectedDuration).toBe(DURATION_1H)
    })
})

// ==================== handleRegister ====================

describe('handleRegister', () => {
    it('ne fait rien sans slotId ni duration', async () => {
        const { result } = renderModal()

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockStorageService.registerForSlot).not.toHaveBeenCalled()
    })

    it('affiche un toast si selfRegister=false et aucun invité sélectionné', async () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        act(() => {
            result.current.setSelfRegister(false)
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('inscrire'), 'warning')
    })

    it('bloque si un créneau dans la durée est bloqué', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => undefined),
                isUserOnSlot: vi.fn(() => false),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 0),
                isUserParticipating: vi.fn(() => false),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn((slotId) => {
                    if (slotId === '10:30') return { isBlocking: true, name: 'Entraînement' }
                    return undefined
                }),
            },
        })

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('bloqué'), 'warning')
        expect(mockStorageService.registerForSlot).not.toHaveBeenCalled()
    })

    it('crée les réservations pour chaque slot de la durée', async () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockStorageService.registerForSlot).toHaveBeenCalledTimes(2)
        expect(mockStorageService.registerForSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            2,
            false
        )
        expect(mockStorageService.registerForSlot).toHaveBeenCalledWith(
            '10:30',
            '2025-01-06',
            'u1',
            'Alice',
            2,
            false
        )
    })

    it('calcule le flag overbooking', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => undefined),
                isUserOnSlot: vi.fn(() => false),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 16),
                isUserParticipating: vi.fn(() => false),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
            calendarData: {
                loadData: vi.fn().mockResolvedValue(undefined),
                loadWeekInvitations: vi.fn().mockResolvedValue(undefined),
                maxPersons: 16,
                isWeekConfigured: true,
                approvedMembers: [],
            },
        })

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_OPTIONS[0]) // 30min = 1 slot
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        // 16 accepted + 1 = 17 > 16 maxPersons → overbooked = true
        expect(mockStorageService.registerForSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u1',
            'Alice',
            1,
            true
        )
    })

    it('crée les invitations en parallèle', async () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        // Ajouter des invités
        act(() => {
            result.current.updateGuest(0, 'u2')
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockStorageService.inviteToSlot).toHaveBeenCalledTimes(1)
        expect(mockStorageService.inviteToSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u2',
            'Bob',
            'u1',
            2
        )
    })

    it("mode selfRegister=false n'inscrit pas l'utilisateur", async () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        act(() => {
            result.current.setSelfRegister(false)
            result.current.updateGuest(0, 'u2')
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockStorageService.registerForSlot).not.toHaveBeenCalled()
        expect(mockStorageService.inviteToSlot).toHaveBeenCalledTimes(1)
    })

    it('ne recrée pas les inscriptions en mode modification', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => ({ duration: 2 })),
                isUserOnSlot: vi.fn(() => true),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 1),
                isUserParticipating: vi.fn(() => true),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
        })

        // Ouvrir en mode modification
        act(() => {
            result.current.handleSlotClick('10:00')
        })

        expect(result.current.isModifying).toBe(true)

        // Ajouter un invité
        act(() => {
            result.current.updateGuest(0, 'u2')
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        // Ne doit PAS recréer les inscriptions
        expect(mockStorageService.registerForSlot).not.toHaveBeenCalled()
        // Mais doit envoyer les invitations
        expect(mockStorageService.inviteToSlot).toHaveBeenCalledTimes(1)
    })

    it('ferme le modal et recharge les données après succès', async () => {
        const { result, props } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_OPTIONS[0])
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(result.current.modalStep).toBe(null)
        expect(result.current.selectedSlotId).toBe(null)
        expect(props.calendarData.loadData).toHaveBeenCalled()
        expect(props.calendarData.loadWeekInvitations).toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.registerForSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_OPTIONS[0])
        })

        await act(async () => {
            await result.current.handleRegister()
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})

// ==================== handleUnregister ====================

describe('handleUnregister', () => {
    it('désinscrit le premier slot et met à jour la durée des restants', async () => {
        const registeredSlots = new Set(['10:00', '10:30', '11:00'])
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn((id) =>
                    registeredSlots.has(id) ? { duration: 3 } : undefined
                ),
                isUserOnSlot: vi.fn(() => true),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 1),
                isUserParticipating: vi.fn(() => true),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
        })

        await act(async () => {
            await result.current.handleUnregister('10:00')
        })

        // First slot: unregister
        expect(mockStorageService.unregisterFromSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u1'
        )
        // Remaining slots: update duration
        expect(mockStorageService.updateSlotDuration).toHaveBeenCalledWith(
            '10:30',
            '2025-01-06',
            'u1',
            2
        )
        expect(mockStorageService.updateSlotDuration).toHaveBeenCalledWith(
            '11:00',
            '2025-01-06',
            'u1',
            2
        )
    })

    it('désinscrit un seul créneau', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => ({ duration: 1 })),
                isUserOnSlot: vi.fn(() => true),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 0),
                isUserParticipating: vi.fn(() => true),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
        })

        await act(async () => {
            await result.current.handleUnregister('10:00')
        })

        expect(mockStorageService.unregisterFromSlot).toHaveBeenCalledTimes(1)
        expect(mockStorageService.unregisterFromSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u1'
        )
    })

    it('recharge les données', async () => {
        const { result, props } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => ({ duration: 1 })),
                isUserOnSlot: vi.fn(() => true),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 0),
                isUserParticipating: vi.fn(() => true),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
        })

        await act(async () => {
            await result.current.handleUnregister('10:00')
        })

        expect(props.calendarData.loadData).toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.unregisterFromSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderModal({
            slotHelpers: {
                getUserRegistration: vi.fn(() => ({ duration: 1 })),
                isUserOnSlot: vi.fn(() => true),
                getParticipants: vi.fn(() => []),
                isSlotAvailable: vi.fn(() => ({ available: true, type: 'opened', target: 'all' })),
                canUserRegister: vi.fn(() => true),
                getSlotIndex: vi.fn((id) => TIME_SLOTS.findIndex((s) => s.id === id)),
                getAcceptedParticipantCount: vi.fn(() => 0),
                isUserParticipating: vi.fn(() => true),
                getAvailableDurations: vi.fn(() => DURATION_OPTIONS.slice(0, 4)),
                getBlockedSlotInfo: vi.fn(() => undefined),
            },
        })

        await act(async () => {
            await result.current.handleUnregister('10:00')
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})

// ==================== handleAdminDelete ====================

describe('handleAdminDelete', () => {
    it("ne fait rien si l'utilisateur n'est pas admin", async () => {
        const { result } = renderModal()

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', false)
        })

        expect(mockConfirm).not.toHaveBeenCalled()
    })

    it('demande confirmation', async () => {
        const { result } = renderModal({
            user: { id: 'u1', name: 'Alice', isAdmin: true, isAdminSalles: true, licenseType: 'L' },
        })

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', false)
        })

        expect(mockConfirm).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.stringContaining('Bob'),
            })
        )
    })

    it('ne supprime pas si confirmation refusée', async () => {
        mockConfirm.mockResolvedValueOnce(false)
        const { result } = renderModal({
            user: { id: 'u1', name: 'Alice', isAdmin: true, isAdminSalles: true, licenseType: 'L' },
        })

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', false)
        })

        expect(mockStorageService.unregisterFromSlot).not.toHaveBeenCalled()
    })

    it("supprime l'invitation pour un guest", async () => {
        const { result, props } = renderModal({
            user: { id: 'u1', name: 'Alice', isAdmin: true, isAdminSalles: true, licenseType: 'L' },
        })

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', true)
        })

        expect(mockStorageService.adminDeleteInvitation).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u2'
        )
        expect(props.calendarData.loadWeekInvitations).toHaveBeenCalled()
    })

    it('désinscrit un participant régulier', async () => {
        const { result, props } = renderModal({
            user: { id: 'u1', name: 'Alice', isAdmin: true, isAdminSalles: true, licenseType: 'L' },
        })

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', false)
        })

        expect(mockStorageService.unregisterFromSlot).toHaveBeenCalledWith(
            '10:00',
            '2025-01-06',
            'u2'
        )
        expect(props.calendarData.loadData).toHaveBeenCalled()
    })

    it("affiche un toast en cas d'erreur", async () => {
        mockStorageService.unregisterFromSlot.mockRejectedValueOnce(new Error('fail'))
        const { result } = renderModal({
            user: { id: 'u1', name: 'Alice', isAdmin: true, isAdminSalles: true, licenseType: 'L' },
        })

        await act(async () => {
            await result.current.handleAdminDelete('10:00', 'u2', 'Bob', false)
        })

        expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
    })
})

// ==================== closeModal ====================

describe('closeModal', () => {
    it("réinitialise tout l'état", () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
            result.current.handleDurationSelect(DURATION_1H)
        })

        expect(result.current.modalStep).toBe('registration')
        expect(result.current.selectedSlotId).toBe('10:00')

        act(() => {
            result.current.closeModal()
        })

        expect(result.current.modalStep).toBe(null)
        expect(result.current.selectedSlotId).toBe(null)
        expect(result.current.selectedDuration).toBe(null)
        expect(result.current.selfRegister).toBe(true)
        expect(result.current.guests).toEqual([{ userId: '', name: '' }])
    })
})

// ==================== Gestion des invités ====================

describe('gestion des invités', () => {
    it('addGuestField ajoute un champ', () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
        })

        expect(result.current.guests).toHaveLength(1)

        act(() => {
            result.current.addGuestField()
        })

        expect(result.current.guests).toHaveLength(2)
    })

    it('updateGuest met à jour le nom depuis approvedMembers', () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
        })

        act(() => {
            result.current.updateGuest(0, 'u2')
        })

        expect(result.current.guests[0].userId).toBe('u2')
        expect(result.current.guests[0].name).toBe('Bob')
    })

    it('removeGuest garde au moins un champ vide', () => {
        const { result } = renderModal()

        act(() => {
            result.current.handleSlotClick('10:00')
        })

        act(() => {
            result.current.removeGuest(0)
        })

        expect(result.current.guests).toHaveLength(1)
        expect(result.current.guests[0]).toEqual({ userId: '', name: '' })
    })
})
