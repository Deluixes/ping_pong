import React from 'react'
import { useConfirm } from '../contexts/ConfirmContext'
import { RefreshCw, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import styles from './MaintenanceSection.module.css'

export default function MaintenanceSection() {
    const confirm = useConfirm()

    const handleClearCache = async () => {
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
    }

    return (
        <>
            <h2 className={styles.sectionHeading}>
                <RefreshCw size={18} />
                Maintenance
            </h2>
            <p className={styles.cacheDesc}>
                Si l'application ne fonctionne pas correctement, vider le cache peut résoudre le
                problème.
            </p>
            <button onClick={handleClearCache} className={clsx('btn', styles.cacheBtn)}>
                <Trash2 size={16} />
                Vider le cache
            </button>
        </>
    )
}
