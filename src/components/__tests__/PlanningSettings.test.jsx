// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
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
vi.mock('../../services/storage', () => ({
    storageService: {
        getSetting: vi.fn().mockResolvedValue('8'),
        getTemplates: vi.fn().mockResolvedValue([
            { id: 't1', name: 'Semaine normale' },
            { id: 't2', name: 'Vacances' },
        ]),
        updateSetting: vi.fn().mockResolvedValue({ success: true }),
        createTemplate: vi.fn().mockResolvedValue({ success: true }),
        deleteTemplate: vi.fn().mockResolvedValue({ success: true }),
        updateTemplate: vi.fn().mockResolvedValue({ success: true }),
    },
}))

// Mock TemplateEditor
vi.mock('../TemplateEditor', () => ({
    default: ({ onBack }) => (
        <div data-testid="template-editor">
            <button onClick={onBack}>Retour éditeur</button>
        </div>
    ),
}))

// Mock WeekSelector
vi.mock('../WeekSelector', () => ({
    default: ({ onClose }) => (
        <div data-testid="week-selector">
            <button onClick={onClose}>Fermer selector</button>
        </div>
    ),
}))

import PlanningSettings from '../PlanningSettings'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('PlanningSettings', () => {
    it('affiche le titre Gestion du planning', async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Gestion du planning')).toBeTruthy()
        })
    })

    it('affiche les 3 onglets Tables, Templates, Semaines', async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        expect(getByText('Templates')).toBeTruthy()
        expect(getByText('Semaines')).toBeTruthy()
    })

    it("affiche l'onglet Tables par défaut avec le nombre de tables", async () => {
        const { getByText, container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Configuration des tables')).toBeTruthy()
        })
        const input = container.querySelector('input[type="number"]')
        expect(input.value).toBe('8')
    })

    it("affiche la liste des templates dans l'onglet Templates", async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Templates'))
        expect(getByText('Semaine normale')).toBeTruthy()
        expect(getByText('Vacances')).toBeTruthy()
    })

    it("affiche le bouton Nouveau dans l'onglet Templates", async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Templates'))
        expect(getByText('Nouveau')).toBeTruthy()
    })

    it("affiche l'onglet Semaines avec le bouton Appliquer", async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Semaines'))
        expect(getByText('Appliquer des templates aux semaines')).toBeTruthy()
    })

    it('navigue vers / au clic sur le bouton retour', async () => {
        const { container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(container.querySelector('.btn-back')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('.btn-back'))
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('affiche la capacité max calculée', async () => {
        const { container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(container.textContent).toContain('16 personnes')
        })
    })

    it('appelle updateSetting au clic sur Enregistrer (onglet Tables)', async () => {
        const { storageService } = await import('../../services/storage')
        const { getByText, container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(container.querySelector('input[type="number"]')).toBeTruthy()
        })
        fireEvent.change(container.querySelector('input[type="number"]'), {
            target: { value: '10' },
        })
        fireEvent.click(getByText('Enregistrer'))
        expect(storageService.updateSetting).toHaveBeenCalledWith('total_tables', '10')
    })

    it('ouvre la modal de création au clic sur Nouveau', async () => {
        const { getByText } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Templates'))
        fireEvent.click(getByText('Nouveau'))
        expect(getByText('Nouveau template')).toBeTruthy()
    })

    it('appelle deleteTemplate au clic sur le bouton supprimer', async () => {
        const { storageService } = await import('../../services/storage')
        const { getByText, container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Templates'))
        // Bouton supprimer a title="Supprimer"
        const deleteBtns = container.querySelectorAll('[title="Supprimer"]')
        fireEvent.click(deleteBtns[0]) // Supprimer "Semaine normale"
        // Le confirm mock retourne true
        await waitFor(() => {
            expect(storageService.deleteTemplate).toHaveBeenCalledWith('t1')
        })
    })

    it('ouvre le TemplateEditor au clic sur un template', async () => {
        const { getByText, container } = render(<PlanningSettings />)
        await waitFor(() => {
            expect(getByText('Tables')).toBeTruthy()
        })
        fireEvent.click(getByText('Templates'))
        // Cliquer sur le nom du template (la carte entière est cliquable)
        fireEvent.click(getByText('Semaine normale'))
        // Vérifie que le TemplateEditor mocké est affiché
        expect(container.querySelector('[data-testid="template-editor"]')).toBeTruthy()
    })
})
