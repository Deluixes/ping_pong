import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Check, ArrowLeft, UserPlus, LogIn } from 'lucide-react'

export default function Login() {
    const [activeTab, setActiveTab] = useState('login') // 'login' | 'signup'
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [step, setStep] = useState('form') // 'form' | 'sent'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const { user, loading, sendMagicLink, authError } = useAuth()

    // Attendre que le chargement soit terminé avant de décider quoi afficher
    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)

        if (activeTab === 'signup' && !name.trim()) {
            setError('Veuillez entrer votre nom')
            return
        }
        if (!email.trim()) {
            setError('Veuillez entrer votre email')
            return
        }

        setIsSubmitting(true)

        // For signup, we pass the name. For login, we don't (Supabase will use existing metadata)
        const result = await sendMagicLink(email, activeTab === 'signup' ? name : null)
        setIsSubmitting(false)

        if (result.success) {
            setStep('sent')
        } else if (result.error?.includes('already registered') || result.error?.includes('User already registered')) {
            // User exists, suggest login
            setError('Cet email est déjà inscrit. Utilisez l\'onglet Connexion.')
            setActiveTab('login')
        }
    }

    const resetForm = () => {
        setStep('form')
        setError(null)
    }

    const switchTab = (tab) => {
        setActiveTab(tab)
        setError(null)
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

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                disabled={isSubmitting}
                            >
                                <Mail size={18} />
                                {isSubmitting ? 'Envoi...' : 'Recevoir le lien de connexion'}
                            </button>
                        </form>

                        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                            {activeTab === 'signup'
                                ? 'Un lien de confirmation sera envoyé à votre email.'
                                : 'Un lien de connexion sera envoyé à votre email.'}
                        </p>
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
                            Email envoyé !
                        </h2>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                            Un lien de connexion a été envoyé à<br />
                            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
                        </p>

                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem'
                        }}>
                            📧 Vérifiez votre boîte mail (et les spams)
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
                            Modifier l'email
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
