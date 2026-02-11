import styles from './DevIndicator.module.css'

const DevIndicator = () => {
    const isDev = import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL?.includes('dev')

    if (!isDev) return null

    return <div className={styles.indicator}>DEV</div>
}

export default DevIndicator
