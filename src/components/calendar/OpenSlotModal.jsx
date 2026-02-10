import { Clock, X, Unlock } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OpenSlotModal({
    slotToOpen,
    selectedDate,
    selectedTarget,
    selectedOpenDuration,
    availableOpenDurations,
    getEndTime,
    onSetSelectedTarget,
    onSetSelectedOpenDuration,
    onOpenSlot,
    onClose,
}) {
    if (!slotToOpen) return null

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
                    maxHeight: '80vh',
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
                        <Unlock size={20} />
                        Ouvrir des créneaux
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
                    <strong>{slotToOpen}</strong> →{' '}
                    <strong>{getEndTime(slotToOpen, selectedOpenDuration)}</strong>
                    <br />
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </p>

                {/* Sélecteur de durée */}
                <div style={{ marginBottom: '1rem' }}>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                        }}
                    >
                        <Clock
                            size={14}
                            style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
                        />
                        Durée
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {availableOpenDurations.map((duration) => (
                            <button
                                key={duration.value}
                                onClick={() => onSetSelectedOpenDuration(duration.slots)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border:
                                        selectedOpenDuration === duration.slots
                                            ? '2px solid var(--color-primary)'
                                            : '1px solid #E2E8F0',
                                    background:
                                        selectedOpenDuration === duration.slots
                                            ? '#EFF6FF'
                                            : 'white',
                                    color:
                                        selectedOpenDuration === duration.slots
                                            ? 'var(--color-primary)'
                                            : 'var(--color-text)',
                                    fontWeight:
                                        selectedOpenDuration === duration.slots ? '600' : '400',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {duration.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label
                        style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                        }}
                    >
                        Ouvrir pour :
                    </label>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                        }}
                    >
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                border:
                                    selectedTarget === 'all'
                                        ? '2px solid var(--color-primary)'
                                        : '1px solid #E2E8F0',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                background: selectedTarget === 'all' ? '#F0FDF4' : 'white',
                            }}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="all"
                                checked={selectedTarget === 'all'}
                                onChange={(e) => onSetSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div style={{ fontWeight: '500' }}>Tous les membres</div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                    Loisir et Compétition
                                </div>
                            </div>
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                border:
                                    selectedTarget === 'loisir'
                                        ? '2px solid #0369A1'
                                        : '1px solid #E2E8F0',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                background: selectedTarget === 'loisir' ? '#E0F2FE' : 'white',
                            }}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="loisir"
                                checked={selectedTarget === 'loisir'}
                                onChange={(e) => onSetSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div style={{ fontWeight: '500', color: '#0369A1' }}>
                                    Loisir uniquement
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                    Licence L
                                </div>
                            </div>
                        </label>

                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                border:
                                    selectedTarget === 'competition'
                                        ? '2px solid #92400E'
                                        : '1px solid #E2E8F0',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                background: selectedTarget === 'competition' ? '#FEF3C7' : 'white',
                            }}
                        >
                            <input
                                type="radio"
                                name="target"
                                value="competition"
                                checked={selectedTarget === 'competition'}
                                onChange={(e) => onSetSelectedTarget(e.target.value)}
                            />
                            <div>
                                <div style={{ fontWeight: '500', color: '#92400E' }}>
                                    Compétition uniquement
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                    Licence C
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{ flex: 1, background: 'var(--color-bg)' }}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onOpenSlot}
                        className="btn btn-primary"
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                        }}
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
