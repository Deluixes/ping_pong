import { Users, X, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ParticipantsModal({
    selectedSlotId,
    selectedDate,
    participantsToShow,
    isUserRegistered,
    isUserOnSlot,
    onRegister,
    onInviteOnly,
    onClose,
}) {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    width: '90%',
                    maxWidth: '400px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    animation: 'slideUp 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
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
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Users size={20} />
                        Joueurs sur ce créneau
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
                        margin: '0 0 1rem 0',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.9rem',
                    }}
                >
                    {selectedSlotId} - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                    }}
                >
                    {participantsToShow.map((p, index) => (
                        <div
                            key={p.id || index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem',
                                background: 'var(--color-bg)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        >
                            {/* Avatar */}
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.2rem',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                }}
                            >
                                {p.profilePhotoUrl ? (
                                    <img
                                        src={p.profilePhotoUrl}
                                        alt={p.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    p.name?.charAt(0).toUpperCase() || '?'
                                )}
                            </div>

                            {/* Nom et infos */}
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {p.name}
                                    {p.status === 'pending' && (
                                        <span
                                            style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--color-warning)',
                                                fontWeight: 'normal',
                                            }}
                                        >
                                            (en attente)
                                        </span>
                                    )}
                                </div>
                                {p.licenseType && (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            marginTop: '0.25rem',
                                            padding: '0.15rem 0.5rem',
                                            background:
                                                p.licenseType === 'Compétition'
                                                    ? 'var(--color-primary)'
                                                    : 'var(--color-secondary)',
                                            color: 'white',
                                            borderRadius: '1rem',
                                            fontSize: '0.7rem',
                                            fontWeight: '500',
                                        }}
                                    >
                                        {p.licenseType}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {participantsToShow.length === 0 && (
                    <p
                        style={{
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            padding: '2rem 0',
                        }}
                    >
                        Aucun joueur sur ce créneau
                    </p>
                )}

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginTop: '1.5rem',
                    }}
                >
                    {/* Boutons S'inscrire / Inviter seulement si pas inscrit */}
                    {!isUserRegistered && !isUserOnSlot && (
                        <>
                            <button
                                onClick={onRegister}
                                className="btn btn-primary"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '1rem',
                                }}
                            >
                                <UserPlus size={18} />
                                S'inscrire
                            </button>
                            <button
                                onClick={onInviteOnly}
                                className="btn"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    padding: '1rem',
                                    background: 'var(--color-bg)',
                                }}
                            >
                                <Users size={18} />
                                Inviter seulement
                            </button>
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            width: '100%',
                            background:
                                isUserRegistered || isUserOnSlot
                                    ? 'var(--color-primary)'
                                    : 'transparent',
                            color:
                                isUserRegistered || isUserOnSlot
                                    ? 'white'
                                    : 'var(--color-text-muted)',
                        }}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}
