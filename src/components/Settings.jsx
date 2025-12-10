import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Save, User, Mail, Shield } from 'lucide-react'

export default function Settings() {
    const { user, updateName, logout } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const handleSave = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        await updateName(name.trim())
        setIsSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                marginTop: '1rem'
            }}>
                <button
                    onClick={() => navigate('/')}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Paramètres</h1>
            </div>

            {/* Profile Section */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <User size={18} />
                    Mon Profil
                </h2>

                <form onSubmit={handleSave}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            <Mail size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Email
                        </label>
                        <div style={{
                            padding: '0.75rem',
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.95rem',
                            color: 'var(--color-text-muted)'
                        }}>
                            {user?.email}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            Prénom Nom
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Votre nom"
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

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
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

            {/* Logout Section */}
            <div className="card">
                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        width: '100%',
                        background: '#FEE2E2',
                        color: '#991B1B',
                        border: '1px solid #FECACA'
                    }}
                >
                    Se déconnecter
                </button>
            </div>

            {/* Version info */}
            <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                Ping Pong Club PWA v1.0
            </p>
        </div>
    )
}
