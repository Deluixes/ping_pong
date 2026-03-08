import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { storageService } from '../services/storage'
import { format, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Check, X, RefreshCw, Mail, Eye, Clock, Calendar, UserPlus, ArrowLeft } from 'lucide-react'
import { formatDuration, getEndTime } from '../utils/time'
import { TIME_SLOTS, SLOT_INDEX_MAP, DURATION_OPTIONS } from './calendar/calendarUtils'
import MemberSearchSelect from './calendar/MemberSearchSelect'
import styles from './MyInvitations.module.css'

const SWIPE_HINT_KEY = 'pingpong_swipe_hint_seen'

// ── Logique créneaux contigus ──

function getContiguousRange(originalSlotId, openedSlots, blockedSlots, invDate, invDuration = 1) {
    const startIndex = SLOT_INDEX_MAP.get(originalSlotId) ?? -1
    if (startIndex === -1) return []

    const openedSet = new Set(
        openedSlots.filter((os) => os.date === invDate).map((os) => os.slotId)
    )

    // Slots couverts par l'invitation originale (exemptés du blocage)
    const invSlotIds = new Set()
    for (let i = 0; i < invDuration; i++) {
        const slot = TIME_SLOTS[startIndex + i]
        if (slot) {
            openedSet.add(slot.id)
            invSlotIds.add(slot.id)
        }
    }

    // Inclure les slots du week_slot parent (entraînement contenant l'invitation)
    const [oh, om] = originalSlotId.split(':').map(Number)
    const origTime = `${oh.toString().padStart(2, '0')}:${om.toString().padStart(2, '0')}`
    for (const ws of blockedSlots) {
        if (ws.date !== invDate) continue
        const wsStart = ws.startTime.slice(0, 5)
        const wsEnd = ws.endTime.slice(0, 5)
        if (origTime >= wsStart && origTime < wsEnd) {
            for (let idx = 0; idx < TIME_SLOTS.length; idx++) {
                const slot = TIME_SLOTS[idx]
                const [sh, sm] = slot.id.split(':').map(Number)
                const st = `${sh.toString().padStart(2, '0')}:${sm.toString().padStart(2, '0')}`
                if (st >= wsStart && st < wsEnd) {
                    openedSet.add(slot.id)
                    invSlotIds.add(slot.id)
                }
            }
        }
    }

    const isAvailable = (idx) => {
        if (idx < 0 || idx >= TIME_SLOTS.length) return false
        const slot = TIME_SLOTS[idx]
        if (!openedSet.has(slot.id)) return false
        if (invSlotIds.has(slot.id)) return true
        const [h, m] = slot.id.split(':').map(Number)
        const slotTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        return !blockedSlots.some((bs) => {
            if (bs.date !== invDate || !bs.isBlocking) return false
            return slotTime >= bs.startTime.slice(0, 5) && slotTime < bs.endTime.slice(0, 5)
        })
    }

    let left = startIndex
    while (left > 0 && isAvailable(left - 1)) left--

    let right = startIndex
    while (right < TIME_SLOTS.length - 1 && isAvailable(right + 1)) right++

    return TIME_SLOTS.slice(left, right + 1).map((s) => s.id)
}

function getDurationsForSlotInRange(slotId, contiguousRange) {
    const slotIndex = contiguousRange.indexOf(slotId)
    if (slotIndex === -1) return []
    const maxSlots = contiguousRange.length - slotIndex
    return DURATION_OPTIONS.filter((d) => d.slots <= maxSlots)
}

// ── Composant carte swipable ──

function SwipeableCard({ inv, onAccept, onDecline, onTap, onViewPlanning }) {
    const cardRef = useRef(null)
    const touchStart = useRef({ x: 0, y: 0 })
    const swipingRef = useRef(false)
    const directionRef = useRef(null)
    const offsetRef = useRef(0)
    const [offset, setOffset] = useState(0)

    const isModification = inv.type === 'modification'

    const handleTouchStart = useCallback((e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        swipingRef.current = false
        directionRef.current = null
        offsetRef.current = 0
    }, [])

    const handleTouchMove = useCallback((e) => {
        const dx = e.touches[0].clientX - touchStart.current.x
        const dy = e.touches[0].clientY - touchStart.current.y

        if (!directionRef.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
            directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
        }
        if (directionRef.current === 'vertical') return

        swipingRef.current = true
        offsetRef.current = dx * 0.6
        setOffset(offsetRef.current)
    }, [])

    const handleTouchEnd = useCallback(() => {
        if (!swipingRef.current) {
            directionRef.current = null
            return
        }

        const finalOffset = offsetRef.current
        const triggered = Math.abs(finalOffset) > 80

        if (triggered) {
            if (finalOffset > 0) onAccept()
            else onDecline()
        }

        // Snap back
        if (cardRef.current) {
            cardRef.current.style.transition = 'transform 0.25s ease-out'
            cardRef.current.style.transform = 'translateX(0px)'
            cardRef.current.addEventListener(
                'transitionend',
                () => {
                    if (cardRef.current) {
                        cardRef.current.style.transition = ''
                        cardRef.current.style.transform = ''
                    }
                },
                { once: true }
            )
        }

        setOffset(0)
        offsetRef.current = 0
        swipingRef.current = false
        directionRef.current = null
    }, [onAccept, onDecline])

    const handleClick = useCallback(
        (e) => {
            if (swipingRef.current) return
            if (e.target.closest(`.${styles.eyeBtn}`)) return
            onTap()
        },
        [onTap]
    )

    const cardStyle =
        swipingRef.current && offset
            ? { transform: `translateX(${offset}px)`, willChange: 'transform' }
            : undefined

    return (
        <div className={styles.swipeContainer}>
            {/* Fond swipe gauche = Refuser (rouge) */}
            <div
                className={`${styles.swipeBg} ${styles.swipeBgLeft}`}
                style={{ opacity: offset < -20 ? Math.min(1, Math.abs(offset) / 80) : 0 }}
            >
                <X size={24} />
                <span>Refuser</span>
            </div>
            {/* Fond swipe droite = Accepter (vert) */}
            <div
                className={`${styles.swipeBg} ${styles.swipeBgRight}`}
                style={{ opacity: offset > 20 ? Math.min(1, offset / 80) : 0 }}
            >
                <Check size={24} />
                <span>Accepter</span>
            </div>

            <div
                ref={cardRef}
                className={`card ${styles.invCard}`}
                style={cardStyle}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
            >
                {isModification && <span className={styles.modBadge}>Modification</span>}

                <div className={styles.invHeader}>
                    <div className={styles.invDate}>
                        {format(new Date(inv.date), 'EEEE d MMMM', { locale: fr })}
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onViewPlanning()
                        }}
                        className={styles.eyeBtn}
                        title="Voir sur le planning"
                    >
                        <Eye size={18} />
                    </button>
                </div>

                <div className={styles.invSlot}>
                    {inv.slotId.replace(':', 'h')} → {getEndTime(inv.slotId, inv.duration)} (
                    {formatDuration(inv.duration)})
                </div>

                {inv.invitedBy && (
                    <div className={styles.invBy}>
                        {isModification ? (
                            <>
                                Modifié par {inv.invitedBy}
                                {inv.originalSlotId && (
                                    <span className={styles.originalSlot}>
                                        {' '}
                                        (initialement {inv.originalSlotId.replace(':', 'h')})
                                    </span>
                                )}
                            </>
                        ) : (
                            <>Invité par {inv.invitedBy}</>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Modal de détail ──

function InvitationModal({
    inv,
    openedSlots,
    blockedSlots,
    approvedMembers,
    onClose,
    onAccept,
    onAcceptModified,
    onDecline,
}) {
    const [selectedSlotId, setSelectedSlotId] = useState(inv.slotId)
    const [selectedDuration, setSelectedDuration] = useState(inv.duration)
    const [guests, setGuests] = useState([{ userId: '', name: '' }])

    const contiguousRange = getContiguousRange(
        inv.slotId,
        openedSlots,
        blockedSlots,
        inv.date,
        inv.duration
    )

    const availableDurations = getDurationsForSlotInRange(selectedSlotId, contiguousRange)

    // Reset duration if selected slot changes and current duration is invalid
    useEffect(() => {
        if (
            availableDurations.length > 0 &&
            !availableDurations.some((d) => d.slots === selectedDuration)
        ) {
            setSelectedDuration(availableDurations[0].slots)
        }
    }, [selectedSlotId, availableDurations, selectedDuration])

    const isModified = selectedSlotId !== inv.slotId || selectedDuration !== inv.duration
    const validGuests = guests.filter((g) => g.userId)

    const handleAcceptWithModifications = () => {
        onAcceptModified(inv, selectedSlotId, selectedDuration, validGuests)
    }

    const updateGuest = (idx, userId) => {
        const member = approvedMembers.find((m) => m.userId === userId)
        setGuests((prev) => {
            const next = [...prev]
            next[idx] = { userId, name: member?.name || '' }
            return next
        })
    }

    const removeGuest = (idx) => {
        setGuests((prev) => {
            const next = prev.filter((_, i) => i !== idx)
            return next.length === 0 ? [{ userId: '', name: '' }] : next
        })
    }

    const addGuestField = () => {
        setGuests((prev) => [...prev, { userId: '', name: '' }])
    }

    return (
        <div
            className="modal-overlay modal-overlay--bottom"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="modal-dialog modal-dialog--bottom-sheet">
                {/* Header */}
                <div className="modal-header">
                    <h3 className={styles.modalTitle}>
                        {inv.type === 'modification'
                            ? 'Modification reçue'
                            : "Détail de l'invitation"}
                    </h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                {/* Infos */}
                <div className={styles.modalInfo}>
                    <div className={styles.modalInfoRow}>
                        <Calendar size={16} />
                        <span>{format(new Date(inv.date), 'EEEE d MMMM', { locale: fr })}</span>
                    </div>
                    <div className={styles.modalInfoRow}>
                        <Clock size={16} />
                        <span>
                            {inv.slotId.replace(':', 'h')} → {getEndTime(inv.slotId, inv.duration)}{' '}
                            ({formatDuration(inv.duration)})
                        </span>
                    </div>
                    {inv.invitedBy && (
                        <div className={styles.modalInfoRow}>
                            <UserPlus size={16} />
                            <span>
                                {inv.type === 'modification'
                                    ? `Modifié par ${inv.invitedBy}`
                                    : `Invité par ${inv.invitedBy}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Section modifier */}
                <div className={styles.modalSection}>
                    <div className={styles.modalSectionTitle}>Modifier le créneau</div>
                    {contiguousRange.length > 0 ? (
                        <>
                            <div className={styles.editRow}>
                                <label>Début</label>
                                <select
                                    className={styles.editSelect}
                                    value={selectedSlotId}
                                    onChange={(e) => setSelectedSlotId(e.target.value)}
                                >
                                    {contiguousRange.map((slotId) => (
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
                                    value={selectedDuration}
                                    onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                >
                                    {availableDurations.map((d) => (
                                        <option key={d.value} value={d.slots}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {isModified && (
                                <div className={styles.editSummary}>
                                    → {selectedSlotId.replace(':', 'h')} à{' '}
                                    {getEndTime(selectedSlotId, selectedDuration)}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.editLoading}>Aucun créneau ouvert ce jour-là.</div>
                    )}
                </div>

                {/* Inviter des membres */}
                {approvedMembers.length > 0 && (
                    <div className={styles.modalSection}>
                        <div className={styles.modalSectionTitle}>Inviter des membres</div>
                        <div className={styles.guestFieldList}>
                            {guests.map((guest, idx) => (
                                <div key={idx} className={styles.guestRow}>
                                    <MemberSearchSelect
                                        members={approvedMembers.filter(
                                            (m) =>
                                                !guests.some(
                                                    (g) =>
                                                        g.userId === m.userId &&
                                                        m.userId !== guest.userId
                                                )
                                        )}
                                        value={guest.userId}
                                        onChange={(userId) => updateGuest(idx, userId)}
                                    />
                                    {(guest.userId || guests.length > 1) && (
                                        <button
                                            onClick={() => removeGuest(idx)}
                                            className={styles.removeGuestBtn}
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button onClick={addGuestField} className={`btn ${styles.addPlayerBtn}`}>
                            <UserPlus size={16} />
                            Ajouter un joueur
                        </button>
                    </div>
                )}

                {/* Actions */}
                <div className={styles.modalActions}>
                    {isModified || validGuests.length > 0 ? (
                        <button
                            onClick={handleAcceptWithModifications}
                            className="btn btn-primary btn-full"
                        >
                            <Check size={18} />{' '}
                            {isModified ? 'Accepter avec modifications' : 'Accepter et inviter'}
                        </button>
                    ) : (
                        <button onClick={() => onAccept(inv)} className="btn btn-primary btn-full">
                            <Check size={18} /> Accepter tel quel
                        </button>
                    )}
                    <button
                        onClick={() => onDecline(inv)}
                        className={`btn btn-full ${styles.declineFullBtn}`}
                    >
                        <X size={18} /> Refuser
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Composant principal ──

export default function MyInvitations({ onNotificationChange }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [invitations, setInvitations] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [modalData, setModalData] = useState(null) // { inv, openedSlots, blockedSlots }
    const [approvedMembers, setApprovedMembers] = useState([])
    const [showHint, setShowHint] = useState(() => !localStorage.getItem(SWIPE_HINT_KEY))

    const loadInvitations = async () => {
        if (!user) return
        const [data, membersData] = await Promise.all([
            storageService.getPendingInvitations(user.id),
            storageService.getMembers(),
        ])
        setInvitations(data)
        setApprovedMembers((membersData.approved || []).filter((m) => m.userId !== user.id))
        setLoading(false)
    }

    useEffect(() => {
        loadInvitations()

        const sub = storageService.subscribeToInvitations(() => {
            loadInvitations()
        })

        return () => storageService.unsubscribe(sub)
    }, [user])

    const openModal = async (inv) => {
        try {
            const invDate = new Date(inv.date)
            const weekStartStr = format(startOfWeek(invDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const [opened, weekConfig] = await Promise.all([
                storageService.getOpenedSlotsForDate(inv.date),
                storageService.getWeekConfig(weekStartStr),
            ])
            setModalData({
                inv,
                openedSlots: opened,
                blockedSlots: weekConfig?.slots || [],
            })
        } catch {
            addToast('Erreur lors du chargement.', 'error')
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadInvitations()
        setRefreshing(false)
    }

    const handleAccept = async (inv) => {
        try {
            await storageService.acceptInvitation(inv.slotId, inv.date, user.id)
            addToast('Invitation acceptée.', 'success')
            setModalData(null)
            await loadInvitations()
            onNotificationChange?.()
            dismissHint()
        } catch {
            addToast("Erreur lors de l'acceptation.", 'error')
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
            setModalData(null)
            await loadInvitations()
            onNotificationChange?.()
            dismissHint()
        } catch {
            addToast('Erreur lors du refus.', 'error')
        }
    }

    const handleAcceptModified = async (inv, newSlotId, newDuration, guests) => {
        try {
            const isModified = newSlotId !== inv.slotId || newDuration !== inv.duration

            // Accept the invitation (with modifications if any)
            await storageService.acceptInvitation(
                inv.slotId,
                inv.date,
                user.id,
                isModified ? newSlotId : undefined,
                isModified ? newDuration : undefined
            )

            // Send counter-invitation to original inviter if modified
            if (isModified && inv.invitedByUserId) {
                const membersData = await storageService.getMembers()
                const inviter = membersData.approved?.find((m) => m.userId === inv.invitedByUserId)
                if (inviter) {
                    await storageService.inviteToSlot(
                        newSlotId,
                        inv.date,
                        inv.invitedByUserId,
                        inviter.name,
                        user.id,
                        newDuration,
                        {
                            type: 'modification',
                            originalSlotId: inv.slotId,
                        }
                    )
                }
            }

            // Send invitations to guests
            if (guests && guests.length > 0) {
                const slotId = isModified ? newSlotId : inv.slotId
                const duration = isModified ? newDuration : inv.duration
                await Promise.all(
                    guests.map((g) =>
                        storageService.inviteToSlot(
                            slotId,
                            inv.date,
                            g.userId,
                            g.name,
                            user.id,
                            duration
                        )
                    )
                )
            }

            addToast('Invitation acceptée.', 'success')
            setModalData(null)
            await loadInvitations()
            onNotificationChange?.()
        } catch {
            addToast("Erreur lors de l'acceptation.", 'error')
        }
    }

    const dismissHint = () => {
        if (showHint) {
            localStorage.setItem(SWIPE_HINT_KEY, '1')
            setShowHint(false)
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
                <>
                    {showHint && (
                        <p className={styles.swipeHint}>
                            ← Glissez pour accepter ou refuser → · Appuyez pour le détail
                        </p>
                    )}
                    <div className={styles.list}>
                        {invitations.map((inv, i) => (
                            <SwipeableCard
                                key={`${inv.slotId}-${inv.date}-${i}`}
                                inv={inv}
                                onAccept={() => handleAccept(inv)}
                                onDecline={() => handleDecline(inv)}
                                onTap={() => openModal(inv)}
                                onViewPlanning={() =>
                                    navigate(`/?date=${inv.date}&slot=${inv.slotId}`)
                                }
                            />
                        ))}
                    </div>
                </>
            )}

            {modalData && (
                <InvitationModal
                    inv={modalData.inv}
                    openedSlots={modalData.openedSlots}
                    blockedSlots={modalData.blockedSlots}
                    approvedMembers={approvedMembers}
                    onClose={() => setModalData(null)}
                    onAccept={handleAccept}
                    onAcceptModified={handleAcceptModified}
                    onDecline={handleDecline}
                />
            )}
        </div>
    )
}
