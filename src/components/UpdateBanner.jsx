import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './UpdateBanner.module.css'

export default function UpdateBanner() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW()

    if (!needRefresh) return null

    return (
        <div className={styles.banner}>
            <span>Une nouvelle version est disponible</span>
            <button onClick={() => updateServiceWorker(true)} className={styles.refreshBtn}>
                Rafraîchir
            </button>
        </div>
    )
}
