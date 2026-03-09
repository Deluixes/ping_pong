// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import Toast from '../Toast'

afterEach(() => cleanup())

describe('Toast', () => {
    it('retourne null si le tableau est vide', () => {
        const { container } = render(<Toast toasts={[]} onDismiss={vi.fn()} />)
        expect(container.innerHTML).toBe('')
    })

    it('affiche un toast avec son message', () => {
        const toasts = [{ id: '1', message: 'Succès !', type: 'success' }]
        render(<Toast toasts={toasts} onDismiss={vi.fn()} />)
        expect(document.body.textContent).toContain('Succès !')
    })

    it('affiche plusieurs toasts', () => {
        const toasts = [
            { id: '1', message: 'Premier', type: 'success' },
            { id: '2', message: 'Second', type: 'error' },
        ]
        render(<Toast toasts={toasts} onDismiss={vi.fn()} />)
        expect(document.body.textContent).toContain('Premier')
        expect(document.body.textContent).toContain('Second')
    })

    it('appelle onDismiss avec le bon id au clic sur fermer', () => {
        const onDismiss = vi.fn()
        const toasts = [{ id: '42', message: 'Test', type: 'info' }]
        render(<Toast toasts={toasts} onDismiss={onDismiss} />)
        // Le portail ajoute les boutons dans body
        const closeBtn = document.body.querySelector('button')
        fireEvent.click(closeBtn)
        expect(onDismiss).toHaveBeenCalledWith('42')
    })
})
