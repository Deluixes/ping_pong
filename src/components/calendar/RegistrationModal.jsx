import { Clock, X, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import { useRegistration } from '../../contexts/RegistrationContext'
import styles from './RegistrationModal.module.css'

export default function RegistrationModal() {
    const {
        modalStep,
        selectedSlotId,
        selectedDate,
        selectedDuration,
        guests,
        approvedMembers,
        inviteOnlyMode,
        availableDurations,
        currentSlotAccepted,
        isCurrentSlotOverbooked,
        totalTables,
        isUserParticipating,
        getParticipants,
        getEndTime,
        handleDurationSelect,
        handleModeChoice,
        setModalStep,
        updateGuest,
        removeGuest,
        addGuestField,
        handleRegister,
        closeModal,
    } = useRegistration()

    if (!modalStep) return null

    return (
        <div
            className="modal-overlay modal-overlay--bottom"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
            <div className={clsx('modal-dialog', 'modal-dialog--bottom-sheet', styles.maxHeight70)}>
                <div className="modal-header">
                    <h3 className={styles.title}>
                        <Clock size={20} />
                        {modalStep === 'duration'
                            ? 'Durée de réservation'
                            : modalStep === 'choice'
                              ? 'Type de réservation'
                              : inviteOnlyMode
                                ? 'Inviter des personnes'
                                : 'Confirmer la réservation'}
                    </h3>
                    <button onClick={closeModal} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <p className={styles.subtitle}>
                    <strong>{selectedSlotId}</strong> -{' '}
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                    {selectedDuration && (
                        <span>
                            {' '}
                            → <strong>{getEndTime(selectedSlotId, selectedDuration.slots)}</strong>
                        </span>
                    )}
                </p>

                {/* Step 1: Duration Selection */}
                {modalStep === 'duration' && (
                    <>
                        {availableDurations.length > 0 ? (
                            <div className={styles.durationList}>
                                {availableDurations.map((duration) => (
                                    <button
                                        key={duration.value}
                                        onClick={() => handleDurationSelect(duration)}
                                        className={styles.durationBtn}
                                    >
                                        <span className={styles.durationEmoji}>⏱️</span>
                                        <span>{duration.label}</span>
                                        <span className={styles.durationTimeRange}>
                                            {selectedSlotId} →{' '}
                                            {getEndTime(selectedSlotId, duration.slots)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.noDurationError}>
                                Aucune durée disponible pour ce créneau.
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Choice (S'inscrire / Inviter seulement) */}
                {modalStep === 'choice' && (
                    <div className={styles.choiceList}>
                        <button
                            onClick={() => setModalStep('duration')}
                            className={styles.backLinkChoice}
                        >
                            ← Changer la durée
                        </button>

                        <button
                            onClick={() => handleModeChoice('register')}
                            className={clsx('btn', styles.registerBtn)}
                        >
                            <div className={styles.choiceIconWrap}>
                                <span className={styles.choiceIcon}>✓</span>
                            </div>
                            <div className={styles.choiceTextWrap}>
                                <div className={styles.choiceTextTitle}>S'inscrire</div>
                                <div className={styles.choiceTextSub}>
                                    Je m'inscris et je peux inviter des personnes
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleModeChoice('invite_only')}
                            className={clsx('btn', styles.inviteOnlyBtn)}
                        >
                            <div className={styles.choiceIconWrap}>
                                <UserPlus size={24} />
                            </div>
                            <div className={styles.choiceTextWrap}>
                                <div className={styles.choiceTextTitle}>Inviter seulement</div>
                                <div className={styles.choiceTextSub}>
                                    J'invite des personnes sans m'inscrire
                                </div>
                            </div>
                        </button>
                    </div>
                )}

                {/* Step 3: Invite Guests + Confirmation */}
                {modalStep === 'guests' && (
                    <>
                        {/* Bouton retour : si déjà inscrit → fermer, sinon → retour choice */}
                        <button
                            onClick={() =>
                                inviteOnlyMode && isUserParticipating(selectedSlotId)
                                    ? closeModal()
                                    : setModalStep('choice')
                            }
                            className={styles.backLinkGuests}
                        >
                            {inviteOnlyMode && isUserParticipating(selectedSlotId)
                                ? '← Annuler'
                                : '← Retour'}
                        </button>

                        {/* Résumé avec bouton changer durée */}
                        {selectedDuration && !isUserParticipating(selectedSlotId) && (
                            <div className={styles.durationSummary}>
                                <div className={styles.durationSummaryLeft}>
                                    <Clock size={16} />
                                    <span className={styles.fontMedium}>
                                        {selectedDuration.label} ({selectedSlotId} →{' '}
                                        {getEndTime(selectedSlotId, selectedDuration.slots)})
                                    </span>
                                </div>
                                <button
                                    onClick={() => setModalStep('duration')}
                                    className={styles.changeDurationBtn}
                                >
                                    Modifier
                                </button>
                            </div>
                        )}

                        {/* Warning if overbooked */}
                        {isCurrentSlotOverbooked && (
                            <div className={clsx('alert--warning', styles.overbookingWarning)}>
                                <p className={styles.overbookingText}>
                                    ⚠️ Attention : il n'y a que {totalTables} tables disponibles et{' '}
                                    {currentSlotAccepted} personnes confirmées. Êtes-vous sûr de ce
                                    créneau ?
                                </p>
                            </div>
                        )}

                        <div className={styles.inviteSectionHeader}>
                            <UserPlus size={18} />
                            <span className={styles.fontMedium}>
                                Inviter des membres (optionnel)
                            </span>
                        </div>

                        {approvedMembers.length > 0 ? (
                            <>
                                {/* Info sur les invitations */}
                                {guests.filter((g) => g.userId).length > 0 && (
                                    <div className={clsx('alert--info', styles.infoBox)}>
                                        <strong>Info :</strong>{' '}
                                        {guests.filter((g) => g.userId).length} personne(s)
                                        invitée(s) devront accepter l'invitation.
                                    </div>
                                )}

                                <div className={styles.guestFieldList}>
                                    {guests.map((guest, idx) => (
                                        <div key={idx} className={styles.guestRow}>
                                            <select
                                                value={guest.userId}
                                                onChange={(e) => updateGuest(idx, e.target.value)}
                                                className={clsx('form-input', styles.guestSelect)}
                                            >
                                                <option value="">-- Choisir un membre --</option>
                                                {approvedMembers
                                                    .filter((m) => {
                                                        if (
                                                            guests.some(
                                                                (g) => g.userId === m.userId
                                                            ) &&
                                                            m.userId !== guest.userId
                                                        ) {
                                                            return false
                                                        }
                                                        const slotParticipants =
                                                            getParticipants(selectedSlotId)
                                                        if (
                                                            slotParticipants.some(
                                                                (p) => p.id === m.userId
                                                            )
                                                        ) {
                                                            return false
                                                        }
                                                        return true
                                                    })
                                                    .map((m) => (
                                                        <option key={m.userId} value={m.userId}>
                                                            {m.name}
                                                        </option>
                                                    ))}
                                            </select>
                                            {guests.length > 1 && (
                                                <button
                                                    onClick={() => removeGuest(idx)}
                                                    className={styles.removeBtn}
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {(() => {
                                    const slotParticipants = getParticipants(selectedSlotId)
                                    const availableMembers = approvedMembers.filter(
                                        (m) =>
                                            !slotParticipants.some((p) => p.id === m.userId) &&
                                            !guests.some((g) => g.userId === m.userId)
                                    )
                                    return guests.length < 3 && availableMembers.length > 0
                                })() && (
                                    <button
                                        onClick={addGuestField}
                                        className={clsx('btn', styles.addPlayerBtn)}
                                    >
                                        <UserPlus size={16} />
                                        Ajouter un joueur
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className={styles.noMembersEmpty}>
                                Aucun autre membre dans le groupe pour le moment
                            </div>
                        )}

                        <button onClick={handleRegister} className="btn btn-primary btn-full">
                            {inviteOnlyMode
                                ? '✓ Envoyer les invitations'
                                : '✓ Confirmer la réservation'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
