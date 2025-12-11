import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService } from '../services/storage'
import { ArrowLeft, Check, RefreshCw, Settings, Calendar } from 'lucide-react'

export default function PlanningSettings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('tables') // 'tables' | 'schedule'
    const [loading, setLoading] = useState(true)

    // Settings state
    const [totalTables, setTotalTables] = useState(8)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const tables = await storageService.getSetting('total_tables')
            if (tables) setTotalTables(parseInt(tables))
            setLoading(false)
        }
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
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Gestion du planning</h1>
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
                    onClick={() => setActiveTab('tables')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'tables' ? 'white' : 'transparent',
                        color: activeTab === 'tables' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'tables' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'tables' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Settings size={16} />
                    Tables
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'schedule' ? 'white' : 'transparent',
                        color: activeTab === 'schedule' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'schedule' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'schedule' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Calendar size={16} />
                    Planning
                </button>
            </div>

            {/* Onglet Tables */}
            {activeTab === 'tables' && (
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
                        Configuration des tables
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
                            margin: '0.5rem 0 0 0'
                        }}>
                            Capacité max par créneau : <strong>{totalTables * 2} personnes</strong>
                        </p>
                        <p style={{
                            color: 'var(--color-text-muted)',
                            fontSize: '0.8rem',
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

            {/* Onglet Planning */}
            {activeTab === 'schedule' && (
                <div className="card">
                    <h2 style={{
                        fontSize: '1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--color-primary)'
                    }}>
                        <Calendar size={18} />
                        Configuration du planning
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                        Fonctionnalité à venir...
                    </p>
                </div>
            )}
        </div>
    )
}
