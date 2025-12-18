import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { notificationService } from '../services/notifications'
import { ArrowLeft, Save, User, Mail, Award, Bell, BellOff, Smartphone } from 'lucide-react'

export default function Settings() {
    const { user, updateName, logout } = useAuth()
    const navigate = useNavigate()
    const [name, setName] = useState(user?.name || '')
    const [licenseType, setLicenseType] = useState(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Notification states
    const [notifSupported, setNotifSupported] = useState(false)
    const [notifEnabled, setNotifEnabled] = useState(false)
    const [notifPrefs, setNotifPrefs] = useState({
        invitations_enabled: true,
        slot_openings_enabled: true
    })
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifPermission, setNotifPermission] = useState('default')

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

    // Charger les préférences de notifications
    useEffect(() => {
        const loadNotificationSettings = async () => {
            const supported = notificationService.isSupported()
            setNotifSupported(supported)
            setNotifPermission(notificationService.getPermissionStatus())

            if (supported && user?.id) {
                const prefs = await notificationService.getPreferences(user.id)
                setNotifEnabled(prefs.enabled)
                setNotifPrefs({
                    invitations_enabled: prefs.invitations_enabled,
                    slot_openings_enabled: prefs.slot_openings_enabled
                })
            }
        }
        loadNotificationSettings()
    }, [user?.id])

    // Handlers pour les notifications
    const handleToggleNotifications = async () => {
        setNotifLoading(true)
        if (notifEnabled) {
            await notificationService.disableNotifications(user.id)
            setNotifEnabled(false)
        } else {
            const result = await notificationService.enableNotifications(user.id)
            if (result.success) {
                setNotifEnabled(true)
                setNotifPermission('granted')
            } else {
                alert(result.error || 'Impossible d\'activer les notifications')
                setNotifPermission(notificationService.getPermissionStatus())
            }
        }
        setNotifLoading(false)
    }

    const handleUpdateNotifPref = async (key, value) => {
        const newPrefs = { ...notifPrefs, [key]: value }
        setNotifPrefs(newPrefs)
        await notificationService.updatePreferences(user.id, newPrefs)
    }

    const handleTestNotification = async () => {
        await notificationService.sendTestNotification()
    }

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

            {/* Notifications Section */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={18} />
                    Notifications
                </h2>

                {!notifSupported ? (
                    <div style={{
                        background: '#FEF3C7',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <Smartphone size={16} />
                        Les notifications ne sont pas supportées sur ce navigateur.
                    </div>
                ) : notifPermission === 'denied' && !notifEnabled ? (
                    <div style={{
                        background: '#FEE2E2',
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.9rem',
                        color: '#991B1B'
                    }}>
                        <p style={{ margin: 0, marginBottom: '0.5rem', fontWeight: '500' }}>
                            Notifications bloquées
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                            Vous avez refusé les notifications. Pour les activer, modifiez les paramètres de votre navigateur pour ce site.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Master toggle */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem',
                            background: notifEnabled ? '#F0FDF4' : '#F9FAFB',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: notifEnabled ? '1rem' : 0,
                            border: notifEnabled ? '1px solid #86EFAC' : '1px solid #E5E7EB'
                        }}>
                            <div>
                                <div style={{ fontWeight: '500' }}>
                                    {notifEnabled ? 'Notifications activées' : 'Notifications désactivées'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Recevez des alertes sur votre appareil
                                </div>
                            </div>
                            <button
                                onClick={handleToggleNotifications}
                                disabled={notifLoading}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: notifEnabled ? '#DC2626' : 'var(--color-primary)',
                                    color: 'white',
                                    cursor: notifLoading ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {notifEnabled ? <BellOff size={16} /> : <Bell size={16} />}
                                {notifLoading ? '...' : (notifEnabled ? 'Désactiver' : 'Activer')}
                            </button>
                        </div>

                        {/* Granular preferences - only show if enabled */}
                        {notifEnabled && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs.invitations_enabled}
                                        onChange={(e) => handleUpdateNotifPref('invitations_enabled', e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '500' }}>Invitations</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Quand quelqu'un vous invite sur un créneau
                                        </div>
                                    </div>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs.slot_openings_enabled}
                                        onChange={(e) => handleUpdateNotifPref('slot_openings_enabled', e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '500' }}>Ouvertures de créneaux</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Quand un créneau correspondant à votre licence s'ouvre
                                        </div>
                                    </div>
                                </label>

                                {/* Test button */}
                                <button
                                    onClick={handleTestNotification}
                                    className="btn"
                                    style={{
                                        marginTop: '0.5rem',
                                        background: 'var(--color-bg)',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Tester les notifications
                                </button>
                            </div>
                        )}
                    </>
                )}
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
