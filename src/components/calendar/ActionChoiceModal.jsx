import { Users, Edit3 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ActionChoiceModal({
    selectedSlotId,
    selectedDate,
    onShowParticipants,
    onOpenInviteModal,
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
                background: 'rgba(0,0,0,0.5)',
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
                    maxWidth: '320px',
                    animation: 'slideUp 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center' }}>
                    Créneau de {selectedSlotId}
                </h3>
                <p
                    style={{
                        margin: '0 0 1.5rem 0',
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '0.9rem',
                    }}
                >
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                <button
                    onClick={() => onShowParticipants(selectedSlotId)}
                    className="btn"
                    style={{
                        width: '100%',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: 'var(--color-bg)',
                        padding: '1rem',
                    }}
                >
                    <Users size={18} />
                    Voir les joueurs
                </button>

                <button
                    onClick={onOpenInviteModal}
                    className="btn"
                    style={{
                        width: '100%',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: 'var(--color-bg)',
                        padding: '1rem',
                    }}
                >
                    <Edit3 size={18} />
                    Modifier l'inscription
                </button>

                <button
                    onClick={onClose}
                    className="btn"
                    style={{
                        width: '100%',
                        background: 'transparent',
                        color: 'var(--color-text-muted)',
                    }}
                >
                    Annuler
                </button>
            </div>
        </div>
    )
}
