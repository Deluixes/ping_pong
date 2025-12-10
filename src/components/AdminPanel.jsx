import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService, GROUP_NAME } from '../services/storage'
import { ArrowLeft, Check, X, UserCheck, UserX, Users, RefreshCw } from 'lucide-react'

export default function AdminPanel() {
    const navigate = useNavigate()
    const [members, setMembers] = useState({ pending: [], approved: [] })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadMembers = async () => {
        const data = await storageService.getMembers()
        setMembers(data)
        setLoading(false)
    }

    useEffect(() => {
        loadMembers()
    }, [])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadMembers()
        setRefreshing(false)
    }

    const handleApprove = async (userId) => {
        await storageService.approveMember(userId)
        await loadMembers()
    }

    const handleReject = async (userId) => {
        if (window.confirm('Refuser cette demande ?')) {
            await storageService.rejectMember(userId)
            await loadMembers()
        }
    }

    const handleRemove = async (userId, name) => {
        if (window.confirm(`Retirer ${name} du groupe ?`)) {
            await storageService.removeMember(userId)
            await loadMembers()
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
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Gestion des membres</h1>
                <button
                    onClick={handleRefresh}
                    className="btn"
                    style={{ marginLeft: 'auto', background: 'var(--color-bg)', padding: '0.5rem' }}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {/* Group Name */}
            <div style={{
                background: 'var(--color-primary)',
                color: 'white',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                textAlign: 'center'
            }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{GROUP_NAME}</h2>
            </div>

            {/* Pending Requests */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{
                    fontSize: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#F59E0B'
                }}>
                    <UserCheck size={18} />
                    Demandes en attente ({members.pending.length})
                </h2>

                {members.pending.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Aucune demande en attente
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.pending.map(member => (
                            <div
                                key={member.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: '#FEF3C7',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '500' }}>{member.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApprove(member.userId)}
                                    style={{
                                        background: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Approuver"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={() => handleReject(member.userId)}
                                    style={{
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Refuser"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved Members */}
            <div className="card">
                <h2 style={{
                    fontSize: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#10B981'
                }}>
                    <Users size={18} />
                    Membres approuvés ({members.approved.length})
                </h2>

                {members.approved.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Aucun membre approuvé
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.approved.map(member => (
                            <div
                                key={member.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '500' }}>{member.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(member.userId, member.name)}
                                    style={{
                                        background: '#FEE2E2',
                                        color: '#991B1B',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Retirer du groupe"
                                >
                                    <UserX size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
