// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    useNavigate: () => mockNavigate,
}))

// Mock AuthContext
const mockAuth = {
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    authError: null,
}
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
}))

import Login from '../Login'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    mockAuth.user = null
    mockAuth.loading = false
    mockAuth.authError = null
})

describe('Login', () => {
    it('affiche le formulaire de connexion par défaut', () => {
        const { getByText, getByPlaceholderText } = render(<Login />)
        expect(getByText('Connexion')).toBeTruthy()
        expect(getByText('Inscription')).toBeTruthy()
        expect(getByPlaceholderText('jean@example.com')).toBeTruthy()
        expect(getByText('Se connecter')).toBeTruthy()
    })

    it('affiche Chargement... si loading est true', () => {
        mockAuth.loading = true
        const { container } = render(<Login />)
        expect(container.textContent).toContain('Chargement...')
    })

    it('redirige vers / si user est connecté', () => {
        mockAuth.user = { id: '1', email: 'test@test.com' }
        const { container } = render(<Login />)
        const nav = container.querySelector('[data-testid="navigate"]')
        expect(nav).toBeTruthy()
        expect(nav.getAttribute('data-to')).toBe('/')
    })

    it("bascule vers l'onglet inscription au clic", () => {
        const { getByText, getByPlaceholderText } = render(<Login />)
        fireEvent.click(getByText('Inscription'))
        expect(getByPlaceholderText('Jean Dupont')).toBeTruthy()
        expect(getByText('Créer un compte')).toBeTruthy()
    })

    it('affiche le champ Prénom Nom en mode inscription', () => {
        const { getByText, queryByPlaceholderText } = render(<Login />)
        // Pas de champ nom en mode login
        expect(queryByPlaceholderText('Jean Dupont')).toBeNull()
        // Switch vers signup
        fireEvent.click(getByText('Inscription'))
        expect(queryByPlaceholderText('Jean Dupont')).toBeTruthy()
    })

    it('affiche une erreur si email vide au submit login', async () => {
        const { getByText, container } = render(<Login />)
        // Le champ email est "required", on force le submit sans email
        const form = container.querySelector('form')
        const emailInput = container.querySelector('input[type="email"]')
        // Supprimer l'attribut required pour tester la validation JS
        emailInput.removeAttribute('required')
        const pwdInput = container.querySelector('input[type="password"]')
        pwdInput.removeAttribute('required')
        fireEvent.change(pwdInput, { target: { value: 'password123' } })
        fireEvent.submit(form)
        expect(getByText('Veuillez entrer votre email')).toBeTruthy()
    })

    it('affiche une erreur si le nom est vide en mode inscription', () => {
        const { getByText, container } = render(<Login />)
        fireEvent.click(getByText('Inscription'))

        const form = container.querySelector('form')
        // Remplir email et password mais pas le nom
        container.querySelectorAll('input').forEach((i) => i.removeAttribute('required'))
        const inputs = container.querySelectorAll('input')
        // inputs: nom, email, password, confirm
        fireEvent.change(inputs[1], { target: { value: 'test@test.com' } })
        fireEvent.change(inputs[2], { target: { value: 'password123' } })
        fireEvent.change(inputs[3], { target: { value: 'password123' } })
        fireEvent.submit(form)
        expect(getByText('Veuillez entrer votre nom')).toBeTruthy()
    })

    it('appelle signIn au submit en mode connexion', async () => {
        mockAuth.signIn.mockResolvedValue({ success: true })
        const { container } = render(<Login />)

        const emailInput = container.querySelector('input[type="email"]')
        const pwdInput = container.querySelector('input[type="password"]')
        fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
        fireEvent.change(pwdInput, { target: { value: 'password123' } })
        fireEvent.submit(container.querySelector('form'))

        expect(mockAuth.signIn).toHaveBeenCalledWith('test@test.com', 'password123')
    })

    it("affiche l'erreur authError du contexte", () => {
        mockAuth.authError = 'Session expirée'
        const { getByText } = render(<Login />)
        expect(getByText('Session expirée')).toBeTruthy()
    })

    it('bascule vers le formulaire mot de passe oublié', () => {
        const { getByText } = render(<Login />)
        fireEvent.click(getByText('Mot de passe oublié ?'))
        expect(getByText('Mot de passe oublié')).toBeTruthy()
        expect(getByText('Envoyer le lien')).toBeTruthy()
    })

    it('appelle resetPassword depuis le formulaire oublié', async () => {
        mockAuth.resetPassword.mockResolvedValue({ success: true })
        const { getByText, container } = render(<Login />)
        fireEvent.click(getByText('Mot de passe oublié ?'))

        const emailInput = container.querySelector('input[type="email"]')
        fireEvent.change(emailInput, { target: { value: 'test@test.com' } })
        fireEvent.submit(container.querySelector('form'))

        expect(mockAuth.resetPassword).toHaveBeenCalledWith('test@test.com')
    })

    it('affiche le lien Mot de passe oublié uniquement en mode login', () => {
        const { getByText, queryByText } = render(<Login />)
        expect(getByText('Mot de passe oublié ?')).toBeTruthy()
        fireEvent.click(getByText('Inscription'))
        expect(queryByText('Mot de passe oublié ?')).toBeNull()
    })

    it('affiche une erreur si le mot de passe est trop court en mode inscription', () => {
        const { getByText, container } = render(<Login />)
        fireEvent.click(getByText('Inscription'))
        const inputs = container.querySelectorAll('input')
        inputs.forEach((i) => i.removeAttribute('required'))
        // inputs: nom, email, password, confirm
        fireEvent.change(inputs[0], { target: { value: 'Jean' } })
        fireEvent.change(inputs[1], { target: { value: 'test@test.com' } })
        fireEvent.change(inputs[2], { target: { value: 'abc' } })
        fireEvent.change(inputs[3], { target: { value: 'abc' } })
        fireEvent.submit(container.querySelector('form'))
        expect(container.textContent).toContain('au moins 8 caractères')
    })

    it('appelle signUp au submit en mode inscription', async () => {
        mockAuth.signUp.mockResolvedValue({ success: true })
        const { getByText, container } = render(<Login />)
        fireEvent.click(getByText('Inscription'))
        const inputs = container.querySelectorAll('input')
        inputs.forEach((i) => i.removeAttribute('required'))
        // inputs: nom, email, password, confirm
        fireEvent.change(inputs[0], { target: { value: 'Jean Dupont' } })
        fireEvent.change(inputs[1], { target: { value: 'jean@test.com' } })
        fireEvent.change(inputs[2], { target: { value: 'password123' } })
        fireEvent.change(inputs[3], { target: { value: 'password123' } })
        fireEvent.submit(container.querySelector('form'))
        expect(mockAuth.signUp).toHaveBeenCalledWith('jean@test.com', 'password123', 'Jean Dupont')
    })
})
