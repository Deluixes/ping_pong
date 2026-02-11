import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { ArrowLeft, Plus, Edit2, Trash2, X, RefreshCw, Clock, Calendar } from 'lucide-react'
import styles from './TemplateEditor.module.css'

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
        isBlocking: true,
    })
    const [savingSlot, setSavingSlot] = useState(false)

    // Modal state for hours
    const [showHourModal, setShowHourModal] = useState(false)
    const [editingHour, setEditingHour] = useState(null)
    const [hourFormData, setHourFormData] = useState({
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '23:00',
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
            storageService.getTemplateHours(template.id),
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
            isBlocking: true,
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
            isBlocking: slot.isBlocking,
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
        setSlots((prev) => prev.filter((s) => s.id !== slot.id))
    }

    // Hours handlers
    const handleAddHour = () => {
        setEditingHour(null)
        setHourFormData({
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '23:00',
        })
        setShowHourModal(true)
    }

    const handleEditHour = (hour) => {
        setEditingHour(hour)
        setHourFormData({
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime.slice(0, 5),
            endTime: hour.endTime.slice(0, 5),
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
        setHours((prev) => prev.filter((h) => h.id !== hour.id))
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
        return <div className={styles.loading}>Chargement...</div>
    }

    return (
        <div>
            {/* Header */}
            <div className={styles.header}>
                <button onClick={onBack} className={clsx('btn', styles.backBtn)}>
                    <ArrowLeft size={20} />
                </button>
                <h2 className={styles.title}>{template.name}</h2>
            </div>

            {/* Sub-tabs */}
            <div className="tab-bar">
                <button
                    onClick={() => setActiveTab('slots')}
                    className={clsx(
                        'tab-btn',
                        styles.tabBtn,
                        activeTab === 'slots' && 'tab-btn--active'
                    )}
                >
                    <Calendar size={16} />
                    Créneaux
                </button>
                <button
                    onClick={() => setActiveTab('hours')}
                    className={clsx(
                        'tab-btn',
                        styles.tabBtn,
                        activeTab === 'hours' && 'tab-btn--active'
                    )}
                >
                    <Clock size={16} />
                    Horaires
                </button>
            </div>

            {/* Créneaux tab */}
            {activeTab === 'slots' && (
                <div>
                    <div className={styles.tabHeader}>
                        <p className={styles.tabDescription}>Créneaux bloqués ou indicatifs</p>
                        <button
                            onClick={handleAddSlot}
                            className={clsx('btn btn-primary', styles.addBtn)}
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>

                    {slots.length === 0 ? (
                        <div className={clsx('card', styles.emptyCard)}>
                            <p className={styles.emptyText}>Aucun créneau configuré</p>
                        </div>
                    ) : (
                        Object.entries(slotsByDay)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, daySlots]) => (
                                <div key={day} className={styles.dayGroup}>
                                    <h3 className={styles.dayTitle}>{DAYS[day]}</h3>
                                    <div className={styles.dayList}>
                                        {daySlots.map((slot) => (
                                            <div
                                                key={slot.id}
                                                className={clsx(
                                                    'card',
                                                    styles.slotCard,
                                                    slot.isBlocking
                                                        ? styles.slotCardBlocking
                                                        : styles.slotCardInfo
                                                )}
                                            >
                                                {/* Type indicator */}
                                                <span className={styles.typeIcon}>
                                                    {slot.isBlocking ? '🔒' : '📋'}
                                                </span>

                                                {/* Info */}
                                                <div className={styles.slotInfo}>
                                                    <div className={styles.slotName}>
                                                        {slot.name}
                                                    </div>
                                                    <div className={styles.slotMeta}>
                                                        <span>
                                                            {formatTime(slot.startTime)}-
                                                            {formatTime(slot.endTime)}
                                                        </span>
                                                        {slot.coach && <span>• {slot.coach}</span>}
                                                        {slot.group && (
                                                            <span className={styles.groupBadge}>
                                                                {slot.group}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className={styles.actions}>
                                                    <button
                                                        onClick={() => handleEditSlot(slot)}
                                                        className="icon-btn icon-btn--muted"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSlot(slot)}
                                                        className="icon-btn icon-btn--danger"
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
                    <div className={styles.tabHeader}>
                        <p className={styles.tabDescription}>Plages horaires d'ouverture</p>
                        <button
                            onClick={handleAddHour}
                            className={clsx('btn btn-primary', styles.addBtn)}
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>

                    {hours.length === 0 ? (
                        <div className={clsx('card', styles.emptyCard)}>
                            <p className={styles.emptyText}>
                                Aucune plage horaire configurée.
                                <br />
                                <span className={styles.emptySubtext}>Par défaut : 8h-23h</span>
                            </p>
                        </div>
                    ) : (
                        Object.entries(hoursByDay)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([day, dayHours]) => (
                                <div key={day} className={styles.dayGroup}>
                                    <h3 className={styles.dayTitle}>{DAYS[day]}</h3>
                                    <div className={styles.dayList}>
                                        {dayHours.map((hour) => (
                                            <div
                                                key={hour.id}
                                                className={clsx('card', styles.hourCard)}
                                            >
                                                <Clock size={18} className="icon-btn--muted" />
                                                <div className={styles.hourInfo}>
                                                    <span className={styles.hourTime}>
                                                        {formatTime(hour.startTime)} →{' '}
                                                        {formatTime(hour.endTime)}
                                                    </span>
                                                </div>
                                                <div className={styles.actions}>
                                                    <button
                                                        onClick={() => handleEditHour(hour)}
                                                        className="icon-btn icon-btn--muted"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteHour(hour)}
                                                        className="icon-btn icon-btn--danger"
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
                    <div onClick={() => setShowSlotModal(false)} className="modal-overlay" />
                    <div className="modal-dialog modal-dialog--centered">
                        <div className="modal-header">
                            <h3 className={styles.modalTitle}>
                                {editingSlot ? 'Modifier le créneau' : 'Nouveau créneau'}
                            </h3>
                            <button onClick={() => setShowSlotModal(false)} className="icon-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.formStack}>
                            {/* Type */}
                            <div>
                                <label className="form-label">Type de créneau</label>
                                <div className={styles.typeToggleRow}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSlotFormData({ ...slotFormData, isBlocking: true })
                                        }
                                        className={clsx(
                                            styles.typeToggle,
                                            slotFormData.isBlocking
                                                ? styles.typeToggleActive
                                                : styles.typeToggleInactive
                                        )}
                                    >
                                        🔒 Bloquant
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSlotFormData({ ...slotFormData, isBlocking: false })
                                        }
                                        className={clsx(
                                            styles.typeToggle,
                                            !slotFormData.isBlocking
                                                ? styles.typeToggleActive
                                                : styles.typeToggleInactive
                                        )}
                                    >
                                        📋 Indicatif
                                    </button>
                                </div>
                                <p className={styles.typeHint}>
                                    {slotFormData.isBlocking
                                        ? 'Les réservations sont impossibles pendant ce créneau'
                                        : 'Affiché à titre informatif, les réservations restent possibles'}
                                </p>
                            </div>

                            {/* Jour */}
                            <div>
                                <label className="form-label">Jour</label>
                                <select
                                    value={slotFormData.dayOfWeek}
                                    onChange={(e) =>
                                        setSlotFormData({
                                            ...slotFormData,
                                            dayOfWeek: parseInt(e.target.value),
                                        })
                                    }
                                    className="form-input"
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Heures */}
                            <div className={styles.formRow}>
                                <div className={styles.formCol}>
                                    <label className="form-label">Début</label>
                                    <input
                                        type="time"
                                        value={slotFormData.startTime}
                                        onChange={(e) =>
                                            setSlotFormData({
                                                ...slotFormData,
                                                startTime: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                    />
                                </div>
                                <div className={styles.formCol}>
                                    <label className="form-label">Fin</label>
                                    <input
                                        type="time"
                                        value={slotFormData.endTime}
                                        onChange={(e) =>
                                            setSlotFormData({
                                                ...slotFormData,
                                                endTime: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Nom */}
                            <div>
                                <label className="form-label">Nom *</label>
                                <input
                                    type="text"
                                    value={slotFormData.name}
                                    onChange={(e) =>
                                        setSlotFormData({ ...slotFormData, name: e.target.value })
                                    }
                                    placeholder="Ex: Entraînement Jeunes"
                                    className="form-input"
                                />
                            </div>

                            {/* Coach */}
                            <div>
                                <label className="form-label">Entraîneur</label>
                                <input
                                    type="text"
                                    value={slotFormData.coach}
                                    onChange={(e) =>
                                        setSlotFormData({ ...slotFormData, coach: e.target.value })
                                    }
                                    placeholder="Ex: Freddy"
                                    className="form-input"
                                />
                            </div>

                            {/* Groupe */}
                            <div>
                                <label className="form-label">Groupe</label>
                                <input
                                    type="text"
                                    value={slotFormData.group}
                                    onChange={(e) =>
                                        setSlotFormData({ ...slotFormData, group: e.target.value })
                                    }
                                    placeholder="Ex: G1, G2"
                                    className="form-input"
                                />
                            </div>

                            {/* Boutons */}
                            <div className={styles.modalFooter}>
                                <button
                                    onClick={() => setShowSlotModal(false)}
                                    className={clsx('btn', styles.cancelBtn)}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveSlot}
                                    className={clsx('btn btn-primary', styles.submitBtn)}
                                    disabled={savingSlot || !slotFormData.name}
                                >
                                    {savingSlot ? (
                                        <RefreshCw size={18} className="spin" />
                                    ) : editingSlot ? (
                                        'Modifier'
                                    ) : (
                                        'Créer'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal hour */}
            {showHourModal && (
                <>
                    <div onClick={() => setShowHourModal(false)} className="modal-overlay" />
                    <div className="modal-dialog modal-dialog--centered">
                        <div className="modal-header">
                            <h3 className={styles.modalTitle}>
                                {editingHour ? 'Modifier la plage' : 'Nouvelle plage horaire'}
                            </h3>
                            <button onClick={() => setShowHourModal(false)} className="icon-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.formStack}>
                            {/* Jour */}
                            <div>
                                <label className="form-label">Jour</label>
                                <select
                                    value={hourFormData.dayOfWeek}
                                    onChange={(e) =>
                                        setHourFormData({
                                            ...hourFormData,
                                            dayOfWeek: parseInt(e.target.value),
                                        })
                                    }
                                    className="form-input"
                                >
                                    {DAYS.map((day, i) => (
                                        <option key={i} value={i}>
                                            {day}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Heures */}
                            <div className={styles.formRow}>
                                <div className={styles.formCol}>
                                    <label className="form-label">Début</label>
                                    <input
                                        type="time"
                                        value={hourFormData.startTime}
                                        onChange={(e) =>
                                            setHourFormData({
                                                ...hourFormData,
                                                startTime: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                    />
                                </div>
                                <div className={styles.formCol}>
                                    <label className="form-label">Fin</label>
                                    <input
                                        type="time"
                                        value={hourFormData.endTime}
                                        onChange={(e) =>
                                            setHourFormData({
                                                ...hourFormData,
                                                endTime: e.target.value,
                                            })
                                        }
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            {/* Boutons */}
                            <div className={styles.modalFooter}>
                                <button
                                    onClick={() => setShowHourModal(false)}
                                    className={clsx('btn', styles.cancelBtn)}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveHour}
                                    className={clsx('btn btn-primary', styles.submitBtn)}
                                    disabled={
                                        savingHour ||
                                        !hourFormData.startTime ||
                                        !hourFormData.endTime
                                    }
                                >
                                    {savingHour ? (
                                        <RefreshCw size={18} className="spin" />
                                    ) : editingHour ? (
                                        'Modifier'
                                    ) : (
                                        'Créer'
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
