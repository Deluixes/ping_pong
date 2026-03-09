import React, { useState } from 'react'
import clsx from 'clsx'
import { useAuth } from '../contexts/AuthContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { GROUP_NAME } from '../constants'
import { UserPlus, Clock, LogOut, RefreshCw, Trash2 } from 'lucide-react'
import styles from './PendingApproval.module.css'

export default function PendingApproval() {
    const { user, memberStatus, requestAccess, logout, refreshMemberStatus } = useAuth()
    const confirm = useConfirm()
    const [isRequesting, setIsRequesting] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRequestAccess = async () => {
        setIsRequesting(true)
        await requestAccess()
        setIsRequesting(false)
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refreshMemberStatus()
        setIsRefreshing(false)
    }

    const handleLogout = async () => {
        await logout()
    }

    return (
        <div className={styles.container}>
            <div className={clsx('card', styles.card)}>
                {/* Logo */}
                <div className={styles.logo}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                        <rect
                            x="38"
                            y="38"
                            width="8"
                            height="22"
                            rx="4"
                            fill="var(--color-secondary)"
                            transform="rotate(-45 38 38)"
                        />
                        <circle
                            cx="50"
                            cy="14"
                            r="6"
                            fill="white"
                            stroke="var(--color-secondary)"
                            strokeWidth="2"
                        />
                    </svg>
                    <h1 className={styles.clubName}>{GROUP_NAME}</h1>
                </div>

                {memberStatus === 'none' && (
                    <>
                        <div className={styles.infoBox}>
                            <p className={styles.infoText}>
                                Bienvenue <strong>{user?.name}</strong> !<br />
                                Pour accéder au planning, vous devez rejoindre le groupe.
                            </p>
                        </div>

                        <button
                            onClick={handleRequestAccess}
                            className="btn btn-primary btn-full"
                            disabled={isRequesting}
                        >
                            <UserPlus size={18} />
                            {isRequesting ? 'Envoi...' : 'Demander à rejoindre le groupe'}
                        </button>
                    </>
                )}

                {memberStatus === 'pending' && (
                    <>
                        <div className={styles.pendingBox}>
                            <Clock size={40} color="#F59E0B" className={styles.pendingIcon} />
                            <h2 className={styles.pendingTitle}>Demande en attente</h2>
                            <p className={styles.pendingText}>
                                Votre demande a été envoyée.
                                <br />
                                Un administrateur doit valider votre accès.
                            </p>
                        </div>

                        <button
                            onClick={handleRefresh}
                            className={clsx('btn btn-full', styles.refreshBtn)}
                            disabled={isRefreshing}
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
                            Vérifier le statut
                        </button>
                    </>
                )}

                <button onClick={handleLogout} className={clsx('btn btn-full', styles.logoutBtn)}>
                    <LogOut size={16} className="label-icon" />
                    Se déconnecter
                </button>

                <button
                    onClick={async () => {
                        const confirmed = await confirm({
                            title: 'Vider le cache',
                            message:
                                "Cela va supprimer les données temporaires et recharger l'application. Continuer ?",
                            confirmLabel: 'Vider le cache',
                            variant: 'danger',
                        })
                        if (!confirmed) return
                        localStorage.removeItem('pingpong_events')
                        if ('caches' in window) {
                            const keys = await caches.keys()
                            await Promise.all(keys.map((k) => caches.delete(k)))
                        }
                        if ('serviceWorker' in navigator) {
                            const registrations = await navigator.serviceWorker.getRegistrations()
                            await Promise.all(registrations.map((r) => r.unregister()))
                            navigator.serviceWorker.register('/sw-custom.js')
                        }
                        window.location.reload()
                    }}
                    className={clsx('btn btn-full', styles.cacheBtn)}
                >
                    <Trash2 size={16} />
                    Vider le cache
                </button>

                <p className={styles.footerText}>Connecté en tant que {user?.email}</p>
            </div>
        </div>
    )
}
