import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { storageService } from '../services/storage'
import { format, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, Check, X, RefreshCw, Mail, Calendar, Edit3 } from 'lucide-react'
import { formatDuration, getEndTime, timeToMinutes } from '../utils/time'
import { TIME_SLOTS, SLOT_INDEX_MAP, DURATION_OPTIONS } from './calendar/calendarUtils'
import styles from './MyInvitations.module.css'

function getAvailableStartSlots(openedSlots, blockedSlots, invDate) {
    const openedSet = new Set(
        openedSlots.filter((os) => os.date === invDate).map((os) => os.slotId)
    )
    return TIME_SLOTS.filter((slot) => {
        if (!openedSet.has(slot.id)) return false
        const [h, m] = slot.id.split(':').map(Number)
        const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        const isBlocked = blockedSlots.some((bs) => {
            if (bs.date !== invDate || !bs.isBlocking) return false
            return slotTime >= bs.startTime.slice(0, 5) && slotTime < bs.endTime.slice(0, 5)
        })
        return !isBlocked
    }).map((slot) => slot.id)
}

function getAvailableDurationsForSlot(slotId, openedSlots, blockedSlots, invDate) {
    const startIndex = SLOT_INDEX_MAP.get(slotId) ?? -1
    if (startIndex === -1) return []

    const openedSet = new Set(
        openedSlots.filter((os) => os.date === invDate).map((os) => os.slotId)
    )
    const available = []

    for (const duration of DURATION_OPTIONS) {
        if (startIndex + duration.slots > TIME_SLOTS.length) break
        let valid = true
        for (let i = 0; i < duration.slots; i++) {
            const slot = TIME_SLOTS[startIndex + i]
            if (!openedSet.has(slot.id)) {
                valid = false
                break
            }
            const [h, m] = slot.id.split(':').map(Number)
            const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
            const isBlocked = blockedSlots.some((bs) => {
                if (bs.date !== invDate || !bs.isBlocking) return false
                return slotTime >= bs.startTime.slice(0, 5) && slotTime < bs.endTime.slice(0, 5)
            })
            if (isBlocked) {
                valid = false
                break
            }
        }
        if (valid) available.push(duration)
    }
    return available
}

export default function MyInvitations({ onNotificationChange }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [invitations, setInvitations] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // Edit mode state
    const [editingKey, setEditingKey] = useState(null)
    const [openedSlots, setOpenedSlots] = useState([])
    const [blockedSlots, setBlockedSlots] = useState([])
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [loadingSlots, setLoadingSlots] = useState(false)

    const loadInvitations = async () => {
        if (!user) return
        const data = await storageService.getPendingInvitations(user.id)
        setInvitations(data)
        setLoading(false)
    }

    useEffect(() => {
        loadInvitations()

        const sub = storageService.subscribeToInvitations(() => {
            loadInvitations()
        })

        return () => storageService.unsubscribe(sub)
    }, [user])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadInvitations()
        setRefreshing(false)
    }

    const handleAccept = async (inv) => {
        try {
            await storageService.acceptInvitation(inv.slotId, inv.date, user.id)
            addToast('Invitation acceptée.', 'success')
            await loadInvitations()
            onNotificationChange?.()
        } catch {
            addToast("Erreur lors de l'acceptation de l'invitation.", 'error')
        }
    }

    const handleDecline = async (inv) => {
        const confirmed = await confirm({
            title: 'Refuser',
            message: 'Refuser cette invitation ?',
            confirmLabel: 'Refuser',
        })
        if (!confirmed) return
        try {
            await storageService.declineInvitation(inv.slotId, inv.date, user.id)
            addToast('Invitation refusée.', 'success')
            await loadInvitations()
            onNotificationChange?.()
        } catch {
            addToast("Erreur lors du refus de l'invitation.", 'error')
        }
    }

    const handleEdit = async (inv) => {
        const key = `${inv.slotId}-${inv.date}`
        if (editingKey === key) {
            setEditingKey(null)
            return
        }

        setEditingKey(key)
        setLoadingSlots(true)
        setSelectedSlotId(inv.slotId)
        setSelectedDuration(inv.duration)

        try {
            const invDate = new Date(inv.date)
            const weekStartStr = format(startOfWeek(invDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

            const [opened, weekConfig] = await Promise.all([
                storageService.getOpenedSlotsForDate(inv.date),
                storageService.getWeekConfig(weekStartStr),
            ])

            setOpenedSlots(opened)
            setBlockedSlots(weekConfig?.slots || [])
        } catch {
            addToast('Erreur lors du chargement des créneaux.', 'error')
            setEditingKey(null)
        } finally {
            setLoadingSlots(false)
        }
    }

    const handleSlotChange = (newSlotId) => {
        setSelectedSlotId(newSlotId)
        setSelectedDuration(1)
    }

    const handleAcceptModified = async (inv) => {
        try {
            const isModified = selectedSlotId !== inv.slotId || selectedDuration !== inv.duration
            await storageService.acceptInvitation(
                inv.slotId,
                inv.date,
                user.id,
                isModified ? selectedSlotId : undefined,
                isModified ? selectedDuration : undefined
            )
            addToast('Invitation acceptée.', 'success')
            setEditingKey(null)
            await loadInvitations()
            onNotificationChange?.()
        } catch {
            addToast("Erreur lors de l'acceptation de l'invitation.", 'error')
        }
    }

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Invitations reçues</h1>
                <button
                    onClick={handleRefresh}
                    className={`btn btn-back ${styles.refreshBtn}`}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {invitations.length === 0 ? (
                <div className={`card ${styles.emptyCard}`}>
                    <Mail size={48} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>Aucune invitation en attente</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {invitations.map((inv, i) => {
                        const invKey = `${inv.slotId}-${inv.date}`
                        const isEditing = editingKey === invKey
                        const availableStartSlots = isEditing
                            ? getAvailableStartSlots(openedSlots, blockedSlots, inv.date)
                            : []
                        const availableDurations =
                            isEditing && selectedSlotId
                                ? getAvailableDurationsForSlot(
                                      selectedSlotId,
                                      openedSlots,
                                      blockedSlots,
                                      inv.date
                                  )
                                : []

                        return (
                            <div
                                key={`${inv.slotId}-${inv.date}-${i}`}
                                className={`card ${styles.invCard}`}
                            >
                                <div className={styles.invInfo}>
                                    <div className={styles.invDate}>
                                        {format(new Date(inv.date), 'EEEE d MMMM', {
                                            locale: fr,
                                        })}
                                    </div>
                                    <div className={styles.invSlot}>
                                        Créneau de {inv.slotId.replace(':', 'h')} à{' '}
                                        {getEndTime(inv.slotId, inv.duration)} (
                                        {formatDuration(inv.duration)})
                                    </div>
                                    {inv.invitedBy && (
                                        <div className={styles.invBy}>
                                            Invité par {inv.invitedBy}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.invActions}>
                                    <button
                                        onClick={() =>
                                            navigate(`/?date=${inv.date}&slot=${inv.slotId}`)
                                        }
                                        className={styles.calendarBtn}
                                        title="Voir sur le planning"
                                    >
                                        <Calendar size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(inv)}
                                        className={`${styles.editBtn} ${isEditing ? styles.editBtnActive : ''}`}
                                        title="Modifier le créneau"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleAccept(inv)}
                                        className={styles.acceptBtn}
                                    >
                                        <Check size={18} /> Accepter
                                    </button>
                                    <button
                                        onClick={() => handleDecline(inv)}
                                        className={styles.declineBtn}
                                    >
                                        <X size={18} /> Refuser
                                    </button>
                                </div>

                                {isEditing && (
                                    <div className={styles.editSection}>
                                        {loadingSlots ? (
                                            <div className={styles.editLoading}>
                                                Chargement des créneaux...
                                            </div>
                                        ) : availableStartSlots.length === 0 ? (
                                            <div className={styles.editLoading}>
                                                Aucun créneau ouvert ce jour-là.
                                            </div>
                                        ) : (
                                            <>
                                                <div className={styles.editRow}>
                                                    <label>Début</label>
                                                    <select
                                                        className={styles.editSelect}
                                                        value={selectedSlotId || ''}
                                                        onChange={(e) =>
                                                            handleSlotChange(e.target.value)
                                                        }
                                                    >
                                                        {availableStartSlots.map((slotId) => (
                                                            <option key={slotId} value={slotId}>
                                                                {slotId.replace(':', 'h')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className={styles.editRow}>
                                                    <label>Durée</label>
                                                    <select
                                                        className={styles.editSelect}
                                                        value={selectedDuration || 1}
                                                        onChange={(e) =>
                                                            setSelectedDuration(
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    >
                                                        {availableDurations.map((d) => (
                                                            <option key={d.value} value={d.slots}>
                                                                {d.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className={styles.editSummary}>
                                                    {selectedSlotId &&
                                                        `${selectedSlotId.replace(':', 'h')} à ${getEndTime(selectedSlotId, selectedDuration || 1)}`}
                                                </div>
                                                <button
                                                    onClick={() => handleAcceptModified(inv)}
                                                    className={styles.acceptModifiedBtn}
                                                >
                                                    <Check size={18} /> Accepter ce créneau
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
