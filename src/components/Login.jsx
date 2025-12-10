import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const { login, user } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    // If already logged in, redirect to home
    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!firstName.trim() || !lastName.trim()) return

        setIsSubmitting(true)
        try {
            const fullName = `${firstName.trim()} ${lastName.trim()}`
            await login(fullName)
            navigate('/', { replace: true })
        } finally {
            setIsSubmitting(false)
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
                <div style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>
                    {/* Ping Pong Racket SVG */}
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                        <rect x="38" y="38" width="8" height="22" rx="4" fill="var(--color-secondary)" transform="rotate(-45 38 38)" />
                        <circle cx="50" cy="14" r="6" fill="white" stroke="var(--color-secondary)" strokeWidth="2" />
                    </svg>
                    <h1 style={{ marginTop: '1rem', fontSize: '1.5rem' }}>Ping Pong Club</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Connectez-vous pour réserver</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Prénom</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Jean"
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nom</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Dupont"
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

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Connexion...' : 'Entrer'}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Votre session sera gardée sur cet appareil.
                </p>
            </div>
        </div>
    )
}
