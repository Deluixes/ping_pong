import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'

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
            <div className="change-password-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: forced ? '80vh' : 'auto',
                padding: forced ? '2rem' : '1rem'
            }}>
                <div className={forced ? 'card' : ''} style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: '#D1FAE5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <Check size={40} color="#059669" />
                    </div>

                    <h2 style={{ marginBottom: '1rem', color: 'var(--color-secondary)' }}>
                        Mot de passe modifié !
                    </h2>

                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {forced
                            ? 'Vous allez être redirigé vers l\'accueil...'
                            : 'Votre mot de passe a été mis à jour avec succès.'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="change-password-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: forced ? '80vh' : 'auto',
            padding: forced ? '2rem' : '1rem'
        }}>
            <div className={forced ? 'card' : ''} style={{ width: '100%', maxWidth: '400px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: 0
                    }}>
                        <Lock size={20} />
                        {forced ? 'Créer votre mot de passe' : 'Modifier le mot de passe'}
                    </h2>
                    {!forced && onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-muted)',
                                padding: '0.25rem'
                            }}
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {forced && (
                    <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem',
                        marginBottom: '1.5rem',
                        color: '#92400E',
                        fontSize: '0.85rem'
                    }}>
                        Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant de continuer.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* New password field */}
                    <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            Nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    paddingRight: '2.5rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid #DDD',
                                    fontSize: '1rem'
                                }}
                                required
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-text-muted)',
                                    padding: '0.25rem'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm password field */}
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            Confirmer le mot de passe
                        </label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #DDD',
                                fontSize: '1rem'
                            }}
                            required
                        />
                    </div>

                    {/* Error message */}
                    {(error || authError) && (
                        <div style={{
                            background: '#FEE2E2',
                            border: '1px solid #EF4444',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            color: '#991B1B',
                            fontSize: '0.85rem'
                        }}>
                            {error || authError}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        disabled={isSubmitting}
                    >
                        <Lock size={18} />
                        {isSubmitting ? 'Modification...' : 'Enregistrer le mot de passe'}
                    </button>
                </form>

                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    Le mot de passe doit contenir au moins 8 caractères.
                </p>
            </div>
        </div>
    )
}
