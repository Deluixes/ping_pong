// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}))

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', name: 'Jean' },
    }),
}))

// Mock ToastContext
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ addToast: vi.fn() }),
}))

// Mock ConfirmContext
vi.mock('../../contexts/ConfirmContext', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
}))

// Mock storageService
const mockGetPendingInvitations = vi.fn()
vi.mock('../../services/storage', () => ({
    storageService: {
        getPendingInvitations: (...args) => mockGetPendingInvitations(...args),
        acceptInvitation: vi.fn().mockResolvedValue({ success: true }),
        declineInvitation: vi.fn().mockResolvedValue({ success: true }),
        subscribeToInvitations: vi.fn().mockReturnValue({}),
        unsubscribe: vi.fn(),
        getOpenedSlotsForDate: vi.fn().mockResolvedValue([]),
        getWeekConfig: vi.fn().mockResolvedValue(null),
    },
}))

import MyInvitations from '../MyInvitations'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('MyInvitations', () => {
    it('affiche Chargement... initialement', () => {
        mockGetPendingInvitations.mockReturnValue(new Promise(() => {}))
        const { container } = render(<MyInvitations />)
        expect(container.textContent).toContain('Chargement...')
    })

    it('affiche le titre Invitations reçues', async () => {
        mockGetPendingInvitations.mockResolvedValue([])
        const { getByText } = render(<MyInvitations />)
        await waitFor(() => {
            expect(getByText('Invitations reçues')).toBeTruthy()
        })
    })

    it('affiche un état vide sans invitations', async () => {
        mockGetPendingInvitations.mockResolvedValue([])
        const { getByText } = render(<MyInvitations />)
        await waitFor(() => {
            expect(getByText('Aucune invitation en attente')).toBeTruthy()
        })
    })

    it('affiche les invitations', async () => {
        mockGetPendingInvitations.mockResolvedValue([
            { slotId: '18:00', date: '2025-03-10', invitedBy: 'Alice', duration: 1 },
        ])
        const { container } = render(<MyInvitations />)
        await waitFor(() => {
            expect(container.textContent).toContain('Alice')
        })
        expect(container.textContent).toContain('Accepter')
        expect(container.textContent).toContain('Refuser')
    })

    it('navigue vers / au clic sur le bouton retour', async () => {
        mockGetPendingInvitations.mockResolvedValue([])
        const { container } = render(<MyInvitations />)
        await waitFor(() => {
            expect(container.querySelector('.btn-back')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('.btn-back'))
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('appelle acceptInvitation au clic sur Accepter', async () => {
        const { storageService } = await import('../../services/storage')
        mockGetPendingInvitations.mockResolvedValue([
            { slotId: '18:00', date: '2025-03-10', invitedBy: 'Alice', duration: 1 },
        ])
        const onNotificationChange = vi.fn()
        const { getByText } = render(<MyInvitations onNotificationChange={onNotificationChange} />)
        await waitFor(() => {
            expect(getByText('Accepter')).toBeTruthy()
        })
        fireEvent.click(getByText('Accepter'))
        expect(storageService.acceptInvitation).toHaveBeenCalledWith('18:00', '2025-03-10', 'u1')
    })

    it('appelle declineInvitation au clic sur Refuser', async () => {
        const { storageService } = await import('../../services/storage')
        mockGetPendingInvitations.mockResolvedValue([
            { slotId: '18:00', date: '2025-03-10', invitedBy: 'Alice', duration: 1 },
        ])
        const { getByText } = render(<MyInvitations />)
        await waitFor(() => {
            expect(getByText('Refuser')).toBeTruthy()
        })
        fireEvent.click(getByText('Refuser'))
        // Le confirm mock retourne true
        await waitFor(() => {
            expect(storageService.declineInvitation).toHaveBeenCalledWith(
                '18:00',
                '2025-03-10',
                'u1'
            )
        })
    })

    it('navigue vers le calendrier au clic sur le bouton calendrier', async () => {
        mockGetPendingInvitations.mockResolvedValue([
            { slotId: '18:00', date: '2025-03-10', invitedBy: 'Alice', duration: 1 },
        ])
        const { container } = render(<MyInvitations />)
        await waitFor(() => {
            expect(container.querySelector('[title="Voir sur le planning"]')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('[title="Voir sur le planning"]'))
        expect(mockNavigate).toHaveBeenCalledWith('/?date=2025-03-10&slot=18:00')
    })

    it('appelle onNotificationChange après acceptation', async () => {
        const { storageService } = await import('../../services/storage')
        storageService.acceptInvitation.mockResolvedValue({ success: true })
        // Après accept, getPendingInvitations est rappelé, on retourne vide
        mockGetPendingInvitations
            .mockResolvedValueOnce([
                { slotId: '18:00', date: '2025-03-10', invitedBy: 'Alice', duration: 1 },
            ])
            .mockResolvedValueOnce([])
        const onNotificationChange = vi.fn()
        const { getByText } = render(<MyInvitations onNotificationChange={onNotificationChange} />)
        await waitFor(() => {
            expect(getByText('Accepter')).toBeTruthy()
        })
        fireEvent.click(getByText('Accepter'))
        await waitFor(() => {
            expect(onNotificationChange).toHaveBeenCalled()
        })
    })
})
