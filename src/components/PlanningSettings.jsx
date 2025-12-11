import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService } from '../services/storage'
import { ArrowLeft, Check, RefreshCw, Settings, Calendar, Plus, Edit2, Trash2, X } from 'lucide-react'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function PlanningSettings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('tables') // 'tables' | 'schedule'
    const [loading, setLoading] = useState(true)

    // Settings state
    const [totalTables, setTotalTables] = useState(8)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    // Blocked slots state
    const [blockedSlots, setBlockedSlots] = useState([])
    const [togglingSlot, setTogglingSlot] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [editingSlot, setEditingSlot] = useState(null)
    const [formData, setFormData] = useState({
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '19:30',
        group: '',
        coach: '',
        name: ''
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const [tables, blocked] = await Promise.all([
                storageService.getSetting('total_tables'),
                storageService.getBlockedSlots()
            ])
            if (tables) setTotalTables(parseInt(tables))
            setBlockedSlots(blocked)
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

    // Blocked slots handlers
    const handleAdd = () => {
        setEditingSlot(null)
        setFormData({
            dayOfWeek: 1,
            startTime: '18:00',
            endTime: '19:30',
            group: '',
            coach: '',
            name: ''
        })
        setShowModal(true)
    }

    const handleEdit = (slot) => {
        setEditingSlot(slot)
        setFormData({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            group: slot.group || '',
            coach: slot.coach,
            name: slot.name
        })
        setShowModal(true)
    }

    const handleSaveSlot = async () => {
        if (!formData.coach || !formData.name || !formData.startTime || !formData.endTime) return
        setSaving(true)

        if (editingSlot) {
            await storageService.updateBlockedSlot(editingSlot.id, formData)
            setBlockedSlots(prev => prev.map(s =>
                s.id === editingSlot.id ? { ...s, ...formData } : s
            ))
        } else {
            const result = await storageService.createBlockedSlot(formData)
            if (result.success) {
                const updated = await storageService.getBlockedSlots()
                setBlockedSlots(updated)
            }
        }

        setSaving(false)
        setShowModal(false)
    }

    const handleDelete = async (slot) => {
        if (!window.confirm(`Supprimer "${slot.name}" ?`)) return
        await storageService.deleteBlockedSlot(slot.id)
        setBlockedSlots(prev => prev.filter(s => s.id !== slot.id))
    }

    const handleToggleSlot = async (slot) => {
        setTogglingSlot(slot.id)
        await storageService.toggleBlockedSlot(slot.id, !slot.enabled)
        setBlockedSlots(prev => prev.map(s =>
            s.id === slot.id ? { ...s, enabled: !s.enabled } : s
        ))
        setTogglingSlot(null)
    }

    const formatTime = (time) => time?.slice(0, 5) || ''

    // Grouper par jour
    const slotsByDay = blockedSlots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = []
        acc[slot.dayOfWeek].push(slot)
        return acc
    }, {})

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
                <div>
                    {/* Header avec bouton Ajouter */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-primary)'
                        }}>
                            <Calendar size={18} />
                            Créneaux bloqués
                        </h2>
                        <button
                            onClick={handleAdd}
                            className="btn btn-primary"
                            style={{
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>

                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    }}>
                        Ces créneaux sont réservés aux entraînements et apparaissent comme bloqués dans le planning.
                    </p>

                    {/* Liste des créneaux par jour */}
                    {blockedSlots.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Aucun créneau bloqué configuré
                            </p>
                        </div>
                    ) : (
                        Object.entries(slotsByDay)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, slots]) => (
                                <div key={day} style={{ marginBottom: '1rem' }}>
                                    <h3 style={{
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        color: 'var(--color-secondary)',
                                        marginBottom: '0.5rem',
                                        paddingLeft: '0.5rem'
                                    }}>
                                        {DAYS[day]}
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {slots.map(slot => (
                                            <div
                                                key={slot.id}
                                                className="card"
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    opacity: slot.enabled ? 1 : 0.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem'
                                                }}
                                            >
                                                {/* Toggle */}
                                                <button
                                                    onClick={() => handleToggleSlot(slot)}
                                                    disabled={togglingSlot === slot.id}
                                                    style={{
                                                        width: '44px',
                                                        height: '24px',
                                                        borderRadius: '12px',
                                                        border: 'none',
                                                        background: slot.enabled ? 'var(--color-primary)' : '#CBD5E1',
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        transition: 'background 0.2s',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        left: slot.enabled ? '22px' : '2px',
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: 'white',
                                                        transition: 'left 0.2s',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                    }} />
                                                </button>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontWeight: '500',
                                                        fontSize: '0.9rem',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {slot.name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.8rem',
                                                        color: 'var(--color-text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        flexWrap: 'wrap'
                                                    }}>
                                                        <span>{formatTime(slot.startTime)}-{formatTime(slot.endTime)}</span>
                                                        <span>• {slot.coach}</span>
                                                        {slot.group && (
                                                            <span style={{
                                                                background: '#E0F2FE',
                                                                color: '#0369A1',
                                                                padding: '0.1rem 0.4rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.7rem',
                                                                fontWeight: '500'
                                                            }}>
                                                                {slot.group}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button
                                                        onClick={() => handleEdit(slot)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'var(--color-text-muted)',
                                                            cursor: 'pointer',
                                                            padding: '0.5rem'
                                                        }}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(slot)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#EF4444',
                                                            cursor: 'pointer',
                                                            padding: '0.5rem'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            )}

            {/* Modal création/édition */}
            {showModal && (
                <>
                    <div
                        onClick={() => setShowModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '400px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        zIndex: 1001,
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                {editingSlot ? 'Modifier le créneau' : 'Nouveau créneau'}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0.25rem'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Jour */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Jour
                                </label>
                                <select
                                    value={formData.dayOfWeek}
                                    onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid #DDD',
                                        fontSize: '1rem'
                                    }}
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Heures */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                        Début
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid #DDD',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                        Fin
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid #DDD',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Nom */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Nom de l'entraînement *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Entraînements Jeunes Compétition"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid #DDD',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            {/* Entraîneur */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Entraîneur *
                                </label>
                                <input
                                    type="text"
                                    value={formData.coach}
                                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                                    placeholder="Ex: Freddy"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid #DDD',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            {/* Groupe */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Groupe (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={formData.group}
                                    onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                                    placeholder="Ex: G1, G2, G3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid #DDD',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            {/* Boutons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: 'var(--color-bg)'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveSlot}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={saving || !formData.name || !formData.coach}
                                >
                                    {saving ? (
                                        <RefreshCw size={18} className="spin" />
                                    ) : (
                                        editingSlot ? 'Modifier' : 'Créer'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
