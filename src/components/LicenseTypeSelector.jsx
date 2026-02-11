import clsx from 'clsx'
import styles from './LicenseTypeSelector.module.css'

export default function LicenseTypeSelector({ value, onChange }) {
    return (
        <div className={styles.row}>
            <button
                type="button"
                onClick={() => onChange('L')}
                className={clsx(styles.btn, value === 'L' ? styles.btnActive : styles.btnInactive)}
            >
                Loisir (L)
            </button>
            <button
                type="button"
                onClick={() => onChange('C')}
                className={clsx(styles.btn, value === 'C' ? styles.btnActive : styles.btnInactive)}
            >
                Compétition (C)
            </button>
        </div>
    )
}
