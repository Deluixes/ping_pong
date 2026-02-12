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
        user: { id: 'admin1', role: 'super_admin', isAdmin: true },
    }),
}))

// Mock ToastContext
const mockAddToast = vi.fn()
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}))

// Mock ConfirmContext
vi.mock('../../contexts/ConfirmContext', () => ({
    useConfirm: () => vi.fn().mockResolvedValue(true),
}))

// Mock storageService
const mockGetMembers = vi.fn()
const mockApproveMember = vi.fn()
vi.mock('../../services/storage', () => ({
    storageService: {
        getMembers: (...args) => mockGetMembers(...args),
        approveMember: (...args) => mockApproveMember(...args),
        rejectMember: vi.fn().mockResolvedValue({ success: true }),
        removeMember: vi.fn().mockResolvedValue({ success: true }),
        updateMemberLicense: vi.fn().mockResolvedValue({ success: true }),
        renameUser: vi.fn().mockResolvedValue({ success: true }),
        updateMemberRole: vi.fn().mockResolvedValue({ success: true }),
        subscribeToMembers: vi.fn().mockReturnValue('sub'),
        unsubscribe: vi.fn(),
    },
}))

import AdminPanel from '../AdminPanel'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

const fakeMembers = {
    pending: [{ userId: 'p1', name: 'Pending User', email: 'pending@test.com' }],
    approved: [
        {
            userId: 'a1',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'admin',
            licenseType: 'C',
        },
        {
            userId: 'm1',
            name: 'Member One',
            email: 'member1@test.com',
            role: 'member',
            licenseType: 'L',
        },
        {
            userId: 'm2',
            name: 'Member Two',
            email: 'member2@test.com',
            role: 'member',
            licenseType: 'C',
        },
    ],
}

describe('AdminPanel', () => {
    it('affiche Chargement... initialement', () => {
        mockGetMembers.mockReturnValue(new Promise(() => {}))
        const { container } = render(<AdminPanel />)
        expect(container.textContent).toContain('Chargement...')
    })

    it('affiche le titre Gestion des membres', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(getByText('Gestion des membres')).toBeTruthy()
        })
    })

    it('affiche les demandes en attente', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(getByText('Pending User')).toBeTruthy()
        })
        expect(getByText(/Demandes en attente \(1\)/)).toBeTruthy()
    })

    it('affiche les membres approuvés groupés', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(getByText('Admin User')).toBeTruthy()
        })
        expect(getByText('Member One')).toBeTruthy()
        expect(getByText('Member Two')).toBeTruthy()
    })

    it('affiche "Aucune demande en attente" si pas de pending', async () => {
        mockGetMembers.mockResolvedValue({ pending: [], approved: fakeMembers.approved })
        const { getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(getByText('Aucune demande en attente')).toBeTruthy()
        })
    })

    it('navigue vers / au clic sur le bouton retour', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.querySelector('.btn-back')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('.btn-back'))
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('affiche la barre de recherche', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container } = render(<AdminPanel />)
        await waitFor(() => {
            expect(
                container.querySelector('input[placeholder="Rechercher un membre..."]')
            ).toBeTruthy()
        })
    })

    it('filtre les membres via la recherche', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container, queryByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Member One')
        })
        const searchInput = container.querySelector('input[placeholder="Rechercher un membre..."]')
        fireEvent.change(searchInput, { target: { value: 'Two' } })
        expect(container.textContent).toContain('Member Two')
        expect(queryByText('Member One')).toBeNull()
    })

    it('appelle approveMember au clic sur le bouton approuver', async () => {
        mockApproveMember.mockResolvedValue({ success: true })
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Pending User')
        })
        // Le bouton approuver a la classe approveBtn et title="Approuver"
        const approveBtn = container.querySelector('[title="Approuver"]')
        fireEvent.click(approveBtn)
        expect(mockApproveMember).toHaveBeenCalledWith('p1')
    })

    it('appelle rejectMember au clic sur le bouton refuser', async () => {
        const { storageService } = await import('../../services/storage')
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Pending User')
        })
        const rejectBtn = container.querySelector('[title="Refuser"]')
        fireEvent.click(rejectBtn)
        // Le confirm mock retourne true
        await waitFor(() => {
            expect(storageService.rejectMember).toHaveBeenCalledWith('p1')
        })
    })

    it('ouvre la modal édition au clic sur le bouton modifier', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container, getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Member One')
        })
        // Le bouton modifier a title="Modifier"
        const editBtns = container.querySelectorAll('[title="Modifier"]')
        fireEvent.click(editBtns[0]) // premier bouton modifier (Admin User)
        await waitFor(() => {
            expect(getByText('Modifier le membre')).toBeTruthy()
        })
    })

    it('affiche le nom du membre dans la modal édition', async () => {
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container, getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Member One')
        })
        const editBtns = container.querySelectorAll('[title="Modifier"]')
        fireEvent.click(editBtns[1]) // Member One
        await waitFor(() => {
            expect(getByText('Modifier le membre')).toBeTruthy()
        })
        const nameInput = container.querySelector('.modal-dialog input[type="text"]')
        expect(nameInput.value).toBe('Member One')
    })

    it('appelle removeMember au clic sur Supprimer du groupe dans la modal', async () => {
        const { storageService } = await import('../../services/storage')
        mockGetMembers.mockResolvedValue(fakeMembers)
        const { container, getByText } = render(<AdminPanel />)
        await waitFor(() => {
            expect(container.textContent).toContain('Member One')
        })
        const editBtns = container.querySelectorAll('[title="Modifier"]')
        fireEvent.click(editBtns[1]) // Member One (not admin1, so delete is available)
        await waitFor(() => {
            expect(getByText('Supprimer du groupe')).toBeTruthy()
        })
        fireEvent.click(getByText('Supprimer du groupe'))
        await waitFor(() => {
            expect(storageService.removeMember).toHaveBeenCalledWith('m1')
        })
    })
})
