import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
    const [name, setName] = useState('')
    const { login, user } = useAuth()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const navigate = useNavigate()

    // If already logged in, redirect to home
    if (user) {
        return <Navigate to="/" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSubmitting(true)
        try {
            await login(name)
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
                    {/* Simple SVG Logo Placeholder */}
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12h20"></path>
                        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3 3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z"></path>
                        <path d="M12 15v7"></path>
                    </svg>
                    <h1 style={{ marginTop: '1rem' }}>Ping Pong Club</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>S'inscrire pour jouer</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Votre Prénom / Surnom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Marco, PingMaster..."
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
            </div>
        </div>
    )
}
