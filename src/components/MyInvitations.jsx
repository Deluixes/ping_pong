import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, Check, X, RefreshCw, Mail, Calendar } from 'lucide-react'

export default function MyInvitations() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [invitations, setInvitations] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadInvitations = async () => {
        if (!user) return
        const data = await storageService.getPendingInvitations(user.id)
        setInvitations(data)
        setLoading(false)
    }

    useEffect(() => {
        loadInvitations()
    }, [user])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadInvitations()
        setRefreshing(false)
    }

    const handleAccept = async (inv) => {
        await storageService.acceptInvitation(inv.slotId, inv.date, user.id)
        await loadInvitations()
    }

    const handleDecline = async (inv) => {
        if (window.confirm('Refuser cette invitation ?')) {
            await storageService.declineInvitation(inv.slotId, inv.date, user.id)
            await loadInvitations()
        }
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
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
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Mes invitations</h1>
                <button
                    onClick={handleRefresh}
                    className="btn"
                    style={{ marginLeft: 'auto', background: 'var(--color-bg)', padding: '0.5rem' }}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {invitations.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Mail size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                        Aucune invitation en attente
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {invitations.map((inv, i) => (
                        <div key={`${inv.slotId}-${inv.date}-${i}`} className="card" style={{ padding: '1rem' }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                    {format(new Date(inv.date), 'EEEE d MMMM', { locale: fr })}
                                </div>
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                    Créneau de {inv.slotId}
                                </div>
                                {inv.invitedBy && (
                                    <div style={{ color: 'var(--color-primary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                        Invité par {inv.invitedBy}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => navigate(`/?date=${inv.date}&slot=${inv.slotId}`)}
                                    style={{
                                        background: 'var(--color-primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        fontWeight: '500'
                                    }}
                                    title="Voir sur le planning"
                                >
                                    <Calendar size={18} />
                                </button>
                                <button
                                    onClick={() => handleAccept(inv)}
                                    style={{
                                        flex: 1,
                                        background: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <Check size={18} /> Accepter
                                </button>
                                <button
                                    onClick={() => handleDecline(inv)}
                                    style={{
                                        flex: 1,
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    <X size={18} /> Refuser
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
