import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Check, ArrowLeft } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [step, setStep] = useState('form') // 'form' | 'sent'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { user, sendMagicLink, authError } = useAuth()

    // If already logged in, redirect to home
    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim() || !name.trim()) return

        setIsSubmitting(true)
        const result = await sendMagicLink(email, name)
        setIsSubmitting(false)

        if (result.success) {
            setStep('sent')
        }
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
            <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>

                {step === 'form' && (
                    <>
                        <div style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>
                            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                                <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                                <rect x="38" y="38" width="8" height="22" rx="4" fill="var(--color-secondary)" transform="rotate(-45 38 38)" />
                                <circle cx="50" cy="14" r="6" fill="white" stroke="var(--color-secondary)" strokeWidth="2" />
                            </svg>
                            <h1 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Ping Pong Club</h1>
                            <p style={{ color: 'var(--color-text-muted)' }}>Connexion par email</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Votre nom
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
                                        border: '1px solid #CCC',
                                        fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
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
                                        border: '1px solid #CCC',
                                        fontSize: '1rem'
                                    }}
                                    required
                                />
                            </div>

                            {authError && (
                                <div style={{
                                    background: '#FEE2E2',
                                    border: '1px solid #EF4444',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.75rem',
                                    marginBottom: '1rem',
                                    color: '#991B1B',
                                    fontSize: '0.9rem'
                                }}>
                                    {authError}
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

                        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Un lien de connexion sera envoyé à votre email.
                            <br />Pas de mot de passe à retenir !
                        </p>
                    </>
                )}

                {step === 'sent' && (
                    <>
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
                            Nous avons envoyé un lien de connexion à<br />
                            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
                        </p>

                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            marginBottom: '1.5rem',
                            fontSize: '0.9rem'
                        }}>
                            <p style={{ margin: 0 }}>
                                📧 Vérifiez votre boîte mail<br />
                                (et les spams au cas où)
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('form')}
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
                    </>
                )}
            </div>
        </div>
    )
}
