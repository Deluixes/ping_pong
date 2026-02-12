// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'

// Mock ToastContext
vi.mock('../../contexts/ToastContext', () => ({
    useToast: () => ({ addToast: vi.fn() }),
}))

// Mock storageService
vi.mock('../../services/storage', () => ({
    storageService: {
        getConfiguredWeeks: vi.fn().mockResolvedValue([]),
        applyTemplateToWeeks: vi
            .fn()
            .mockResolvedValue({ success: true, deletedReservations: 0, skippedSlots: 0 }),
        analyzeTemplateConflicts: vi.fn().mockResolvedValue({ conflicts: [], configuredWeeks: [] }),
    },
}))

import WeekSelector from '../WeekSelector'

const fakeTemplates = [
    { id: 't1', name: 'Semaine normale' },
    { id: 't2', name: 'Vacances' },
]

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('WeekSelector', () => {
    it('affiche le titre Appliquer des templates', async () => {
        const { getByText } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            expect(getByText('Appliquer des templates')).toBeTruthy()
        })
    })

    it('appelle onClose au clic sur Annuler', async () => {
        const onClose = vi.fn()
        const { getByText } = render(<WeekSelector templates={fakeTemplates} onClose={onClose} />)
        await waitFor(() => {
            expect(getByText('Annuler')).toBeTruthy()
        })
        fireEvent.click(getByText('Annuler'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('affiche le sélecteur de template', async () => {
        const { container } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            expect(container.textContent).toContain('Ajouter un template')
        })
    })

    it('affiche les boutons Tout sélectionner et Effacer', async () => {
        const { getByText } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            expect(getByText('Tout sélectionner')).toBeTruthy()
        })
        expect(getByText('Effacer')).toBeTruthy()
    })

    it('affiche le bouton Appliquer (désactivé sans sélection)', async () => {
        const { getByText } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            expect(getByText('Appliquer')).toBeTruthy()
        })
        const applyBtn = getByText('Appliquer').closest('button')
        expect(applyBtn.disabled).toBe(true)
    })

    it('affiche la navigation mensuelle', async () => {
        const { container } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            // Doit afficher le mois courant
            expect(container.querySelector('[class*="monthLabel"]')).toBeTruthy()
        })
    })

    it('affiche les semaines du mois', async () => {
        const { container } = render(<WeekSelector templates={fakeTemplates} onClose={vi.fn()} />)
        await waitFor(() => {
            // Doit afficher au moins 4 boutons de semaine
            const weekBtns = container.querySelectorAll('[class*="weekBtn"]')
            expect(weekBtns.length).toBeGreaterThanOrEqual(4)
        })
    })
})
