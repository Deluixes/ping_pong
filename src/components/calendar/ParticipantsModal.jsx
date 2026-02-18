import { Users, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { useRegistration } from '../../contexts/RegistrationContext'
import styles from './ParticipantsModal.module.css'

export default function ParticipantsModal() {
    const {
        showParticipantsList,
        selectedSlotId,
        selectedDate,
        participantsToShow,
        closeParticipantsModal,
    } = useRegistration()

    if (!showParticipantsList) return null

    return (
        <div className="modal-overlay modal-overlay--dark" onClick={closeParticipantsModal}>
            <div
                className={clsx('modal-dialog', styles.dialog)}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h3 className={styles.title}>
                        <Users size={20} />
                        Joueurs sur ce créneau
                    </h3>
                    <button onClick={closeParticipantsModal} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <p className={styles.subtitle}>
                    {selectedSlotId} - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                <div className={styles.list}>
                    {participantsToShow.map((p, index) => (
                        <div key={p.id || index} className={styles.row}>
                            {/* Avatar */}
                            <div className={clsx('avatar', 'avatar--lg', styles.avatarFallback)}>
                                {p.profilePhotoUrl ? (
                                    <img
                                        src={p.profilePhotoUrl}
                                        alt={p.name}
                                        className="avatar__img"
                                    />
                                ) : (
                                    p.name?.charAt(0).toUpperCase() || '?'
                                )}
                            </div>

                            {/* Nom et infos */}
                            <div className={styles.info}>
                                <div className={styles.name}>
                                    {p.name}
                                    {p.status === 'pending' && (
                                        <span className={styles.pending}>(en attente)</span>
                                    )}
                                </div>
                                {p.licenseType && (
                                    <span
                                        className={clsx(
                                            'badge--pill',
                                            styles.licenseBadge,
                                            p.licenseType === 'Compétition'
                                                ? styles.licenseBadgeCompetition
                                                : styles.licenseBadgeLoisir
                                        )}
                                    >
                                        {p.licenseType}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {participantsToShow.length === 0 && (
                    <p className={styles.empty}>Aucun joueur sur ce créneau</p>
                )}

                <div className={styles.actions}>
                    <button
                        onClick={closeParticipantsModal}
                        className={clsx('btn', 'btn-full', styles.closeBtnActive)}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}
