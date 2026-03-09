import React from 'react'
import clsx from 'clsx'
import styles from './ModeChoiceDialog.module.css'

export default function ModeChoiceDialog({ visible, conflictAnalysis, onSelect }) {
    if (!visible) return null

    return (
        <div className={clsx('modal-overlay', 'modal-overlay--above', styles.modeOverlay)}>
            <div className={styles.modeDialog}>
                <div className={styles.modeDialogBody}>
                    <h3 className={styles.modeDialogTitle}>Semaines déjà configurées</h3>
                    <p className={styles.modeDialogDescription}>
                        {conflictAnalysis?.configuredWeeks?.length || 0} semaine(s) sélectionnée(s)
                        ont déjà une configuration. Que voulez-vous faire ?
                    </p>

                    <div className={styles.modeButtonsColumn}>
                        <button
                            onClick={() => onSelect('overwrite')}
                            className={clsx('btn', styles.modeBtnOverwrite)}
                        >
                            Écraser
                        </button>

                        <button
                            onClick={() => onSelect('merge')}
                            className={clsx('btn', styles.modeBtnMerge)}
                        >
                            <div className={styles.modeBtnTitle}>Fusionner (garder anciens)</div>
                            <div className={styles.modeBtnSubtitle}>
                                Ajoute les créneaux, garde les anciens si conflit
                            </div>
                        </button>

                        <button
                            onClick={() => onSelect('merge_keep_new')}
                            className={clsx('btn', styles.modeBtnMergeNew)}
                        >
                            <div className={styles.modeBtnTitle}>
                                Fusionner (remplacer par les nouveaux créneaux)
                            </div>
                            <div className={styles.modeBtnSubtitle}>
                                Ajoute les créneaux, remplace par les nouveaux si conflit
                            </div>
                        </button>

                        <button
                            onClick={() => onSelect('cancel')}
                            className={clsx('btn', styles.modeBtnCancel)}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
