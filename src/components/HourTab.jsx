import React, { useState } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { Plus, Edit2, Trash2, X, RefreshCw, Clock } from 'lucide-react'
import { DAYS_FR, DEFAULT_OPENING_TIME, DEFAULT_CLOSING_TIME } from '../constants'
import { formatTime } from '../utils/time'
import styles from './HourTab.module.css'

export default function HourTab({ template, hours, onRefresh }) {
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [showHourModal, setShowHourModal] = useState(false)
    const [editingHour, setEditingHour] = useState(null)
    const [hourFormData, setHourFormData] = useState({
        dayOfWeek: 1,
        startTime: DEFAULT_OPENING_TIME,
        endTime: DEFAULT_CLOSING_TIME,
    })
    const [savingHour, setSavingHour] = useState(false)

    const handleAddHour = () => {
        setEditingHour(null)
        setHourFormData({
            dayOfWeek: 1,
            startTime: DEFAULT_OPENING_TIME,
            endTime: DEFAULT_CLOSING_TIME,
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

        try {
            if (editingHour) {
                await storageService.updateTemplateHour(editingHour.id, hourFormData)
            } else {
                await storageService.createTemplateHour(template.id, hourFormData)
            }
            await onRefresh()
            setShowHourModal(false)
        } catch {
            addToast('Erreur lors de la sauvegarde de la plage horaire.', 'error')
        }
        setSavingHour(false)
    }

    const handleDeleteHour = async (hour) => {
        const confirmed = await confirm({
            title: 'Supprimer',
            message: 'Supprimer cette plage horaire ?',
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return
        try {
            await storageService.deleteTemplateHour(hour.id)
            await onRefresh()
        } catch {
            addToast('Erreur lors de la suppression de la plage horaire.', 'error')
        }
    }

    const hoursByDay = hours.reduce((acc, hour) => {
        if (!acc[hour.dayOfWeek]) acc[hour.dayOfWeek] = []
        acc[hour.dayOfWeek].push(hour)
        return acc
    }, {})

    return (
        <div>
            <div className={styles.tabHeader}>
                <p className={styles.tabDescription}>Plages horaires d'ouverture</p>
                <button onClick={handleAddHour} className={clsx('btn btn-primary', styles.addBtn)}>
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
                            <h3 className={styles.dayTitle}>{DAYS_FR[day]}</h3>
                            <div className={styles.dayList}>
                                {dayHours.map((hour) => (
                                    <div key={hour.id} className={clsx('card', styles.hourCard)}>
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
