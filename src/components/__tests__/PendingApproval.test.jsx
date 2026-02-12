// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock AuthContext
const mockAuth = {
    user: { id: '1', name: 'Jean', email: 'jean@test.com' },
    memberStatus: 'none',
    requestAccess: vi.fn(),
    logout: vi.fn(),
    refreshMemberStatus: vi.fn(),
}
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}))

import PendingApproval from '../PendingApproval'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuth.memberStatus = 'none'
})

describe('PendingApproval', () => {
    it('affiche le bouton "Demander à rejoindre" quand memberStatus=none', () => {
        const { getByText } = render(<PendingApproval />)
        expect(getByText('Demander à rejoindre le groupe')).toBeTruthy()
    })

    it("affiche le message d'attente quand memberStatus=pending", () => {
        mockAuth.memberStatus = 'pending'
        const { getByText } = render(<PendingApproval />)
        expect(getByText('Demande en attente')).toBeTruthy()
        expect(getByText(/Un administrateur doit valider/)).toBeTruthy()
    })

    it('appelle requestAccess au clic sur le bouton rejoindre', () => {
        mockAuth.requestAccess.mockResolvedValue()
        const { getByText } = render(<PendingApproval />)
        fireEvent.click(getByText('Demander à rejoindre le groupe'))
        expect(mockAuth.requestAccess).toHaveBeenCalledTimes(1)
    })

    it('affiche le bouton Vérifier le statut quand memberStatus=pending', () => {
        mockAuth.memberStatus = 'pending'
        const { getByText } = render(<PendingApproval />)
        expect(getByText('Vérifier le statut')).toBeTruthy()
    })

    it('appelle refreshMemberStatus au clic sur Vérifier le statut', () => {
        mockAuth.memberStatus = 'pending'
        mockAuth.refreshMemberStatus.mockResolvedValue()
        const { getByText } = render(<PendingApproval />)
        fireEvent.click(getByText('Vérifier le statut'))
        expect(mockAuth.refreshMemberStatus).toHaveBeenCalledTimes(1)
    })

    it('affiche le bouton Se déconnecter', () => {
        const { getByText } = render(<PendingApproval />)
        expect(getByText('Se déconnecter')).toBeTruthy()
    })

    it('appelle logout au clic sur Se déconnecter', () => {
        mockAuth.logout.mockResolvedValue()
        const { getByText } = render(<PendingApproval />)
        fireEvent.click(getByText('Se déconnecter'))
        expect(mockAuth.logout).toHaveBeenCalledTimes(1)
    })

    it("affiche l'email de l'utilisateur connecté", () => {
        const { getByText } = render(<PendingApproval />)
        expect(getByText(/jean@test.com/)).toBeTruthy()
    })
})
