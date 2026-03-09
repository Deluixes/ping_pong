// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}))

// Mock AuthContext
const mockAuth = {
    changePassword: vi.fn(),
    authError: null,
}
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}))

import ChangePassword from '../ChangePassword'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuth.authError = null
})

describe('ChangePassword', () => {
    it('affiche le titre "Modifier le mot de passe" en mode normal', () => {
        const { getByText } = render(<ChangePassword onClose={vi.fn()} />)
        expect(getByText('Modifier le mot de passe')).toBeTruthy()
    })

    it('affiche le titre "Créer votre mot de passe" en mode forcé', () => {
        const { getByText } = render(<ChangePassword forced={true} />)
        expect(getByText('Créer votre mot de passe')).toBeTruthy()
    })

    it('affiche un avertissement en mode forcé', () => {
        const { getByText } = render(<ChangePassword forced={true} />)
        expect(getByText(/vous devez définir un nouveau mot de passe/)).toBeTruthy()
    })

    it('affiche le bouton fermer en mode modal (pas forcé)', () => {
        const onClose = vi.fn()
        const { container } = render(<ChangePassword onClose={onClose} />)
        // Le bouton X est un icon-btn
        const closeBtn = container.querySelector('.icon-btn')
        expect(closeBtn).toBeTruthy()
        fireEvent.click(closeBtn)
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("n'affiche pas le bouton fermer en mode forcé", () => {
        const { container } = render(<ChangePassword forced={true} />)
        const iconBtns = container.querySelectorAll('.icon-btn')
        // En mode forcé pas de bouton de fermeture séparé
        const hasCloseButton = Array.from(iconBtns).some((btn) => !btn.className.includes('toggle'))
        expect(hasCloseButton).toBe(false)
    })

    it('affiche une erreur si le mot de passe est trop court', () => {
        const { container } = render(<ChangePassword onClose={vi.fn()} />)
        const inputs = container.querySelectorAll('input')
        inputs.forEach((i) => i.removeAttribute('required'))
        fireEvent.change(inputs[0], { target: { value: 'abc' } })
        fireEvent.change(inputs[1], { target: { value: 'abc' } })
        fireEvent.submit(container.querySelector('form'))
        // L'erreur apparaît dans la div .alert--error (le hint existe aussi)
        const errorAlert = container.querySelector('.alert--error')
        expect(errorAlert).toBeTruthy()
        expect(errorAlert.textContent).toContain('au moins 8 caractères')
    })

    it('affiche une erreur si les mots de passe ne correspondent pas', () => {
        const { getByText, container } = render(<ChangePassword onClose={vi.fn()} />)
        const inputs = container.querySelectorAll('input')
        inputs.forEach((i) => i.removeAttribute('required'))
        fireEvent.change(inputs[0], { target: { value: 'password123' } })
        fireEvent.change(inputs[1], { target: { value: 'different123' } })
        fireEvent.submit(container.querySelector('form'))
        expect(getByText('Les mots de passe ne correspondent pas')).toBeTruthy()
    })

    it('appelle changePassword avec le bon mot de passe', async () => {
        mockAuth.changePassword.mockResolvedValue({ success: true })
        const { container } = render(<ChangePassword onClose={vi.fn()} />)
        const inputs = container.querySelectorAll('input')
        fireEvent.change(inputs[0], { target: { value: 'newpassword123' } })
        fireEvent.change(inputs[1], { target: { value: 'newpassword123' } })
        fireEvent.submit(container.querySelector('form'))
        expect(mockAuth.changePassword).toHaveBeenCalledWith('newpassword123')
    })

    it("affiche l'erreur authError du contexte", () => {
        mockAuth.authError = 'Erreur serveur'
        const { getByText } = render(<ChangePassword onClose={vi.fn()} />)
        expect(getByText('Erreur serveur')).toBeTruthy()
    })

    it('redirige vers / après succès en mode forcé', async () => {
        vi.useFakeTimers()
        mockAuth.changePassword.mockResolvedValue({ success: true })
        const { container, getByText } = render(<ChangePassword forced={true} />)
        const inputs = container.querySelectorAll('input')
        fireEvent.change(inputs[0], { target: { value: 'newpassword123' } })
        fireEvent.change(inputs[1], { target: { value: 'newpassword123' } })
        fireEvent.submit(container.querySelector('form'))
        // Attendre que le state success soit true
        await vi.waitFor(() => {
            expect(getByText('Mot de passe modifié !')).toBeTruthy()
        })
        // Avancer le timer de 2 secondes
        vi.advanceTimersByTime(2000)
        expect(mockNavigate).toHaveBeenCalledWith('/')
        vi.useRealTimers()
    })
})
