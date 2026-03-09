import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import styles from './Toast.module.css'
import clsx from 'clsx'

const typeIcons = {
    success: '\u2713',
    error: '\u2717',
    warning: '\u26A0',
    info: '\u2139',
}

export default function Toast({ toasts, onDismiss }) {
    if (toasts.length === 0) return null

    return createPortal(
        <div className={styles.container}>
            {toasts.map((toast) => (
                <div key={toast.id} className={clsx(styles.toast, styles[toast.type])}>
                    <span className={styles.icon}>{typeIcons[toast.type] || typeIcons.info}</span>
                    <span className={styles.message}>{toast.message}</span>
                    <button onClick={() => onDismiss(toast.id)} className={styles.closeBtn}>
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>,
        document.body
    )
}
