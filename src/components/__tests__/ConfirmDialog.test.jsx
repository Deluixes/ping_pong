// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import ConfirmDialog from '../ConfirmDialog'

afterEach(() => cleanup())

describe('ConfirmDialog', () => {
    it('affiche le titre et le message', () => {
        const { getByText } = render(
            <ConfirmDialog
                title="Supprimer"
                message="Voulez-vous supprimer ?"
                confirmLabel="Oui"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        )
        expect(getByText('Supprimer')).toBeTruthy()
        expect(getByText('Voulez-vous supprimer ?')).toBeTruthy()
    })

    it("n'affiche pas le titre s'il est absent", () => {
        const { container, getByText } = render(
            <ConfirmDialog
                message="Un message"
                confirmLabel="OK"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        )
        expect(container.querySelector('h3')).toBeNull()
        expect(getByText('Un message')).toBeTruthy()
    })

    it('affiche le label du bouton confirmer', () => {
        const { getByText } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Valider"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        )
        expect(getByText('Valider')).toBeTruthy()
    })

    it('appelle onConfirm au clic sur le bouton confirmer', () => {
        const onConfirm = vi.fn()
        const { getByText } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Oui"
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        )
        fireEvent.click(getByText('Oui'))
        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it('appelle onCancel au clic sur Annuler', () => {
        const onCancel = vi.fn()
        const { getByText } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Oui"
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        )
        fireEvent.click(getByText('Annuler'))
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("appelle onCancel au clic sur l'overlay", () => {
        const onCancel = vi.fn()
        const { container } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Oui"
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        )
        // L'overlay est le div racine du composant
        fireEvent.click(container.firstChild)
        expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it("ne propage pas le clic depuis le dialog vers l'overlay", () => {
        const onCancel = vi.fn()
        const { container } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Oui"
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        )
        // Le dialog est le premier enfant de l'overlay
        const dialog = container.firstChild.firstChild
        fireEvent.click(dialog)
        expect(onCancel).not.toHaveBeenCalled()
    })

    it('applique la classe btn-danger pour la variante danger', () => {
        const { getByText } = render(
            <ConfirmDialog
                message="msg"
                confirmLabel="Supprimer"
                variant="danger"
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        )
        const btn = getByText('Supprimer')
        expect(btn.className).toContain('btn-danger')
    })

    it('applique la classe btn-primary par défaut', () => {
        const { getByText } = render(
            <ConfirmDialog message="msg" confirmLabel="OK" onConfirm={vi.fn()} onCancel={vi.fn()} />
        )
        const btn = getByText('OK')
        expect(btn.className).toContain('btn-primary')
    })
})
