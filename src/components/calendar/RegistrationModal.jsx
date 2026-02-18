import { Clock, X, UserPlus, Users, Check } from 'lucide-react'
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
        selfRegister,
        isModifying,
        isInvited,
        availableDurations,
        currentSlotAccepted,
        isCurrentSlotOverbooked,
        totalTables,
        getParticipants,
        getEndTime,
        handleDurationSelect,
        handleShowParticipants,
        handleUnregister,
        setSelfRegister,
        setModalStep,
        updateGuest,
        removeGuest,
        addGuestField,
        handleRegister,
        closeModal,
    } = useRegistration()

    if (!modalStep) return null

    // Sous-modal pour choisir la durée
    if (modalStep === 'duration-picker') {
        return (
            <div
                className="modal-overlay modal-overlay--bottom"
                onClick={(e) => e.target === e.currentTarget && setModalStep('registration')}
            >
                <div
                    className={clsx(
                        'modal-dialog',
                        'modal-dialog--bottom-sheet',
                        styles.maxHeight70
                    )}
                >
                    <div className="modal-header">
                        <h3 className={styles.title}>
                            <Clock size={20} />
                            Choisir la durée
                        </h3>
                        <button onClick={() => setModalStep('registration')} className="icon-btn">
                            <X size={24} />
                        </button>
                    </div>

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
                </div>
            </div>
        )
    }

    // Modal principal unifié (modalStep === 'registration')
    const validGuests = guests.filter((g) => g.userId)
    const canValidate = selectedDuration && (selfRegister || validGuests.length > 0)
    const participants = selectedSlotId ? getParticipants(selectedSlotId) : []

    return (
        <div
            className="modal-overlay modal-overlay--bottom"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
            <div className={clsx('modal-dialog', 'modal-dialog--bottom-sheet', styles.maxHeight70)}>
                {/* Section 1 : Header */}
                <div className="modal-header">
                    <h3 className={styles.title}>
                        {isModifying ? "Modifier l'inscription" : 'Inscription'}
                    </h3>
                    <button onClick={closeModal} className="icon-btn">
                        <X size={24} />
                    </button>
                </div>

                <p className={styles.subtitle}>
                    <strong>{selectedSlotId}</strong> -{' '}
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                {/* Section 2 : Durée */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <Clock size={16} />
                        <span>
                            Durée <span className={styles.required}>*</span>
                        </span>
                    </div>
                    <button
                        onClick={() => setModalStep('duration-picker')}
                        className={clsx(
                            styles.durationSelector,
                            selectedDuration && styles.durationSelectorFilled
                        )}
                    >
                        {selectedDuration
                            ? `${selectedDuration.label} (${selectedSlotId} → ${getEndTime(selectedSlotId, selectedDuration.slots)})`
                            : 'Choisir la durée...'}
                    </button>
                </div>

                {/* Warning overbooking */}
                {isCurrentSlotOverbooked && (
                    <div className={clsx('alert--warning', styles.overbookingWarning)}>
                        <p className={styles.overbookingText}>
                            ⚠️ Attention : il n'y a que {totalTables} tables disponibles et{' '}
                            {currentSlotAccepted} personnes confirmées. Êtes-vous sûr de ce créneau
                            ?
                        </p>
                    </div>
                )}

                {/* Section 3 : Inscription */}
                <div className={styles.section}>
                    {isModifying ? (
                        <>
                            <div className={styles.registeredRow}>
                                <Check size={16} className={styles.registeredIcon} />
                                <span>Vous êtes inscrit(e)</span>
                            </div>
                            <button
                                onClick={() => handleUnregister(selectedSlotId)}
                                className={styles.unregisterBtn}
                            >
                                <X size={14} />
                                Se désinscrire
                            </button>
                        </>
                    ) : isInvited ? (
                        <div className={styles.registeredRow}>
                            <Clock size={16} className={styles.invitedIcon} />
                            <span>Vous êtes invité(e) sur ce créneau</span>
                        </div>
                    ) : (
                        <label className={styles.selfRegisterRow}>
                            <input
                                type="checkbox"
                                checked={selfRegister}
                                onChange={(e) => setSelfRegister(e.target.checked)}
                            />
                            <span>M'inscrire sur ce créneau</span>
                        </label>
                    )}
                </div>

                {/* Section 4 : Inviter des membres */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <UserPlus size={16} />
                        <span>Inviter des membres</span>
                    </div>

                    {approvedMembers.length > 0 ? (
                        <>
                            {validGuests.length > 0 && (
                                <div className={clsx('alert--info', styles.infoBox)}>
                                    <strong>Info :</strong> {validGuests.length} personne(s)
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
                                                        guests.some((g) => g.userId === m.userId) &&
                                                        m.userId !== guest.userId
                                                    ) {
                                                        return false
                                                    }
                                                    if (
                                                        participants.some((p) => p.id === m.userId)
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
                                        {(guest.userId || guests.length > 1) && (
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
                                const availableMembers = approvedMembers.filter(
                                    (m) =>
                                        !participants.some((p) => p.id === m.userId) &&
                                        !guests.some((g) => g.userId === m.userId)
                                )
                                return availableMembers.length > 0
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
                </div>

                {/* Lien "Voir les joueurs" si participants sur le créneau */}
                {participants.length > 0 && (
                    <button
                        onClick={() => handleShowParticipants(selectedSlotId)}
                        className={styles.viewPlayersLink}
                    >
                        <Users size={16} /> Voir les joueurs inscrits ({participants.length})
                    </button>
                )}

                {/* Section 5 : Bouton validation */}
                {isModifying || isInvited ? (
                    validGuests.length > 0 && (
                        <button
                            onClick={handleRegister}
                            disabled={!selectedDuration}
                            className="btn btn-primary btn-full"
                        >
                            Envoyer les invitations
                        </button>
                    )
                ) : (
                    <button
                        onClick={handleRegister}
                        disabled={!canValidate}
                        className="btn btn-primary btn-full"
                    >
                        Confirmer
                    </button>
                )}
            </div>
        </div>
    )
}
