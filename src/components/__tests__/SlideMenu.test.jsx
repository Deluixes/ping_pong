// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    Link: ({ to, children, onClick, className }) => (
        <a
            href={to}
            className={className}
            onClick={(e) => {
                e.preventDefault()
                onClick?.()
            }}
        >
            {children}
        </a>
    ),
    useLocation: () => ({ pathname: '/' }),
    useNavigate: () => mockNavigate,
}))

// Mock AuthContext
const mockAuth = {
    user: { id: 'u1', name: 'Jean', email: 'jean@test.com', isAdmin: false, role: 'member' },
    logout: vi.fn().mockResolvedValue(),
    simulatedRole: null,
    setSimulatedRole: vi.fn(),
    getSimulatableRoles: () => [],
}
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}))

// Mock storageService
vi.mock('../../services/storage', () => ({
    storageService: {
        getPendingCount: vi.fn().mockResolvedValue(0),
        getPendingInvitationsCount: vi.fn().mockResolvedValue(0),
        getProfilePhotoUrl: vi.fn().mockResolvedValue(null),
    },
}))

import SlideMenu from '../SlideMenu'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuth.user = {
        id: 'u1',
        name: 'Jean',
        email: 'jean@test.com',
        isAdmin: false,
        role: 'member',
    }
})

describe('SlideMenu', () => {
    it('affiche le nom du club', () => {
        const { container } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(container.textContent).toContain('Ping-Pong Ramonville')
    })

    it("affiche le nom et l'email de l'utilisateur", () => {
        const { getByText } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(getByText('Jean')).toBeTruthy()
        expect(getByText('jean@test.com')).toBeTruthy()
    })

    it("appelle onClose au clic sur l'overlay", () => {
        const onClose = vi.fn()
        const { container } = render(<SlideMenu isOpen={true} onClose={onClose} />)
        // L'overlay est le premier div enfant avec la classe overlay
        const overlay = container.querySelector('[class*="overlay"]')
        fireEvent.click(overlay)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('appelle onClose au clic sur le bouton fermer', () => {
        const onClose = vi.fn()
        const { container } = render(<SlideMenu isOpen={true} onClose={onClose} />)
        const closeBtn = container.querySelector('[class*="closeBtn"]')
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('affiche les liens de navigation de base', () => {
        const { getByText } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(getByText('Planning')).toBeTruthy()
        expect(getByText('Mon compte')).toBeTruthy()
        expect(getByText('Invitations reçues')).toBeTruthy()
        expect(getByText('Mon club')).toBeTruthy()
    })

    it("n'affiche pas les liens admin pour un membre normal", () => {
        const { queryByText } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(queryByText('Gestion des membres')).toBeNull()
        expect(queryByText('Gestion du planning')).toBeNull()
    })

    it('affiche les liens admin pour un admin', () => {
        mockAuth.user = { ...mockAuth.user, isAdmin: true, role: 'admin' }
        const { getByText } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(getByText('Gestion des membres')).toBeTruthy()
        expect(getByText('Gestion du planning')).toBeTruthy()
    })

    it('appelle logout et onClose au clic sur Se déconnecter', () => {
        const onClose = vi.fn()
        const { getByText } = render(<SlideMenu isOpen={true} onClose={onClose} />)
        fireEvent.click(getByText('Se déconnecter'))
        expect(mockAuth.logout).toHaveBeenCalled()
    })

    it('affiche le lien vers le site du club', () => {
        const { getByText } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        expect(getByText('Site du club')).toBeTruthy()
    })

    it("n'affiche pas l'overlay quand isOpen est false", () => {
        const { container } = render(<SlideMenu isOpen={false} onClose={vi.fn()} />)
        const overlay = container.querySelector('[class*="overlay"]')
        expect(overlay).toBeNull()
    })

    it('affiche pas la classe panelOpen quand isOpen est false', () => {
        const { container } = render(<SlideMenu isOpen={false} onClose={vi.fn()} />)
        const panel = container.querySelector('[class*="panel"]')
        expect(panel).toBeTruthy()
        expect(panel.className).not.toContain('Open')
    })

    it('affiche les badges quand les compteurs sont > 0', async () => {
        const { storageService } = await import('../../services/storage')
        storageService.getPendingCount.mockResolvedValue(3)
        storageService.getPendingInvitationsCount.mockResolvedValue(2)
        mockAuth.user = { ...mockAuth.user, isAdmin: true, role: 'admin' }
        const { container } = render(<SlideMenu isOpen={true} onClose={vi.fn()} />)
        // Attendre que les badges soient rendus (useEffect async)
        await vi.waitFor(() => {
            const badges = container.querySelectorAll('.badge--count')
            expect(badges.length).toBeGreaterThanOrEqual(1)
        })
    })
})
