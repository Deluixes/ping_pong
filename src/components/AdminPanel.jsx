import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService, GROUP_NAME } from '../services/storage'
import { ArrowLeft, Check, X, UserCheck, UserX, Users, RefreshCw, Shield, ShieldOff, Settings } from 'lucide-react'

export default function AdminPanel() {
    const navigate = useNavigate()
    const [members, setMembers] = useState({ pending: [], approved: [] })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [activeTab, setActiveTab] = useState('members') // 'members' | 'settings'

    // Settings state
    const [totalTables, setTotalTables] = useState(8)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    const loadData = async () => {
        const data = await storageService.getMembers()
        setMembers(data)

        // Load settings
        const tables = await storageService.getSetting('total_tables')
        if (tables) setTotalTables(parseInt(tables))

        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        setSettingsSaved(false)
        await storageService.updateSetting('total_tables', totalTables.toString())
        setSavingSettings(false)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    const handleApprove = async (userId) => {
        await storageService.approveMember(userId)
        await loadData()
    }

    const handleReject = async (userId) => {
        if (window.confirm('Refuser cette demande ?')) {
            await storageService.rejectMember(userId)
            await loadData()
        }
    }

    const handleRemove = async (userId, name) => {
        if (window.confirm(`Retirer ${name} du groupe ?`)) {
            await storageService.removeMember(userId)
            await loadData()
        }
    }

    const handlePromote = async (userId, name) => {
        if (window.confirm(`Nommer ${name} administrateur ?`)) {
            await storageService.updateMemberRole(userId, 'admin')
            await loadData()
        }
    }

    const handleDemote = async (userId, name) => {
        if (window.confirm(`Retirer les droits d'admin à ${name} ?`)) {
            await storageService.updateMemberRole(userId, 'member')
            await loadData()
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

            {/* Tabs */}
            <div style={{
                display: 'flex',
                marginBottom: '1.5rem',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '4px'
            }}>
                <button
                    onClick={() => setActiveTab('members')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'members' ? 'white' : 'transparent',
                        color: activeTab === 'members' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'members' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'members' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={16} />
                    Membres
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'settings' ? 'white' : 'transparent',
                        color: activeTab === 'settings' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'settings' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'settings' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Settings size={16} />
                    Gestion
                </button>
            </div>

            {activeTab === 'members' && (
            <>
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
                                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {member.name}
                                        {member.role === 'admin' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#DBEAFE',
                                                color: '#1E40AF',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold'
                                            }}>
                                                ADMIN
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.email}
                                    </div>
                                </div>

                                {member.role !== 'admin' ? (
                                    <button
                                        onClick={() => handlePromote(member.userId, member.name)}
                                        style={{
                                            background: '#DBEAFE',
                                            color: '#1E40AF',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                        title="Nommer Admin"
                                    >
                                        <Shield size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleDemote(member.userId, member.name)}
                                        style={{
                                            background: '#FEF3C7',
                                            color: '#B45309',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            padding: '0.5rem',
                                            cursor: 'pointer'
                                        }}
                                        title="Retirer Admin"
                                    >
                                        <ShieldOff size={18} />
                                    </button>
                                )}

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
            </>
            )}

            {activeTab === 'settings' && (
            <div className="card">
                <h2 style={{
                    fontSize: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--color-primary)'
                }}>
                    <Settings size={18} />
                    Configuration
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: '500',
                        fontSize: '0.9rem'
                    }}>
                        Nombre de tables
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={totalTables}
                        onChange={(e) => setTotalTables(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #DDD',
                            fontSize: '1rem'
                        }}
                    />
                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        marginTop: '0.5rem',
                        margin: '0.5rem 0 0 0'
                    }}>
                        Capacité max par créneau : <strong>{totalTables * 2} personnes</strong>
                    </p>
                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem',
                        margin: '0.25rem 0 0 0'
                    }}>
                        Un avertissement sera affiché si ce nombre est dépassé.
                    </p>
                </div>

                <button
                    onClick={handleSaveSettings}
                    className="btn btn-primary"
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}
                    disabled={savingSettings}
                >
                    {savingSettings ? (
                        <>
                            <RefreshCw size={18} className="spin" />
                            Enregistrement...
                        </>
                    ) : settingsSaved ? (
                        <>
                            <Check size={18} />
                            Enregistré !
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            Enregistrer
                        </>
                    )}
                </button>
            </div>
            )}
        </div>
    )
}
