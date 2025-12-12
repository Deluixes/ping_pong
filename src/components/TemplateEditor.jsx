import React, { useState, useEffect } from 'react'
import { storageService } from '../services/storage'
import { ArrowLeft, Plus, Edit2, Trash2, X, RefreshCw, Clock, Calendar } from 'lucide-react'

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

export default function TemplateEditor({ template, onBack, onUpdate }) {
    const [loading, setLoading] = useState(true)
    const [slots, setSlots] = useState([])
    const [hours, setHours] = useState([])

    // Modal state for slots
    const [showSlotModal, setShowSlotModal] = useState(false)
    const [editingSlot, setEditingSlot] = useState(null)
    const [slotFormData, setSlotFormData] = useState({
        dayOfWeek: 1,
        startTime: '18:00',
        endTime: '19:30',
        name: '',
        coach: '',
        group: '',
        isBlocking: true
    })
    const [savingSlot, setSavingSlot] = useState(false)

    // Modal state for hours
    const [showHourModal, setShowHourModal] = useState(false)
    const [editingHour, setEditingHour] = useState(null)
    const [hourFormData, setHourFormData] = useState({
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '23:00'
    })
    const [savingHour, setSavingHour] = useState(false)

    // Active tab
    const [activeTab, setActiveTab] = useState('slots') // 'slots' | 'hours'

    useEffect(() => {
        loadData()
    }, [template.id])

    const loadData = async () => {
        setLoading(true)
        const [loadedSlots, loadedHours] = await Promise.all([
            storageService.getTemplateSlots(template.id),
            storageService.getTemplateHours(template.id)
        ])
        setSlots(loadedSlots)
        setHours(loadedHours)
        setLoading(false)
    }

    // Slots handlers
    const handleAddSlot = () => {
        setEditingSlot(null)
        setSlotFormData({
            dayOfWeek: 1,
            startTime: '18:00',
            endTime: '19:30',
            name: '',
            coach: '',
            group: '',
            isBlocking: true
        })
        setShowSlotModal(true)
    }

    const handleEditSlot = (slot) => {
        setEditingSlot(slot)
        setSlotFormData({
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime.slice(0, 5),
            endTime: slot.endTime.slice(0, 5),
            name: slot.name,
            coach: slot.coach || '',
            group: slot.group || '',
            isBlocking: slot.isBlocking
        })
        setShowSlotModal(true)
    }

    const handleSaveSlot = async () => {
        if (!slotFormData.name || !slotFormData.startTime || !slotFormData.endTime) return
        setSavingSlot(true)

        if (editingSlot) {
            await storageService.updateTemplateSlot(editingSlot.id, slotFormData)
        } else {
            await storageService.createTemplateSlot(template.id, slotFormData)
        }

        await loadData()
        setSavingSlot(false)
        setShowSlotModal(false)
    }

    const handleDeleteSlot = async (slot) => {
        if (!window.confirm(`Supprimer "${slot.name}" ?`)) return
        await storageService.deleteTemplateSlot(slot.id)
        setSlots(prev => prev.filter(s => s.id !== slot.id))
    }

    // Hours handlers
    const handleAddHour = () => {
        setEditingHour(null)
        setHourFormData({
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '23:00'
        })
        setShowHourModal(true)
    }

    const handleEditHour = (hour) => {
        setEditingHour(hour)
        setHourFormData({
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime.slice(0, 5),
            endTime: hour.endTime.slice(0, 5)
        })
        setShowHourModal(true)
    }

    const handleSaveHour = async () => {
        if (!hourFormData.startTime || !hourFormData.endTime) return
        setSavingHour(true)

        if (editingHour) {
            await storageService.updateTemplateHour(editingHour.id, hourFormData)
        } else {
            await storageService.createTemplateHour(template.id, hourFormData)
        }

        await loadData()
        setSavingHour(false)
        setShowHourModal(false)
    }

    const handleDeleteHour = async (hour) => {
        if (!window.confirm(`Supprimer cette plage horaire ?`)) return
        await storageService.deleteTemplateHour(hour.id)
        setHours(prev => prev.filter(h => h.id !== hour.id))
    }

    const formatTime = (time) => time?.slice(0, 5) || ''

    // Grouper par jour
    const slotsByDay = slots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = []
        acc[slot.dayOfWeek].push(slot)
        return acc
    }, {})

    const hoursByDay = hours.reduce((acc, hour) => {
        if (!acc[hour.dayOfWeek]) acc[hour.dayOfWeek] = []
        acc[hour.dayOfWeek].push(hour)
        return acc
    }, {})

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={onBack}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{template.name}</h2>
            </div>

            {/* Sub-tabs */}
            <div style={{
                display: 'flex',
                marginBottom: '1.5rem',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '4px'
            }}>
                <button
                    onClick={() => setActiveTab('slots')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'slots' ? 'white' : 'transparent',
                        color: activeTab === 'slots' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'slots' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                    }}
                >
                    <Calendar size={16} />
                    Créneaux
                </button>
                <button
                    onClick={() => setActiveTab('hours')}
                    style={{
                        flex: 1,
                        padding: '0.6rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'hours' ? 'white' : 'transparent',
                        color: activeTab === 'hours' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'hours' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.9rem'
                    }}
                >
                    <Clock size={16} />
                    Horaires
                </button>
            </div>

            {/* Créneaux tab */}
            {activeTab === 'slots' && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            Créneaux bloqués ou indicatifs
                        </p>
                        <button
                            onClick={handleAddSlot}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>

                    {slots.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Aucun créneau configuré
                            </p>
                        </div>
                    ) : (
                        Object.entries(slotsByDay)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, daySlots]) => (
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
                                        {daySlots.map(slot => (
                                            <div
                                                key={slot.id}
                                                className="card"
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    borderLeft: `4px solid ${slot.isBlocking ? '#9CA3AF' : '#3B82F6'}`
                                                }}
                                            >
                                                {/* Type indicator */}
                                                <span style={{ fontSize: '1.1rem' }}>
                                                    {slot.isBlocking ? '🔒' : '📋'}
                                                </span>

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
                                                        {slot.coach && <span>• {slot.coach}</span>}
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
                                                        onClick={() => handleEditSlot(slot)}
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
                                                        onClick={() => handleDeleteSlot(slot)}
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

            {/* Horaires tab */}
            {activeTab === 'hours' && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                            Plages horaires d'ouverture
                        </p>
                        <button
                            onClick={handleAddHour}
                            className="btn btn-primary"
                            style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>

                    {hours.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Aucune plage horaire configurée.<br />
                                <span style={{ fontSize: '0.85rem' }}>Par défaut : 8h-23h</span>
                            </p>
                        </div>
                    ) : (
                        Object.entries(hoursByDay)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, dayHours]) => (
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
                                        {dayHours.map(hour => (
                                            <div
                                                key={hour.id}
                                                className="card"
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem'
                                                }}
                                            >
                                                <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: '500' }}>
                                                        {formatTime(hour.startTime)} → {formatTime(hour.endTime)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button
                                                        onClick={() => handleEditHour(hour)}
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
                                                        onClick={() => handleDeleteHour(hour)}
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

            {/* Modal slot */}
            {showSlotModal && (
                <>
                    <div
                        onClick={() => setShowSlotModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                {editingSlot ? 'Modifier le créneau' : 'Nouveau créneau'}
                            </h3>
                            <button onClick={() => setShowSlotModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Type */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                    Type de créneau
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setSlotFormData({ ...slotFormData, isBlocking: true })}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${slotFormData.isBlocking ? 'var(--color-primary)' : '#DDD'}`,
                                            background: slotFormData.isBlocking ? '#EFF6FF' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        🔒 Bloquant
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSlotFormData({ ...slotFormData, isBlocking: false })}
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${!slotFormData.isBlocking ? 'var(--color-primary)' : '#DDD'}`,
                                            background: !slotFormData.isBlocking ? '#EFF6FF' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        📋 Indicatif
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                                    {slotFormData.isBlocking
                                        ? 'Les réservations sont impossibles pendant ce créneau'
                                        : 'Affiché à titre informatif, les réservations restent possibles'}
                                </p>
                            </div>

                            {/* Jour */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Jour</label>
                                <select
                                    value={slotFormData.dayOfWeek}
                                    onChange={(e) => setSlotFormData({ ...slotFormData, dayOfWeek: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Heures */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Début</label>
                                    <input
                                        type="time"
                                        value={slotFormData.startTime}
                                        onChange={(e) => setSlotFormData({ ...slotFormData, startTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Fin</label>
                                    <input
                                        type="time"
                                        value={slotFormData.endTime}
                                        onChange={(e) => setSlotFormData({ ...slotFormData, endTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>

                            {/* Nom */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Nom *</label>
                                <input
                                    type="text"
                                    value={slotFormData.name}
                                    onChange={(e) => setSlotFormData({ ...slotFormData, name: e.target.value })}
                                    placeholder="Ex: Entraînement Jeunes"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                />
                            </div>

                            {/* Coach */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Entraîneur</label>
                                <input
                                    type="text"
                                    value={slotFormData.coach}
                                    onChange={(e) => setSlotFormData({ ...slotFormData, coach: e.target.value })}
                                    placeholder="Ex: Freddy"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                />
                            </div>

                            {/* Groupe */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Groupe</label>
                                <input
                                    type="text"
                                    value={slotFormData.group}
                                    onChange={(e) => setSlotFormData({ ...slotFormData, group: e.target.value })}
                                    placeholder="Ex: G1, G2"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                />
                            </div>

                            {/* Boutons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setShowSlotModal(false)} className="btn" style={{ flex: 1, background: 'var(--color-bg)' }}>
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveSlot}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={savingSlot || !slotFormData.name}
                                >
                                    {savingSlot ? <RefreshCw size={18} className="spin" /> : (editingSlot ? 'Modifier' : 'Créer')}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal hour */}
            {showHourModal && (
                <>
                    <div
                        onClick={() => setShowHourModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                {editingHour ? 'Modifier la plage' : 'Nouvelle plage horaire'}
                            </h3>
                            <button onClick={() => setShowHourModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Jour */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Jour</label>
                                <select
                                    value={hourFormData.dayOfWeek}
                                    onChange={(e) => setHourFormData({ ...hourFormData, dayOfWeek: parseInt(e.target.value) })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Heures */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Début</label>
                                    <input
                                        type="time"
                                        value={hourFormData.startTime}
                                        onChange={(e) => setHourFormData({ ...hourFormData, startTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.9rem' }}>Fin</label>
                                    <input
                                        type="time"
                                        value={hourFormData.endTime}
                                        onChange={(e) => setHourFormData({ ...hourFormData, endTime: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #DDD', fontSize: '1rem' }}
                                    />
                                </div>
                            </div>

                            {/* Boutons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setShowHourModal(false)} className="btn" style={{ flex: 1, background: 'var(--color-bg)' }}>
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveHour}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={savingHour || !hourFormData.startTime || !hourFormData.endTime}
                                >
                                    {savingHour ? <RefreshCw size={18} className="spin" /> : (editingHour ? 'Modifier' : 'Créer')}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
