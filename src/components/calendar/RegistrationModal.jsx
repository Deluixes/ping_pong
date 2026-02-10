import { Clock, X, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function RegistrationModal({
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
    onDurationSelect,
    onModeChoice,
    onSetModalStep,
    onUpdateGuest,
    onRemoveGuest,
    onAddGuestField,
    onRegister,
    onClose,
}) {
    if (!modalStep) return null

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '1.5rem 1.5rem 0 0',
                    padding: '1.5rem',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '70vh',
                    overflow: 'auto',
                    animation: 'slideUp 0.2s ease-out',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                    }}
                >
                    <h3
                        style={{
                            margin: 0,
                            color: 'var(--color-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Clock size={20} />
                        {modalStep === 'duration'
                            ? 'Durée de réservation'
                            : modalStep === 'choice'
                              ? 'Type de réservation'
                              : inviteOnlyMode
                                ? 'Inviter des personnes'
                                : 'Confirmer la réservation'}
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.25rem',
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <p
                    style={{
                        color: 'var(--color-text-muted)',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                    }}
                >
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
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                }}
                            >
                                {availableDurations.map((duration) => (
                                    <button
                                        key={duration.value}
                                        onClick={() => onDurationSelect(duration)}
                                        style={{
                                            padding: '1rem 1.5rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '2px solid var(--color-primary)',
                                            background: 'white',
                                            color: 'var(--color-primary)',
                                            fontWeight: 'bold',
                                            fontSize: '1.1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                        <span>{duration.label}</span>
                                        <span
                                            style={{
                                                marginLeft: 'auto',
                                                fontSize: '0.85rem',
                                                color: 'var(--color-text-muted)',
                                            }}
                                        >
                                            {selectedSlotId} →{' '}
                                            {getEndTime(selectedSlotId, duration.slots)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div
                                style={{
                                    background: '#FEE2E2',
                                    border: '1px solid #EF4444',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    textAlign: 'center',
                                    color: '#991B1B',
                                }}
                            >
                                Aucune durée disponible pour ce créneau.
                            </div>
                        )}
                    </>
                )}

                {/* Step 2: Choice (S'inscrire / Inviter seulement) */}
                {modalStep === 'choice' && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}
                    >
                        <button
                            onClick={() => onSetModalStep('duration')}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                marginBottom: '0.5rem',
                                padding: 0,
                                textAlign: 'left',
                                fontSize: '0.9rem',
                            }}
                        >
                            ← Changer la durée
                        </button>

                        <button
                            onClick={() => onModeChoice('register')}
                            className="btn"
                            style={{
                                background: '#F0FDF4',
                                color: '#166534',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                border: '2px solid #22C55E',
                            }}
                        >
                            <div
                                style={{
                                    width: '24px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>✓</span>
                            </div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>S'inscrire</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    Je m'inscris et je peux inviter des personnes
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => onModeChoice('invite_only')}
                            className="btn"
                            style={{
                                background: '#DBEAFE',
                                color: '#1E40AF',
                                padding: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                border: '2px solid #3B82F6',
                            }}
                        >
                            <div
                                style={{
                                    width: '24px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <UserPlus size={24} />
                            </div>
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ fontWeight: '600' }}>Inviter seulement</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
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
                                    ? onClose()
                                    : onSetModalStep('choice')
                            }
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                marginBottom: '1rem',
                                fontSize: '0.9rem',
                                padding: 0,
                            }}
                        >
                            {inviteOnlyMode && isUserParticipating(selectedSlotId)
                                ? '← Annuler'
                                : '← Retour'}
                        </button>

                        {/* Résumé avec bouton changer durée */}
                        {selectedDuration && !isUserParticipating(selectedSlotId) && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.75rem',
                                    background: 'var(--color-primary-light)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1rem',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <Clock size={16} />
                                    <span style={{ fontWeight: '500' }}>
                                        {selectedDuration.label} ({selectedSlotId} →{' '}
                                        {getEndTime(selectedSlotId, selectedDuration.slots)})
                                    </span>
                                </div>
                                <button
                                    onClick={() => onSetModalStep('duration')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        textDecoration: 'underline',
                                    }}
                                >
                                    Modifier
                                </button>
                            </div>
                        )}

                        {/* Warning if overbooked */}
                        {isCurrentSlotOverbooked && (
                            <div
                                style={{
                                    background: '#FEF3C7',
                                    border: '1px solid #F59E0B',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                }}
                            >
                                <p
                                    style={{
                                        margin: 0,
                                        color: '#92400E',
                                        fontWeight: '500',
                                    }}
                                >
                                    ⚠️ Attention : il n'y a que {totalTables} tables disponibles et{' '}
                                    {currentSlotAccepted} personnes confirmées. Êtes-vous sûr de ce
                                    créneau ?
                                </p>
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'var(--color-bg)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            <UserPlus size={18} />
                            <span style={{ fontWeight: '500' }}>
                                Inviter des membres (optionnel)
                            </span>
                        </div>

                        {approvedMembers.length > 0 ? (
                            <>
                                {/* Info sur les invitations */}
                                {guests.filter((g) => g.odId).length > 0 && (
                                    <div
                                        style={{
                                            background: '#E0F2FE',
                                            padding: '0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            marginBottom: '1rem',
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        <strong>Info :</strong>{' '}
                                        {guests.filter((g) => g.odId).length} personne(s) invitée(s)
                                        devront accepter l'invitation.
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    {guests.map((guest, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                                            <select
                                                value={guest.odId}
                                                onChange={(e) => onUpdateGuest(idx, e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid #DDD',
                                                    fontSize: '0.95rem',
                                                    background: 'white',
                                                }}
                                            >
                                                <option value="">-- Choisir un membre --</option>
                                                {approvedMembers
                                                    .filter((m) => {
                                                        if (
                                                            guests.some(
                                                                (g) => g.odId === m.userId
                                                            ) &&
                                                            m.userId !== guest.odId
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
                                                    onClick={() => onRemoveGuest(idx)}
                                                    style={{
                                                        background: '#FEE2E2',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '0 0.75rem',
                                                        color: '#991B1B',
                                                        cursor: 'pointer',
                                                    }}
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
                                            !guests.some((g) => g.odId === m.userId)
                                    )
                                    return guests.length < 3 && availableMembers.length > 0
                                })() && (
                                    <button
                                        onClick={onAddGuestField}
                                        className="btn"
                                        style={{
                                            width: '100%',
                                            background: 'var(--color-bg)',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <UserPlus size={16} />
                                        Ajouter un joueur
                                    </button>
                                )}
                            </>
                        ) : (
                            <div
                                style={{
                                    background: 'var(--color-bg)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '1rem',
                                    textAlign: 'center',
                                    color: 'var(--color-text-muted)',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Aucun autre membre dans le groupe pour le moment
                            </div>
                        )}

                        <button
                            onClick={onRegister}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                            }}
                        >
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
