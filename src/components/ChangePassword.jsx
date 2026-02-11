import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'
import clsx from 'clsx'
import styles from './ChangePassword.module.css'

export default function ChangePassword({ forced = false, onClose = null }) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const { changePassword, authError } = useAuth()
    const navigate = useNavigate()

    const validatePassword = (pwd) => {
        if (pwd.length < 8) {
            return 'Le mot de passe doit contenir au moins 8 caractères'
        }
        return null
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        const pwdError = validatePassword(newPassword)
        if (pwdError) {
            setError(pwdError)
            return
        }

        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas')
            return
        }

        setIsSubmitting(true)
        const result = await changePassword(newPassword)
        setIsSubmitting(false)

        if (result.success) {
            setSuccess(true)
            // Si changement forcé, rediriger vers l'accueil après 2 secondes
            if (forced) {
                setTimeout(() => {
                    navigate('/')
                }, 2000)
            } else if (onClose) {
                // Si modal, fermer après 1.5 secondes
                setTimeout(() => {
                    onClose()
                }, 1500)
            }
        }
    }

    // Vue succès
    if (success) {
        return (
            <div className={clsx(styles.container, forced && styles.containerForced)}>
                <div className={clsx(styles.inner, styles.innerSuccess, forced && 'card')}>
                    <div className={styles.successIcon}>
                        <Check size={40} color="#059669" />
                    </div>

                    <h2 className={styles.successHeading}>Mot de passe modifié !</h2>

                    <p className={styles.successText}>
                        {forced
                            ? "Vous allez être redirigé vers l'accueil..."
                            : 'Votre mot de passe a été mis à jour avec succès.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className={clsx(styles.container, forced && styles.containerForced)}>
            <div className={clsx(styles.inner, forced && 'card')}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        <Lock size={20} />
                        {forced ? 'Créer votre mot de passe' : 'Modifier le mot de passe'}
                    </h2>
                    {!forced && onClose && (
                        <button onClick={onClose} className="icon-btn icon-btn--muted">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {forced && (
                    <div className={clsx('alert', 'alert--warning', styles.warningBox)}>
                        Pour des raisons de sécurité, vous devez définir un nouveau mot de passe
                        avant de continuer.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* New password field */}
                    <div className={styles.fieldGroup}>
                        <label className="form-label">Nouveau mot de passe</label>
                        <div className={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className={clsx('form-input', styles.passwordInput)}
                                required
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className={clsx('icon-btn', 'icon-btn--muted', styles.toggleBtn)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password field */}
                    <div className={styles.fieldGroupLast}>
                        <label className="form-label">Confirmer le mot de passe</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="form-input"
                            required
                        />
                    </div>

                    {/* Error message */}
                    {(error || authError) && (
                        <div className={clsx('alert', 'alert--error', styles.errorAlert)}>
                            {error || authError}
                        </div>
                    )}

                    <button
                        type="submit"
                        className={clsx('btn', 'btn-primary', 'btn-full', styles.submitBtn)}
                        disabled={isSubmitting}
                    >
                        <Lock size={18} />
                        {isSubmitting ? 'Modification...' : 'Enregistrer le mot de passe'}
                    </button>
                </form>

                <p className={styles.hint}>Le mot de passe doit contenir au moins 8 caractères.</p>
            </div>
        </div>
    )
}
