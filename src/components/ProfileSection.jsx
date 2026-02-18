import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { storageService } from '../services/storage'
import { User, Mail, Award, Save, Camera, Trash2 } from 'lucide-react'
import { MAX_PHOTO_SIZE } from '../constants'
import LicenseTypeSelector from './LicenseTypeSelector'
import clsx from 'clsx'
import styles from './ProfileSection.module.css'

export default function ProfileSection() {
    const { user, updateName } = useAuth()
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [name, setName] = useState(user?.name || '')
    const [licenseType, setLicenseType] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)
    const [photoUploading, setPhotoUploading] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)

    useEffect(() => {
        const loadProfile = async () => {
            if (user?.id) {
                const profile = await storageService.getMemberProfile(user.id)
                if (profile) {
                    setLicenseType(profile.licenseType)
                }
                const photoUrl = await storageService.getProfilePhotoUrl(user.id)
                setProfilePhotoUrl(photoUrl)
            }
        }
        loadProfile()
    }, [user?.id])

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            addToast('Veuillez sélectionner une image', 'warning')
            return
        }

        if (file.size > MAX_PHOTO_SIZE) {
            addToast("L'image ne doit pas dépasser 5 Mo", 'warning')
            return
        }

        setPhotoUploading(true)
        const result = await storageService.uploadProfilePhoto(user.id, file)
        setPhotoUploading(false)

        if (result.success) {
            setProfilePhotoUrl(result.url)
        } else {
            addToast(result.error || "Erreur lors de l'upload de la photo", 'error')
        }

        e.target.value = ''
    }

    const handleDeletePhoto = async () => {
        const confirmed = await confirm({
            title: 'Supprimer',
            message: 'Supprimer votre photo de profil ?',
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return

        setPhotoUploading(true)
        const result = await storageService.deleteProfilePhoto(user.id)
        setPhotoUploading(false)

        if (result.success) {
            setProfilePhotoUrl(null)
        } else {
            addToast(result.error || 'Erreur lors de la suppression', 'error')
        }
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        const updates = [updateName(name.trim()), storageService.renameUser(user.id, name.trim())]
        if (licenseType) {
            updates.push(storageService.updateMemberLicense(user.id, licenseType))
        }
        const results = await Promise.all(updates)
        setIsSaving(false)
        if (results.some((r) => r && !r.success)) {
            addToast('Erreur lors de la sauvegarde du profil.', 'error')
            return
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    return (
        <>
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
                    <LicenseTypeSelector value={licenseType} onChange={setLicenseType} />
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

            {/* Photo Modal - affichage en grand */}
            {showPhotoModal && profilePhotoUrl && (
                <div
                    onClick={() => setShowPhotoModal(false)}
                    className="modal-overlay modal-overlay--darker"
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
        </>
    )
}
