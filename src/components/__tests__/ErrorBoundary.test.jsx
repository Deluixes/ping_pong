// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'

// Composant qui lance une erreur volontairement
function ThrowError({ shouldThrow }) {
    if (shouldThrow) throw new Error('Test error')
    return <div>Contenu normal</div>
}

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
    it('affiche les enfants normalement sans erreur', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <div>Enfant OK</div>
            </ErrorBoundary>
        )
        expect(getByText('Enfant OK')).toBeTruthy()
    })

    it("affiche l'UI d'erreur quand un enfant lance une exception", () => {
        const { getByText, queryByText } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(getByText('Une erreur est survenue')).toBeTruthy()
        expect(queryByText('Contenu normal')).toBeNull()
    })

    it('affiche le bouton Réessayer', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(getByText('Réessayer')).toBeTruthy()
    })

    it('réinitialise le composant au clic sur Réessayer', () => {
        // On utilise un flag mutable pour éviter que le composant relance l'erreur
        // entre le reset du state et le rerender
        let shouldThrow = true
        function MaybeThrow() {
            if (shouldThrow) throw new Error('Test error')
            return <div>Contenu normal</div>
        }

        const { getByText } = render(
            <ErrorBoundary>
                <MaybeThrow />
            </ErrorBoundary>
        )
        expect(getByText('Une erreur est survenue')).toBeTruthy()

        // Désactiver l'erreur AVANT de cliquer Réessayer
        shouldThrow = false
        fireEvent.click(getByText('Réessayer'))

        expect(getByText('Contenu normal')).toBeTruthy()
    })

    it('affiche le bouton Recharger la page', () => {
        const { getByText } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        )
        expect(getByText('Recharger la page')).toBeTruthy()
    })
})
