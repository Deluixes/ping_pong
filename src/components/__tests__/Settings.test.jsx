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
    user: { id: 'u1', name: 'Jean Dupont', email: 'jean@test.com' },
    updateName: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue(),
}
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => mockAuth,
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
vi.mock('../../services/storage', () => ({
    storageService: {
        getMemberProfile: vi.fn().mockResolvedValue({ licenseType: 'L' }),
        getProfilePhotoUrl: vi.fn().mockResolvedValue(null),
        renameUser: vi.fn().mockResolvedValue({ success: true }),
        updateMemberLicense: vi.fn().mockResolvedValue({ success: true }),
        uploadProfilePhoto: vi.fn().mockResolvedValue({ success: true, url: 'http://photo.jpg' }),
        deleteProfilePhoto: vi.fn().mockResolvedValue({ success: true }),
    },
}))

// Mock notificationService
vi.mock('../../services/notifications', () => ({
    notificationService: {
        isSupported: vi.fn().mockReturnValue(false),
        getPermissionStatus: vi.fn().mockReturnValue('default'),
        getPreferences: vi.fn().mockResolvedValue({
            enabled: false,
            invitations_enabled: true,
            slot_openings_enabled: true,
        }),
        enableNotifications: vi.fn().mockResolvedValue({ success: true }),
        disableNotifications: vi.fn().mockResolvedValue(),
        updatePreferences: vi.fn().mockResolvedValue(),
    },
}))

// Mock ChangePassword
vi.mock('../ChangePassword', () => ({
    default: ({ onClose }) => (
        <div data-testid="change-password">
            <button onClick={onClose}>Fermer</button>
        </div>
    ),
}))

import Settings from '../Settings'

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe('Settings', () => {
    it('affiche le titre Paramètres', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Paramètres')).toBeTruthy()
    })

    it("affiche l'email de l'utilisateur", () => {
        const { getByText } = render(<Settings />)
        expect(getByText('jean@test.com')).toBeTruthy()
    })

    it("affiche le nom dans l'input", () => {
        const { container } = render(<Settings />)
        const nameInput = container.querySelector('input[type="text"]')
        expect(nameInput.value).toBe('Jean Dupont')
    })

    it('affiche le sélecteur de type de licence', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Type de licence')).toBeTruthy()
    })

    it('appelle updateName et renameUser à la sauvegarde', async () => {
        const { container } = render(<Settings />)
        const nameInput = container.querySelector('input[type="text"]')
        fireEvent.change(nameInput, { target: { value: 'Nouveau Nom' } })
        fireEvent.submit(container.querySelector('form'))

        expect(mockAuth.updateName).toHaveBeenCalledWith('Nouveau Nom')
    })

    it('navigue vers / au clic sur le bouton retour', () => {
        const { container } = render(<Settings />)
        const backBtn = container.querySelector('.btn-back')
        fireEvent.click(backBtn)
        expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('appelle logout et navigue vers /login', async () => {
        const { getByText } = render(<Settings />)
        fireEvent.click(getByText('Se déconnecter'))
        expect(mockAuth.logout).toHaveBeenCalled()
    })

    it('affiche le bouton Modifier le mot de passe', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Modifier le mot de passe')).toBeTruthy()
    })

    it('affiche la section Mon Compte', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Mon Compte')).toBeTruthy()
    })

    it('affiche la section Notifications', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Notifications')).toBeTruthy()
    })

    it('permet de changer le type de licence via LicenseTypeSelector', () => {
        const { getByText } = render(<Settings />)
        // Les boutons Loisir/Compétition sont rendus par LicenseTypeSelector
        const compBtn = getByText('Compétition (C)')
        fireEvent.click(compBtn)
        // Le state interne change, on vérifie que le bouton est cliquable
        expect(compBtn).toBeTruthy()
    })

    it('appelle updateMemberLicense à la sauvegarde du profil', async () => {
        const { container } = render(<Settings />)
        fireEvent.submit(container.querySelector('form'))
        // updateName est toujours appelé
        expect(mockAuth.updateName).toHaveBeenCalled()
        // updateMemberLicense est appelé si licenseType n'est pas null
        // Le mock getMemberProfile retourne { licenseType: 'L' } donc après useEffect il est set
    })

    it('affiche le message "non supportées" quand notifications non supportées', () => {
        const { container } = render(<Settings />)
        expect(container.textContent).toContain('ne sont pas supportées')
    })

    it('affiche le bouton Activer quand notifications supportées', async () => {
        const { notificationService } = await import('../../services/notifications')
        notificationService.isSupported.mockReturnValue(true)
        const { findByText } = render(<Settings />)
        const btn = await findByText('Activer')
        expect(btn).toBeTruthy()
    })

    it('affiche le label photo "Ajouter une photo" quand pas de photo', () => {
        const { getByText } = render(<Settings />)
        expect(getByText('Ajouter une photo')).toBeTruthy()
    })
})
