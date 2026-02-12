import { Clock, X, Unlock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { useRegistration } from '../../contexts/RegistrationContext'
import styles from './OpenSlotModal.module.css'

export default function OpenSlotModal() {
    const {
        showOpenSlotModal,
        slotToOpen,
        selectedDate,
        selectedTarget,
        selectedOpenDuration,
        getEndTime,
        getAvailableOpenDurations,
        setSelectedTarget,
        setSelectedOpenDuration,
        handleOpenSlot,
        closeOpenSlotModal,
    } = useRegistration()

    if (!showOpenSlotModal || !slotToOpen) return null

    const availableOpenDurations = getAvailableOpenDurations(slotToOpen)

    return (
        <div
            className="modal-overlay modal-overlay--bottom"
            onClick={(e) => e.target === e.currentTarget && closeOpenSlotModal()}
        >
            <div className="modal-dialog modal-dialog--bottom-sheet">
                <div className="modal-header">
                    <h3 className={styles.modalTitle}>
                        <Unlock size={20} />
                        Ouvrir des créneaux
                    </h3>
                    <button onClick={closeOpenSlotModal} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <p className={styles.subtitle}>
                    <strong>{slotToOpen}</strong> →{' '}
                    <strong>{getEndTime(slotToOpen, selectedOpenDuration)}</strong>
                    <br />
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                {/* Sélecteur de durée */}
                <div className={styles.section}>
                    <label className="form-label">
                        <Clock size={14} className="label-icon" />
                        Durée
                    </label>
                    <div className={styles.durationChipsContainer}>
                        {availableOpenDurations.map((duration) => (
                            <button
                                key={duration.value}
                                onClick={() => setSelectedOpenDuration(duration.slots)}
                                className={clsx(
                                    styles.durationChip,
                                    selectedOpenDuration === duration.slots &&
                                        styles.durationChipActive
                                )}
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <label className="form-label">Ouvrir pour :</label>
                    <div className={styles.radioGroup}>
                        <label
                            className={clsx(
                                styles.radioLabel,
                                selectedTarget === 'all' && styles.radioLabelAll
                            )}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="all"
                                checked={selectedTarget === 'all'}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div className={styles.radioTitle}>Tous les membres</div>
                                <div className={styles.radioSubtitle}>Loisir et Compétition</div>
                            </div>
                        </label>

                        <label
                            className={clsx(
                                styles.radioLabel,
                                selectedTarget === 'loisir' && styles.radioLabelLoisir
                            )}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="loisir"
                                checked={selectedTarget === 'loisir'}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div className={clsx(styles.radioTitle, styles.radioTitleLoisir)}>
                                    Loisir uniquement
                                </div>
                                <div className={styles.radioSubtitle}>Licence L</div>
                            </div>
                        </label>

                        <label
                            className={clsx(
                                styles.radioLabel,
                                selectedTarget === 'competition' && styles.radioLabelCompetition
                            )}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="competition"
                                checked={selectedTarget === 'competition'}
                                onChange={(e) => setSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div
                                    className={clsx(
                                        styles.radioTitle,
                                        styles.radioTitleCompetition
                                    )}
                                >
                                    Compétition uniquement
                                </div>
                                <div className={styles.radioSubtitle}>Licence C</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className={styles.footerButtons}>
                    <button onClick={closeOpenSlotModal} className={clsx('btn', styles.cancelBtn)}>
                        Annuler
                    </button>
                    <button
                        onClick={handleOpenSlot}
                        className={clsx('btn', 'btn-primary', styles.confirmBtn)}
                    >
                        <Unlock size={16} />
                        Ouvrir{' '}
                        {selectedOpenDuration > 1 ? `(${selectedOpenDuration} créneaux)` : ''}
                    </button>
                </div>
            </div>
        </div>
    )
}
