import { Users, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './ActionChoiceModal.module.css'

export default function ActionChoiceModal({
    selectedSlotId,
    selectedDate,
    onShowParticipants,
    onOpenInviteModal,
    onClose,
}) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={clsx('modal-dialog', styles.dialog)}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className={styles.title}>Créneau de {selectedSlotId}</h3>
                <p className={styles.subtitle}>
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                <button
                    onClick={() => onShowParticipants(selectedSlotId)}
                    className={clsx('btn', 'btn-full', styles.actionBtn)}
                >
                    <Users size={18} />
                    Voir les joueurs
                </button>

                <button
                    onClick={onOpenInviteModal}
                    className={clsx('btn', 'btn-full', styles.actionBtn)}
                >
                    <Edit3 size={18} />
                    Modifier l'inscription
                </button>

                <button onClick={onClose} className={clsx('btn', 'btn-full', styles.cancelBtn)}>
                    Annuler
                </button>
            </div>
        </div>
    )
}
