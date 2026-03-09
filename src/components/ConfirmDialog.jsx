import clsx from 'clsx'
import styles from './ConfirmDialog.module.css'

export default function ConfirmDialog({
    title,
    message,
    confirmLabel,
    variant,
    onConfirm,
    onCancel,
}) {
    return (
        <div className="modal-overlay modal-overlay--above" onClick={onCancel}>
            <div
                className="modal-dialog modal-dialog--centered"
                onClick={(e) => e.stopPropagation()}
            >
                {title && <h3 className={styles.title}>{title}</h3>}
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button onClick={onCancel} className={clsx('btn', styles.cancelBtn)}>
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className={clsx('btn', variant === 'danger' ? 'btn-danger' : 'btn-primary')}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
