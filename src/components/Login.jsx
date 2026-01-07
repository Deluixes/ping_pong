import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Check, ArrowLeft, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react'

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
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    const validatePassword = (pwd) => {
        if (pwd.length < 8) {
            return 'Le mot de passe doit contenir au moins 8 caractères'
        }
        return null
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
            } else if (result.error?.includes('already registered') || result.error?.includes('User already registered')) {
                setError('Cet email est déjà inscrit. Utilisez l\'onglet Connexion.')
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
        <div className="login-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '2rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>

                {step === 'form' && (
                    <>
                        {/* Logo */}
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                                <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                                <rect x="38" y="38" width="8" height="22" rx="4" fill="var(--color-secondary)" transform="rotate(-45 38 38)" />
                                <circle cx="50" cy="14" r="6" fill="white" stroke="var(--color-secondary)" strokeWidth="2" />
                            </svg>
                            <h1 style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>Ping Pong Club</h1>
                        </div>

                        {/* Tabs */}
                        <div style={{
                            display: 'flex',
                            marginBottom: '1.5rem',
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '4px'
                        }}>
                            <button
                                onClick={() => switchTab('login')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    background: activeTab === 'login' ? 'white' : 'transparent',
                                    color: activeTab === 'login' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === 'login' ? '600' : '400',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: activeTab === 'login' ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <LogIn size={16} />
                                Connexion
                            </button>
                            <button
                                onClick={() => switchTab('signup')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    background: activeTab === 'signup' ? 'white' : 'transparent',
                                    color: activeTab === 'signup' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                    fontWeight: activeTab === 'signup' ? '600' : '400',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: activeTab === 'signup' ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <UserPlus size={16} />
                                Inscription
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Name field (only for signup) */}
                            {activeTab === 'signup' && (
                                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                        Prénom Nom
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Jean Dupont"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid #DDD',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Email field */}
                            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jean@example.com"
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

                            {/* Password field */}
                            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Mot de passe
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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

                            {/* Confirm password field (only for signup) */}
                            {activeTab === 'signup' && (
                                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
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
                            )}

                            {/* Forgot password link (only for login) */}
                            {activeTab === 'login' && (
                                <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={goToForgotPassword}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--color-primary)',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        Mot de passe oublié ?
                                    </button>
                                </div>
                            )}

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
                                {isSubmitting ? 'Chargement...' : (activeTab === 'login' ? 'Se connecter' : 'Créer un compte')}
                            </button>
                        </form>

                        {activeTab === 'signup' && (
                            <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                Le mot de passe doit contenir au moins 8 caractères.
                            </p>
                        )}
                    </>
                )}

                {step === 'sent' && (
                    <div style={{ textAlign: 'center' }}>
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
                            Compte créé !
                        </h2>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                            Un email de confirmation a été envoyé à<br />
                            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
                        </p>

                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem'
                        }}>
                            Vérifiez votre boîte mail (et les spams) pour confirmer votre inscription.
                        </div>

                        <button
                            onClick={resetForm}
                            className="btn"
                            style={{
                                width: '100%',
                                background: 'var(--color-bg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <ArrowLeft size={18} />
                            Retour à la connexion
                        </button>
                    </div>
                )}

                {step === 'forgot' && (
                    <div>
                        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            Mot de passe oublié
                        </h2>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                            Entrez votre email pour recevoir un lien de réinitialisation.
                        </p>

                        <form onSubmit={handleForgotPassword}>
                            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jean@example.com"
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

                            {/* Success message */}
                            {successMessage && (
                                <div style={{
                                    background: '#D1FAE5',
                                    border: '1px solid #059669',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    color: '#065F46',
                                    fontSize: '0.85rem'
                                }}>
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', marginBottom: '1rem' }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="btn"
                                style={{
                                    width: '100%',
                                    background: 'var(--color-bg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
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
