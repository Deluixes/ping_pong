import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { notificationService } from '../services/notifications'
import {
    ArrowLeft,
    Save,
    User,
    Mail,
    Award,
    Bell,
    BellOff,
    Smartphone,
    Lock,
    Camera,
    Trash2,
} from 'lucide-react'
import { MAX_PHOTO_SIZE } from '../constants'
import ChangePassword from './ChangePassword'
import clsx from 'clsx'
import styles from './Settings.module.css'

export default function Settings() {
    const { user, updateName, logout } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [licenseType, setLicenseType] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Notification states
    const [notifSupported, setNotifSupported] = useState(false)
    const [notifEnabled, setNotifEnabled] = useState(false)
    const [notifPrefs, setNotifPrefs] = useState({
        invitations_enabled: true,
        slot_openings_enabled: true,
    })
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifPermission, setNotifPermission] = useState('default')
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    // Photo de profil
    const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)
    const [photoUploading, setPhotoUploading] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)

    // Charger le profil pour récupérer le type de licence et la photo
    useEffect(() => {
        const loadProfile = async () => {
            if (user?.id) {
                const profile = await storageService.getMemberProfile(user.id)
                if (profile) {
                    setLicenseType(profile.licenseType)
                }
                // Charger la photo de profil
                const photoUrl = await storageService.getProfilePhotoUrl(user.id)
                setProfilePhotoUrl(photoUrl)
            }
        }
        loadProfile()
    }, [user?.id])

    // Charger les préférences de notifications
    useEffect(() => {
        const loadNotificationSettings = async () => {
            const supported = notificationService.isSupported()
            setNotifSupported(supported)
            setNotifPermission(notificationService.getPermissionStatus())

            if (supported && user?.id) {
                const prefs = await notificationService.getPreferences(user.id)
                setNotifEnabled(prefs.enabled)
                setNotifPrefs({
                    invitations_enabled: prefs.invitations_enabled,
                    slot_openings_enabled: prefs.slot_openings_enabled,
                })
            }
        }
        loadNotificationSettings()
    }, [user?.id])

    // Handlers pour les notifications
    const handleToggleNotifications = async () => {
        setNotifLoading(true)
        if (notifEnabled) {
            await notificationService.disableNotifications(user.id)
            setNotifEnabled(false)
        } else {
            const result = await notificationService.enableNotifications(user.id)
            if (result.success) {
                setNotifEnabled(true)
                setNotifPermission('granted')
            } else {
                alert(result.error || "Impossible d'activer les notifications")
                setNotifPermission(notificationService.getPermissionStatus())
            }
        }
        setNotifLoading(false)
    }

    const handleUpdateNotifPref = async (key, value) => {
        const newPrefs = { ...notifPrefs, [key]: value }
        setNotifPrefs(newPrefs)
        await notificationService.updatePreferences(user.id, newPrefs)
    }

    const handleTestNotification = async () => {
        await notificationService.sendTestNotification()
    }

    // Handlers pour la photo de profil
    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image')
            return
        }

        // Vérifier la taille (max 5MB)
        if (file.size > MAX_PHOTO_SIZE) {
            alert("L'image ne doit pas dépasser 5 Mo")
            return
        }

        setPhotoUploading(true)
        const result = await storageService.uploadProfilePhoto(user.id, file)
        setPhotoUploading(false)

        if (result.success) {
            setProfilePhotoUrl(result.url)
        } else {
            alert(result.error || "Erreur lors de l'upload de la photo")
        }

        // Reset input
        e.target.value = ''
    }

    const handleDeletePhoto = async () => {
        if (!window.confirm('Supprimer votre photo de profil ?')) return

        setPhotoUploading(true)
        const result = await storageService.deleteProfilePhoto(user.id)
        setPhotoUploading(false)

        if (result.success) {
            setProfilePhotoUrl(null)
        } else {
            alert(result.error || 'Erreur lors de la suppression')
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        await updateName(name.trim())
        // Also update name in members table, reservations and invitations
        await storageService.updateMemberName(user.id, name.trim())
        await storageService.updateUserNameInEvents(user.id, name.trim())
        await storageService.updateUserNameInInvitations(user.id, name.trim())
        // Update license type
        if (licenseType) {
            await storageService.updateMemberLicense(user.id, licenseType)
        }
        setIsSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Paramètres</h1>
            </div>

            {/* Profile Section */}
            <div className={clsx('card', styles.section)}>
                <h2 className={styles.sectionHeading}>
                    <User size={18} />
                    Mon Compte
                </h2>

                {/* Photo de profil */}
                <div className={styles.photoArea}>
                    <div
                        onClick={() => profilePhotoUrl && setShowPhotoModal(true)}
                        className={clsx(
                            styles.photoCircle,
                            profilePhotoUrl && styles.photoCircleClickable
                        )}
                    >
                        {profilePhotoUrl ? (
                            <img
                                src={profilePhotoUrl}
                                alt="Photo de profil"
                                className={styles.photoImg}
                            />
                        ) : (
                            <span className={styles.photoInitial}>
                                {user?.name?.charAt(0).toUpperCase() || '?'}
                            </span>
                        )}
                        {photoUploading && <div className={styles.photoLoading}>Chargement...</div>}
                    </div>

                    <div className={styles.photoActions}>
                        <label className={styles.photoUploadLabel}>
                            <Camera size={16} />
                            {profilePhotoUrl ? 'Changer' : 'Ajouter une photo'}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className={styles.hiddenInput}
                                disabled={photoUploading}
                            />
                        </label>
                        {profilePhotoUrl && (
                            <button
                                type="button"
                                onClick={handleDeletePhoto}
                                disabled={photoUploading}
                                className={styles.photoDeleteBtn}
                            >
                                <Trash2 size={16} />
                                Supprimer
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <div className={styles.formGroup}>
                        <label className={clsx('form-label', styles.labelMuted)}>
                            <Mail size={14} className="label-icon" />
                            Email
                        </label>
                        <div className={styles.emailDisplay}>{user?.email}</div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className="form-label">Prénom Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Votre nom"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className={styles.formGroupLg}>
                        <label className="form-label">
                            <Award size={14} className="label-icon" />
                            Type de licence
                        </label>
                        <div className={styles.licenseRow}>
                            <button
                                type="button"
                                onClick={() => setLicenseType('L')}
                                className={clsx(
                                    styles.licenseBtn,
                                    licenseType === 'L' && styles.licenseBtnActive
                                )}
                            >
                                Loisir (L)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLicenseType('C')}
                                className={clsx(
                                    styles.licenseBtn,
                                    licenseType === 'C' && styles.licenseBtnActive
                                )}
                            >
                                Compétition (C)
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={clsx('btn btn-primary', styles.saveBtn)}
                        disabled={isSaving}
                    >
                        {saved ? (
                            <>✓ Enregistré</>
                        ) : (
                            <>
                                <Save size={18} />
                                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Password Section */}
            <div className={clsx('card', styles.section)}>
                <h2 className={styles.sectionHeading}>
                    <Lock size={18} />
                    Mot de passe
                </h2>

                <button
                    onClick={() => setShowPasswordModal(true)}
                    className={clsx('btn', styles.passwordBtn)}
                >
                    <Lock size={16} />
                    Modifier le mot de passe
                </button>
            </div>

            {/* Notifications Section */}
            <div className={clsx('card', styles.section)}>
                <h2 className={styles.sectionHeading}>
                    <Bell size={18} />
                    Notifications
                </h2>

                {!notifSupported ? (
                    <div className={styles.notifUnsupported}>
                        <Smartphone size={16} />
                        Les notifications ne sont pas supportées sur ce navigateur.
                    </div>
                ) : notifPermission === 'denied' && !notifEnabled ? (
                    <div className={styles.notifDenied}>
                        <p className={styles.notifDeniedTitle}>Notifications bloquées</p>
                        <p className={styles.notifDeniedText}>
                            Vous avez refusé les notifications. Pour les activer, modifiez les
                            paramètres de votre navigateur pour ce site.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Master toggle */}
                        <div
                            className={clsx(
                                styles.notifToggle,
                                notifEnabled && styles.notifToggleEnabled
                            )}
                        >
                            <div>
                                <div className={styles.notifToggleLabel}>
                                    {notifEnabled
                                        ? 'Notifications activées'
                                        : 'Notifications désactivées'}
                                </div>
                                <div className={styles.notifToggleSub}>
                                    Recevez des alertes sur votre appareil
                                </div>
                            </div>
                            <button
                                onClick={handleToggleNotifications}
                                disabled={notifLoading}
                                className={clsx(
                                    styles.notifToggleBtn,
                                    notifEnabled && styles.notifToggleBtnDisable,
                                    notifLoading && styles.notifToggleBtnLoading
                                )}
                            >
                                {notifEnabled ? <BellOff size={16} /> : <Bell size={16} />}
                                {notifLoading ? '...' : notifEnabled ? 'Désactiver' : 'Activer'}
                            </button>
                        </div>

                        {/* Granular preferences - only show if enabled */}
                        {notifEnabled && (
                            <div className={styles.notifPrefs}>
                                <label className={styles.notifPrefLabel}>
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs.invitations_enabled}
                                        onChange={(e) =>
                                            handleUpdateNotifPref(
                                                'invitations_enabled',
                                                e.target.checked
                                            )
                                        }
                                        className={styles.notifPrefCheckbox}
                                    />
                                    <div>
                                        <div className={styles.notifPrefTitle}>Invitations</div>
                                        <div className={styles.notifPrefSub}>
                                            Quand quelqu'un vous invite sur un créneau
                                        </div>
                                    </div>
                                </label>

                                <label className={styles.notifPrefLabel}>
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs.slot_openings_enabled}
                                        onChange={(e) =>
                                            handleUpdateNotifPref(
                                                'slot_openings_enabled',
                                                e.target.checked
                                            )
                                        }
                                        className={styles.notifPrefCheckbox}
                                    />
                                    <div>
                                        <div className={styles.notifPrefTitle}>
                                            Ouvertures de créneaux
                                        </div>
                                        <div className={styles.notifPrefSub}>
                                            Quand un créneau correspondant à votre licence s'ouvre
                                        </div>
                                    </div>
                                </label>

                                {/* Test button */}
                                <button
                                    onClick={handleTestNotification}
                                    className={clsx('btn', styles.notifTestBtn)}
                                >
                                    Tester les notifications
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Logout Section */}
            <div className="card">
                <button onClick={handleLogout} className={clsx('btn', styles.logoutBtn)}>
                    Se déconnecter
                </button>
            </div>

            {/* Version info */}
            <p className={styles.version}>Ping Pong Club PWA v1.0</p>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className={clsx('modal-overlay', styles.modalPadding)}>
                    <div className={clsx('card', styles.modalCard)}>
                        <ChangePassword
                            forced={false}
                            onClose={() => setShowPasswordModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Photo Modal - affichage en grand */}
            {showPhotoModal && profilePhotoUrl && (
                <div
                    onClick={() => setShowPhotoModal(false)}
                    className={clsx('modal-overlay modal-overlay--darker', styles.modalPadding)}
                >
                    <div className={styles.photoModalContent}>
                        <img
                            src={profilePhotoUrl}
                            alt="Photo de profil"
                            className={styles.photoModalImg}
                        />
                        <button
                            onClick={() => setShowPhotoModal(false)}
                            className={styles.photoModalClose}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
