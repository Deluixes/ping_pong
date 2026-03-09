// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ==================== MOCKS ====================

const mockGetProfilePhotoUrl = vi.fn()

vi.mock('../../services/storage', () => ({
    storageService: {
        getProfilePhotoUrl: (...args) => mockGetProfilePhotoUrl(...args),
    },
}))

import { useParticipantsModal } from '../useParticipantsModal'

// ==================== HELPERS ====================

function createProps(overrides = {}) {
    return {
        slotHelpers: {
            getParticipants: vi.fn(() => []),
            ...overrides.slotHelpers,
        },
        calendarData: {
            approvedMembers: [],
            ...overrides.calendarData,
        },
        ...overrides,
    }
}

function renderModal(overrides = {}) {
    const props = createProps(overrides)
    const { result } = renderHook(() => useParticipantsModal(props))
    return { result, props }
}

// ==================== SETUP ====================

beforeEach(() => {
    vi.clearAllMocks()
    mockGetProfilePhotoUrl.mockResolvedValue('http://test.com/photo.jpg')
})

// ==================== handleShowParticipants ====================

describe('handleShowParticipants', () => {
    it('enrichit les participants avec photo et type de licence', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getParticipants: vi.fn(() => [
                    { id: 'u1', name: 'Alice', isGuest: false, status: 'accepted' },
                    { id: 'u2', name: 'Bob', isGuest: false, status: 'accepted' },
                ]),
            },
            calendarData: {
                approvedMembers: [
                    { userId: 'u1', licenseType: 'L' },
                    { userId: 'u2', licenseType: 'C' },
                ],
            },
        })

        await act(async () => {
            await result.current.handleShowParticipants('10:00')
        })

        expect(result.current.participantsToShow).toHaveLength(2)
        expect(result.current.participantsToShow[0].profilePhotoUrl).toBe(
            'http://test.com/photo.jpg'
        )
        expect(result.current.participantsToShow[0].licenseType).toBe('L')
        expect(result.current.participantsToShow[1].licenseType).toBe('C')
    })

    it("met profilePhotoUrl à null si pas d'id", async () => {
        const { result } = renderModal({
            slotHelpers: {
                getParticipants: vi.fn(() => [
                    { id: null, name: 'Anonyme', isGuest: false, status: 'accepted' },
                ]),
            },
        })

        await act(async () => {
            await result.current.handleShowParticipants('10:00')
        })

        expect(result.current.participantsToShow[0].profilePhotoUrl).toBe(null)
        expect(mockGetProfilePhotoUrl).not.toHaveBeenCalled()
    })

    it("met licenseType à null si le membre n'est pas dans approvedMembers", async () => {
        const { result } = renderModal({
            slotHelpers: {
                getParticipants: vi.fn(() => [
                    { id: 'u99', name: 'Inconnu', isGuest: false, status: 'accepted' },
                ]),
            },
            calendarData: {
                approvedMembers: [{ userId: 'u1', licenseType: 'L' }],
            },
        })

        await act(async () => {
            await result.current.handleShowParticipants('10:00')
        })

        expect(result.current.participantsToShow[0].licenseType).toBe(null)
    })

    it('affiche la liste des participants', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getParticipants: vi.fn(() => [
                    { id: 'u1', name: 'Alice', isGuest: false, status: 'accepted' },
                ]),
            },
        })

        await act(async () => {
            await result.current.handleShowParticipants('10:00')
        })

        expect(result.current.showParticipantsList).toBe(true)
    })
})

// ==================== closeParticipantsModal ====================

describe('closeParticipantsModal', () => {
    it('ferme la modal participants', async () => {
        const { result } = renderModal({
            slotHelpers: {
                getParticipants: vi.fn(() => [
                    { id: 'u1', name: 'Alice', isGuest: false, status: 'accepted' },
                ]),
            },
        })

        await act(async () => {
            await result.current.handleShowParticipants('10:00')
        })
        expect(result.current.showParticipantsList).toBe(true)

        act(() => {
            result.current.closeParticipantsModal()
        })
        expect(result.current.showParticipantsList).toBe(false)
    })
})
