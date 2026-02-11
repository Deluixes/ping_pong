import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Check, ArrowLeft, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { validatePassword } from '../utils/validation'
import styles from './Login.module.css'

export default function Login() {
    const [activeTab, setActiveTab] = useState('login') // 'login' | 'signup'
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [step, setStep] = useState('form') // 'form' | 'sent' | 'forgot'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const { user, loading, signIn, signUp, resetPassword, authError } = useAuth()

    // Attendre que le chargement soit terminé avant de décider quoi afficher
    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if (activeTab === 'signup') {
            if (!name.trim()) {
                setError('Veuillez entrer votre nom')
                return
            }
            const pwdError = validatePassword(password)
            if (pwdError) {
                setError(pwdError)
                return
            }
            if (password !== confirmPassword) {
                setError('Les mots de passe ne correspondent pas')
                return
            }
        }

        if (!email.trim()) {
            setError('Veuillez entrer votre email')
            return
        }
        if (!password) {
            setError('Veuillez entrer votre mot de passe')
            return
        }

        setIsSubmitting(true)

        if (activeTab === 'signup') {
            const result = await signUp(email, password, name)
            setIsSubmitting(false)

            if (result.success) {
                setStep('sent')
            } else if (
                result.error?.includes('already registered') ||
                result.error?.includes('User already registered')
            ) {
                setError("Cet email est déjà inscrit. Utilisez l'onglet Connexion.")
                setActiveTab('login')
            }
        } else {
            const result = await signIn(email, password)
            setIsSubmitting(false)

            if (!result.success) {
                if (result.error?.includes('Invalid login credentials')) {
                    setError('Email ou mot de passe incorrect')
                } else {
                    setError(result.error || 'Erreur de connexion')
                }
            }
            // Si succès, le useEffect dans AuthContext gère la redirection
        }
    }

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)

        if (!email.trim()) {
            setError('Veuillez entrer votre email')
            return
        }

        setIsSubmitting(true)
        const result = await resetPassword(email)
        setIsSubmitting(false)

        if (result.success) {
            setSuccessMessage('Un email de réinitialisation a été envoyé à ' + email)
        }
    }

    const resetForm = () => {
        setStep('form')
        setError(null)
        setSuccessMessage(null)
        setPassword('')
        setConfirmPassword('')
    }

    const switchTab = (tab) => {
        setActiveTab(tab)
        setError(null)
        setSuccessMessage(null)
        setPassword('')
        setConfirmPassword('')
    }

    const goToForgotPassword = () => {
        setStep('forgot')
        setError(null)
        setSuccessMessage(null)
    }

    return (
        <div className={styles.container}>
            <div className={clsx('card', styles.cardWrapper)}>
                {step === 'form' && (
                    <>
                        {/* Logo */}
                        <div className={styles.logoSection}>
                            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                                <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                                <rect
                                    x="38"
                                    y="38"
                                    width="8"
                                    height="22"
                                    rx="4"
                                    fill="var(--color-secondary)"
                                    transform="rotate(-45 38 38)"
                                />
                                <circle
                                    cx="50"
                                    cy="14"
                                    r="6"
                                    fill="white"
                                    stroke="var(--color-secondary)"
                                    strokeWidth="2"
                                />
                            </svg>
                            <h1 className={styles.logoTitle}>Ping Pong Club</h1>
                        </div>

                        {/* Tabs */}
                        <div className="tab-bar">
                            <button
                                onClick={() => switchTab('login')}
                                className={clsx(
                                    'tab-btn',
                                    activeTab === 'login' && 'tab-btn--active'
                                )}
                            >
                                <LogIn size={16} />
                                Connexion
                            </button>
                            <button
                                onClick={() => switchTab('signup')}
                                className={clsx(
                                    'tab-btn',
                                    activeTab === 'signup' && 'tab-btn--active'
                                )}
                            >
                                <UserPlus size={16} />
                                Inscription
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Name field (only for signup) */}
                            {activeTab === 'signup' && (
                                <div className={styles.formGroup}>
                                    <label className="form-label">Prénom Nom</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jean Dupont"
                                        className="form-input"
                                    />
                                </div>
                            )}

                            {/* Email field */}
                            <div className={styles.formGroup}>
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jean@example.com"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {/* Password field */}
                            <div className={styles.formGroup}>
                                <label className="form-label">Mot de passe</label>
                                <div className={styles.passwordWrapper}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={clsx('form-input', styles.passwordInput)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={clsx('icon-btn', styles.eyeToggle)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm password field (only for signup) */}
                            {activeTab === 'signup' && (
                                <div className={styles.formGroup}>
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
                            )}

                            {/* Forgot password link (only for login) */}
                            {activeTab === 'login' && (
                                <div className={styles.forgotPasswordRow}>
                                    <button
                                        type="button"
                                        onClick={goToForgotPassword}
                                        className={styles.forgotPasswordLink}
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}

                            {/* Error message */}
                            {(error || authError) && (
                                <div className={clsx('alert', 'alert--error', styles.alertBox)}>
                                    {error || authError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={clsx('btn', 'btn-primary', styles.submitBtn)}
                                disabled={isSubmitting}
                            >
                                <Lock size={18} />
                                {isSubmitting
                                    ? 'Chargement...'
                                    : activeTab === 'login'
                                      ? 'Se connecter'
                                      : 'Créer un compte'}
                            </button>
                        </form>

                        {activeTab === 'signup' && (
                            <p className={styles.signupHint}>
                                Le mot de passe doit contenir au moins 8 caractères.
                            </p>
                        )}
                    </>
                )}

                {step === 'sent' && (
                    <div className={styles.sentWrapper}>
                        <div className={styles.sentIcon}>
                            <Check size={40} color="#059669" />
                        </div>

                        <h2 className={styles.sentTitle}>Compte créé !</h2>

                        <p className={styles.sentText}>
                            Un email de confirmation a été envoyé à<br />
                            <strong className={styles.sentEmailHighlight}>{email}</strong>
                        </p>

                        <div className={styles.sentInfoBox}>
                            Vérifiez votre boîte mail (et les spams) pour confirmer votre
                            inscription.
                        </div>

                        <button onClick={resetForm} className={clsx('btn', styles.backBtn)}>
                            <ArrowLeft size={18} />
                            Retour à la connexion
                        </button>
                    </div>
                )}

                {step === 'forgot' && (
                    <div>
                        <h2 className={styles.forgotTitle}>Mot de passe oublié</h2>

                        <p className={styles.forgotText}>
                            Entrez votre email pour recevoir un lien de réinitialisation.
                        </p>

                        <form onSubmit={handleForgotPassword}>
                            <div className={styles.formGroupLg}>
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jean@example.com"
                                    className="form-input"
                                    required
                                />
                            </div>

                            {/* Error message */}
                            {(error || authError) && (
                                <div className={clsx('alert', 'alert--error', styles.alertBox)}>
                                    {error || authError}
                                </div>
                            )}

                            {/* Success message */}
                            {successMessage && (
                                <div
                                    className={clsx(
                                        'alert',
                                        'alert--success',
                                        styles.alertBoxSuccess
                                    )}
                                >
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={clsx('btn', 'btn-primary', styles.forgotSubmitBtn)}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className={clsx('btn', styles.backBtn)}
                            >
                                <ArrowLeft size={18} />
                                Retour à la connexion
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
