// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react'

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
        getTemplateSlots: vi
            .fn()
            .mockResolvedValue([
                {
                    id: 's1',
                    dayOfWeek: 1,
                    startTime: '18:00:00',
                    endTime: '19:30:00',
                    name: 'Entraînement',
                    coach: 'Freddy',
                    group: 'G1',
                    isBlocking: true,
                },
            ]),
        getTemplateHours: vi
            .fn()
            .mockResolvedValue([
                { id: 'h1', dayOfWeek: 1, startTime: '08:00:00', endTime: '23:00:00' },
            ]),
        createTemplateSlot: vi.fn().mockResolvedValue({ success: true }),
        updateTemplateSlot: vi.fn().mockResolvedValue({ success: true }),
        deleteTemplateSlot: vi.fn().mockResolvedValue({ success: true }),
        createTemplateHour: vi.fn().mockResolvedValue({ success: true }),
        updateTemplateHour: vi.fn().mockResolvedValue({ success: true }),
        deleteTemplateHour: vi.fn().mockResolvedValue({ success: true }),
    },
}))

import TemplateEditor from '../TemplateEditor'

const fakeTemplate = { id: 't1', name: 'Semaine normale' }

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('TemplateEditor', () => {
    it('affiche le nom du template', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Semaine normale')).toBeTruthy()
        })
    })

    it('affiche les onglets Créneaux et Horaires', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Créneaux')).toBeTruthy()
        })
        expect(getByText('Horaires')).toBeTruthy()
    })

    it('affiche les slots chargés', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Entraînement')).toBeTruthy()
        })
    })

    it('appelle onBack au clic sur le bouton retour', async () => {
        const onBack = vi.fn()
        const { container } = render(
            <TemplateEditor template={fakeTemplate} onBack={onBack} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(container.querySelector('[class*="backBtn"]')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('[class*="backBtn"]'))
        expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('affiche le bouton Ajouter pour les créneaux', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Ajouter')).toBeTruthy()
        })
    })

    it("bascule vers l'onglet Horaires", async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Horaires')).toBeTruthy()
        })
        fireEvent.click(getByText('Horaires'))
        expect(getByText("Plages horaires d'ouverture")).toBeTruthy()
    })

    it('affiche le jour Lundi pour les slots du jour 1', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Lundi')).toBeTruthy()
        })
    })

    it('ouvre la modal au clic sur Ajouter et affiche le formulaire', async () => {
        const { getByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Ajouter')).toBeTruthy()
        })
        fireEvent.click(getByText('Ajouter'))
        expect(getByText('Nouveau créneau')).toBeTruthy()
        expect(getByText('Créer')).toBeTruthy()
    })

    it('appelle deleteTemplateSlot au clic sur le bouton supprimer', async () => {
        const { storageService } = await import('../../services/storage')
        const { container } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(container.querySelector('.icon-btn--danger')).toBeTruthy()
        })
        fireEvent.click(container.querySelector('.icon-btn--danger'))
        // Le confirm mock retourne true
        await waitFor(() => {
            expect(storageService.deleteTemplateSlot).toHaveBeenCalledWith('s1')
        })
    })

    it("ouvre la modal d'ajout d'heure dans l'onglet Horaires", async () => {
        const { getByText, getAllByText } = render(
            <TemplateEditor template={fakeTemplate} onBack={vi.fn()} onUpdate={vi.fn()} />
        )
        await waitFor(() => {
            expect(getByText('Horaires')).toBeTruthy()
        })
        fireEvent.click(getByText('Horaires'))
        // Le bouton Ajouter existe aussi dans l'onglet Horaires
        const addBtns = getAllByText('Ajouter')
        fireEvent.click(addBtns[addBtns.length - 1])
        expect(getByText('Nouvelle plage horaire')).toBeTruthy()
    })
})
