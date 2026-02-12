// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'u1', role: 'member' },
    }),
}))

// Mock storageService
const mockGetAllApprovedMembers = vi.fn()
vi.mock('../../services/storage', () => ({
    storageService: {
        getAllApprovedMembers: (...args) => mockGetAllApprovedMembers(...args),
    },
}))

import ClubMembers from '../ClubMembers'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

const fakeMembres = [
    { userId: '1', name: 'Alice Martin', licenseType: 'L', profilePhotoUrl: null },
    { userId: '2', name: 'Bob Dupont', licenseType: 'C', profilePhotoUrl: null },
    { userId: '3', name: 'Claire Durand', licenseType: 'L', profilePhotoUrl: null },
]

describe('ClubMembers', () => {
    it('affiche le message de chargement initialement', () => {
        mockGetAllApprovedMembers.mockReturnValue(new Promise(() => {})) // ne résout jamais
        const { container } = render(<ClubMembers />)
        expect(container.textContent).toContain('Chargement...')
    })

    it('affiche la liste des membres après chargement', async () => {
        mockGetAllApprovedMembers.mockResolvedValue(fakeMembres)
        const { getByText } = render(<ClubMembers />)
        await waitFor(() => {
            expect(getByText('Alice Martin')).toBeTruthy()
        })
        expect(getByText('Bob Dupont')).toBeTruthy()
        expect(getByText('Claire Durand')).toBeTruthy()
    })

    it('affiche le nombre de membres', async () => {
        mockGetAllApprovedMembers.mockResolvedValue(fakeMembres)
        const { container } = render(<ClubMembers />)
        await waitFor(() => {
            expect(container.textContent).toContain('3 membres')
        })
    })

    it('filtre les membres par recherche', async () => {
        mockGetAllApprovedMembers.mockResolvedValue(fakeMembres)
        const { container, getByPlaceholderText, queryByText } = render(<ClubMembers />)
        await waitFor(() => {
            expect(container.textContent).toContain('Alice Martin')
        })
        fireEvent.change(getByPlaceholderText('Rechercher un membre...'), {
            target: { value: 'alice' },
        })
        expect(container.textContent).toContain('Alice Martin')
        expect(queryByText('Bob Dupont')).toBeNull()
    })

    it('filtre par type de licence', async () => {
        mockGetAllApprovedMembers.mockResolvedValue(fakeMembres)
        const { getByText, queryByText } = render(<ClubMembers />)
        await waitFor(() => {
            expect(getByText('Alice Martin')).toBeTruthy()
        })
        fireEvent.click(getByText('Compétition'))
        expect(getByText('Bob Dupont')).toBeTruthy()
        expect(queryByText('Alice Martin')).toBeNull()
    })

    it("affiche un état vide quand aucun membre n'est trouvé", async () => {
        mockGetAllApprovedMembers.mockResolvedValue([])
        const { container } = render(<ClubMembers />)
        await waitFor(() => {
            expect(container.textContent).toContain('Aucun membre dans le club')
        })
    })

    it('affiche les boutons de filtre Tous, Loisir, Compétition', async () => {
        mockGetAllApprovedMembers.mockResolvedValue(fakeMembres)
        const { getByText } = render(<ClubMembers />)
        await waitFor(() => {
            expect(getByText('Alice Martin')).toBeTruthy()
        })
        expect(getByText('Tous')).toBeTruthy()
        expect(getByText('Loisir')).toBeTruthy()
        expect(getByText('Compétition')).toBeTruthy()
    })
})
