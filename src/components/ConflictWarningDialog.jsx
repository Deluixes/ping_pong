import React from 'react'
import clsx from 'clsx'
import { AlertTriangle } from 'lucide-react'
import { DAYS_FR } from '../constants'
import styles from './ConflictWarningDialog.module.css'

const formatConflict = (conflict) => {
    const [year, month, day] = conflict.newSlot.date.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    const dayName = DAYS_FR[date.getDay()]
    return `${dayName} ${conflict.newSlot.startTime.slice(0, 5)}-${conflict.newSlot.endTime.slice(0, 5)} "${conflict.newSlot.name || 'Sans nom'}"`
}

export default function ConflictWarningDialog({
    visible,
    conflicts,
    selectedMode,
    onCancel,
    onContinue,
}) {
    if (!visible) return null

    return (
        <div className={clsx('modal-overlay', 'modal-overlay--above', styles.conflictOverlay)}>
            <div className={styles.conflictDialog}>
                <div className={styles.conflictDialogBody}>
                    <div className={styles.conflictHeader}>
                        <AlertTriangle size={24} color="#F59E0B" />
                        <h3 className={styles.conflictTitle}>Créneaux en conflit</h3>
                    </div>

                    <p className={styles.conflictDescription}>
                        {selectedMode === 'merge'
                            ? 'Les créneaux suivants ne seront pas ajoutés car ils chevauchent des créneaux existants :'
                            : 'Les créneaux existants suivants seront remplacés par les nouveaux du template :'}
                    </p>

                    <div className={styles.conflictList}>
                        {conflicts?.map((conflict, idx) => (
                            <div
                                key={idx}
                                className={clsx(
                                    styles.conflictItem,
                                    idx < conflicts.length - 1 && styles.conflictItemBorder
                                )}
                            >
                                • {formatConflict(conflict)}
                            </div>
                        ))}
                    </div>

                    <div className={styles.conflictFooter}>
                        <button
                            onClick={onCancel}
                            className={clsx('btn', styles.conflictBtnCancel)}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={onContinue}
                            className={clsx('btn', 'btn-primary', styles.conflictBtnContinue)}
                        >
                            Continuer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
