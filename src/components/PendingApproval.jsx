import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { GROUP_NAME } from '../services/storage'
import { UserPlus, Clock, LogOut, RefreshCw } from 'lucide-react'

export default function PendingApproval() {
    const { user, memberStatus, requestAccess, logout, refreshMemberStatus } = useAuth()
    const [isRequesting, setIsRequesting] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRequestAccess = async () => {
        setIsRequesting(true)
        await requestAccess()
        setIsRequesting(false)
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refreshMemberStatus()
        setIsRefreshing(false)
    }

    const handleLogout = async () => {
        await logout()
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '2rem',
            textAlign: 'center'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                {/* Logo */}
                <div style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                        <rect x="38" y="38" width="8" height="22" rx="4" fill="var(--color-secondary)" transform="rotate(-45 38 38)" />
                        <circle cx="50" cy="14" r="6" fill="white" stroke="var(--color-secondary)" strokeWidth="2" />
                    </svg>
                    <h1 style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>{GROUP_NAME}</h1>
                </div>

                {memberStatus === 'none' && (
                    <>
                        <div style={{
                            background: 'var(--color-bg)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            marginBottom: '1.5rem'
                        }}>
                            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                                Bienvenue <strong>{user?.name}</strong> !<br />
                                Pour accéder au planning, vous devez rejoindre le groupe.
                            </p>
                        </div>

                        <button
                            onClick={handleRequestAccess}
                            className="btn btn-primary"
                            disabled={isRequesting}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <UserPlus size={18} />
                            {isRequesting ? 'Envoi...' : 'Demander à rejoindre le groupe'}
                        </button>
                    </>
                )}

                {memberStatus === 'pending' && (
                    <>
                        <div style={{
                            background: '#FEF3C7',
                            border: '1px solid #F59E0B',
                            borderRadius: 'var(--radius-md)',
                            padding: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <Clock size={40} color="#F59E0B" style={{ marginBottom: '0.75rem' }} />
                            <h2 style={{ margin: '0 0 0.5rem', color: '#92400E', fontSize: '1.1rem' }}>
                                Demande en attente
                            </h2>
                            <p style={{ margin: 0, color: '#92400E', fontSize: '0.9rem' }}>
                                Votre demande a été envoyée.<br />
                                Un administrateur doit valider votre accès.
                            </p>
                        </div>

                        <button
                            onClick={handleRefresh}
                            className="btn"
                            disabled={isRefreshing}
                            style={{
                                width: '100%',
                                background: 'var(--color-bg)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.75rem'
                            }}
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                            Vérifier le statut
                        </button>
                    </>
                )}

                <button
                    onClick={handleLogout}
                    className="btn"
                    style={{
                        width: '100%',
                        background: 'transparent',
                        color: 'var(--color-text-muted)',
                        border: '1px solid #E2E8F0'
                    }}
                >
                    <LogOut size={16} style={{ marginRight: '0.5rem' }} />
                    Se déconnecter
                </button>

                <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Connecté en tant que {user?.email}
                </p>
            </div>
        </div>
    )
}
