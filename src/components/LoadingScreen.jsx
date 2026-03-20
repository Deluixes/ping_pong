import styles from './App.module.css'
import { GROUP_NAME } from '../constants'

export default function LoadingScreen() {
    return (
        <div className={styles.loadingScreen}>
            <div className={styles.loadingLogo}>
                <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
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
            </div>
            <div className={styles.loadingSpinner} />
            <p className={styles.loadingTitle}>{GROUP_NAME}</p>
        </div>
    )
}
