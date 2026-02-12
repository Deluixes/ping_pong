import { Users, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { useRegistration } from '../../contexts/RegistrationContext'
import styles from './ActionChoiceModal.module.css'

export default function ActionChoiceModal() {
    const {
        showActionChoice,
        selectedSlotId,
        selectedDate,
        handleShowParticipants,
        handleOpenInviteModal,
        closeActionChoiceModal,
    } = useRegistration()

    if (!showActionChoice) return null

    return (
        <div className="modal-overlay" onClick={closeActionChoiceModal}>
            <div
                className={clsx('modal-dialog', styles.dialog)}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className={styles.title}>Créneau de {selectedSlotId}</h3>
                <p className={styles.subtitle}>
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                <button
                    onClick={() => handleShowParticipants(selectedSlotId)}
                    className={clsx('btn', 'btn-full', styles.actionBtn)}
                >
                    <Users size={18} />
                    Voir les joueurs
                </button>

                <button
                    onClick={handleOpenInviteModal}
                    className={clsx('btn', 'btn-full', styles.actionBtn)}
                >
                    <Edit3 size={18} />
                    Modifier l'inscription
                </button>

                <button
                    onClick={closeActionChoiceModal}
                    className={clsx('btn', 'btn-full', styles.cancelBtn)}
                >
                    Annuler
                </button>
            </div>
        </div>
    )
}
