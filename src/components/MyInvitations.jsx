import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { storageService } from '../services/storage'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeft, Check, X, RefreshCw, Mail, Calendar } from 'lucide-react'
import { formatDuration, getEndTime } from '../utils/time'
import styles from './MyInvitations.module.css'

export default function MyInvitations({ onNotificationChange }) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const confirm = useConfirm()
    const [invitations, setInvitations] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadInvitations = async () => {
        if (!user) return
        const data = await storageService.getPendingInvitations(user.id)
        setInvitations(data)
        setLoading(false)
    }

    useEffect(() => {
        loadInvitations()
    }, [user])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadInvitations()
        setRefreshing(false)
    }

    const handleAccept = async (inv) => {
        await storageService.acceptInvitation(inv.slotId, inv.date, user.id)
        await loadInvitations()
        onNotificationChange?.()
    }

    const handleDecline = async (inv) => {
        const confirmed = await confirm({
            title: 'Refuser',
            message: 'Refuser cette invitation ?',
            confirmLabel: 'Refuser',
        })
        if (confirmed) {
            await storageService.declineInvitation(inv.slotId, inv.date, user.id)
            await loadInvitations()
            onNotificationChange?.()
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
                    {invitations.map((inv, i) => (
                        <div
                            key={`${inv.slotId}-${inv.date}-${i}`}
                            className={`card ${styles.invCard}`}
                        >
                            <div className={styles.invInfo}>
                                <div className={styles.invDate}>
                                    {format(new Date(inv.date), 'EEEE d MMMM', { locale: fr })}
                                </div>
                                <div className={styles.invSlot}>
                                    Créneau de {inv.slotId.replace(':', 'h')} à{' '}
                                    {getEndTime(inv.slotId, inv.duration)} (
                                    {formatDuration(inv.duration)})
                                </div>
                                {inv.invitedBy && (
                                    <div className={styles.invBy}>Invité par {inv.invitedBy}</div>
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
