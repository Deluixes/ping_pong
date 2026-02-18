import React, { useState } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'
import { DAYS_FR } from '../constants'
import { formatTime } from '../utils/time'
import styles from './SlotTab.module.css'

export default function SlotTab({ template, slots, onRefresh }) {
    const { addToast } = useToast()
    const confirm = useConfirm()
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

        try {
            if (editingSlot) {
                await storageService.updateTemplateSlot(editingSlot.id, slotFormData)
            } else {
                await storageService.createTemplateSlot(template.id, slotFormData)
            }
            await onRefresh()
            setShowSlotModal(false)
        } catch {
            addToast('Erreur lors de la sauvegarde du créneau.', 'error')
        }
        setSavingSlot(false)
    }

    const handleDeleteSlot = async (slot) => {
        const confirmed = await confirm({
            title: 'Supprimer',
            message: `Supprimer "${slot.name}" ?`,
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return
        try {
            await storageService.deleteTemplateSlot(slot.id)
            await onRefresh()
        } catch {
            addToast('Erreur lors de la suppression du créneau.', 'error')
        }
    }

    const slotsByDay = slots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = []
        acc[slot.dayOfWeek].push(slot)
        return acc
    }, {})

    return (
        <div>
            <div className={styles.tabHeader}>
                <p className={styles.tabDescription}>Créneaux bloqués ou indicatifs</p>
                <button onClick={handleAddSlot} className={clsx('btn btn-primary', styles.addBtn)}>
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
                            <h3 className={styles.dayTitle}>{DAYS_FR[day]}</h3>
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
                                        <span className={styles.typeIcon}>
                                            {slot.isBlocking ? '🔒' : '📋'}
                                        </span>

                                        <div className={styles.slotInfo}>
                                            <div className={styles.slotName}>{slot.name}</div>
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
                                            setSlotFormData({
                                                ...slotFormData,
                                                isBlocking: true,
                                            })
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
                                            setSlotFormData({
                                                ...slotFormData,
                                                isBlocking: false,
                                            })
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
                                    {DAYS_FR.map((day, i) => (
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
                                        setSlotFormData({
                                            ...slotFormData,
                                            name: e.target.value,
                                        })
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
                                        setSlotFormData({
                                            ...slotFormData,
                                            coach: e.target.value,
                                        })
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
                                        setSlotFormData({
                                            ...slotFormData,
                                            group: e.target.value,
                                        })
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
        </div>
    )
}
