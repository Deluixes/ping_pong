import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { ArrowLeft, Save, User, Mail, Award } from 'lucide-react'

export default function Settings() {
    const { user, updateName, logout } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [licenseType, setLicenseType] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Charger le profil pour récupérer le type de licence
    useEffect(() => {
        const loadProfile = async () => {
            if (user?.id) {
                const profile = await storageService.getMemberProfile(user.id)
                if (profile) {
                    setLicenseType(profile.licenseType)
                }
            }
        }
        loadProfile()
    }, [user?.id])

    const handleSave = async (e) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        await updateName(name.trim())
        // Also update name in existing reservations
        await storageService.updateUserNameInEvents(user.id, name.trim())
        // Update license type
        if (licenseType) {
            await storageService.updateMemberLicense(user.id, licenseType)
        }
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

                    <div style={{ marginBottom: '1rem' }}>
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

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            <Award size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            Type de licence
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setLicenseType('L')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${licenseType === 'L' ? 'var(--color-primary)' : '#DDD'}`,
                                    background: licenseType === 'L' ? '#EFF6FF' : 'white',
                                    cursor: 'pointer',
                                    fontWeight: licenseType === 'L' ? '600' : '400',
                                    color: licenseType === 'L' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Loisir (L)
                            </button>
                            <button
                                type="button"
                                onClick={() => setLicenseType('C')}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${licenseType === 'C' ? 'var(--color-primary)' : '#DDD'}`,
                                    background: licenseType === 'C' ? '#EFF6FF' : 'white',
                                    cursor: 'pointer',
                                    fontWeight: licenseType === 'C' ? '600' : '400',
                                    color: licenseType === 'C' ? 'var(--color-primary)' : 'var(--color-text)'
                                }}
                            >
                                Compétition (C)
                            </button>
                        </div>
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
