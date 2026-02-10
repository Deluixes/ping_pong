import { Users, X, Lock, Unlock, Trash2 } from 'lucide-react'
import { TIME_SLOTS } from './calendarUtils'

export default function DayViewSlots({
    viewMode,
    userId,
    isAdmin,
    maxPersons,
    canReserveOnWeek,
    getBlockedSlotInfo,
    isSlotInOpeningHours,
    isSlotAvailable,
    canUserRegister,
    isUserParticipating,
    getParticipants,
    getAcceptedParticipantCount,
    getParticipantColor,
    getOpenedSlotInfo,
    onSlotClick,
    onUnregister,
    onAdminDelete,
    onCloseSlot,
    onDeleteWeekSlot,
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {TIME_SLOTS.filter((slot) => {
                // 1. Filtrer par plages horaires (sauf créneaux bloqués qui s'affichent toujours)
                const blockedInfo = getBlockedSlotInfo(slot.id)
                const isBlocked = blockedInfo !== undefined
                if (!isBlocked && !isSlotInOpeningHours(slot.id)) return false

                // 2. Filtre selon viewMode
                if (viewMode === 'occupied') {
                    const hasParticipants = getParticipants(slot.id).length > 0
                    const isOpenedSlot = getOpenedSlotInfo(slot.id) !== undefined
                    return hasParticipants || isBlocked || isOpenedSlot
                }
                return true
            }).map((slot) => {
                const blockedInfo = getBlockedSlotInfo(slot.id)
                const availability = isSlotAvailable(slot.id)
                const userCanRegister = canUserRegister(slot.id)
                const isParticipating = isUserParticipating(slot.id)
                const participants = getParticipants(slot.id)
                const count = participants.length
                const acceptedCount = getAcceptedParticipantCount(slot.id)
                const isOverbooked = acceptedCount > maxPersons

                // Si le créneau est un entraînement (bloquant) ou un cours (indicatif)
                if (blockedInfo) {
                    return (
                        <BlockedSlotRow
                            key={slot.id}
                            slot={slot}
                            blockedInfo={blockedInfo}
                            isParticipating={isParticipating}
                            participants={participants}
                            count={count}
                            viewMode={viewMode}
                            isAdmin={isAdmin}
                            userId={userId}
                            canReserveOnWeek={canReserveOnWeek}
                            onSlotClick={onSlotClick}
                            onUnregister={onUnregister}
                            onAdminDelete={onAdminDelete}
                            onDeleteWeekSlot={onDeleteWeekSlot}
                        />
                    )
                }

                // Créneau normal (non entraînement, non cours)
                return (
                    <NormalSlotRow
                        key={slot.id}
                        slot={slot}
                        availability={availability}
                        userCanRegister={userCanRegister}
                        isParticipating={isParticipating}
                        participants={participants}
                        count={count}
                        acceptedCount={acceptedCount}
                        isOverbooked={isOverbooked}
                        maxPersons={maxPersons}
                        viewMode={viewMode}
                        isAdmin={isAdmin}
                        userId={userId}
                        canReserveOnWeek={canReserveOnWeek}
                        getParticipantColor={getParticipantColor}
                        onSlotClick={onSlotClick}
                        onUnregister={onUnregister}
                        onAdminDelete={onAdminDelete}
                        onCloseSlot={onCloseSlot}
                    />
                )
            })}
        </div>
    )
}

function BlockedSlotRow({
    slot,
    blockedInfo,
    isParticipating,
    participants,
    count,
    viewMode,
    isAdmin,
    userId,
    canReserveOnWeek,
    onSlotClick,
    onUnregister,
    onAdminDelete,
    onDeleteWeekSlot,
}) {
    const isCourse = blockedInfo.isBlocking === false
    const isTraining = blockedInfo.isBlocking !== false

    let bgColor, timeColor, textColor
    if (isCourse) {
        bgColor = isParticipating ? '#F0FDF4' : '#EFF6FF'
        timeColor = isParticipating ? '#22C55E' : '#3B82F6'
        textColor = '#1D4ED8'
    } else {
        bgColor = '#F3F4F6'
        timeColor = '#9CA3AF'
        textColor = '#6B7280'
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'stretch',
                background: bgColor,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                border: isParticipating
                    ? '2px solid #22C55E'
                    : isCourse
                      ? '1px solid #93C5FD'
                      : '1px solid #E2E8F0',
                opacity: isTraining ? 0.8 : 1,
            }}
        >
            {/* Time Label */}
            <div
                style={{
                    width: '60px',
                    padding: '0.75rem 0.5rem',
                    background: timeColor,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                }}
            >
                <span>{slot.label}</span>
            </div>

            {/* Slot Info */}
            <div
                onClick={isParticipating && isCourse ? () => onSlotClick(slot.id) : undefined}
                style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '0.15rem',
                    minWidth: 0,
                    cursor: isParticipating && isCourse ? 'pointer' : 'default',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: textColor,
                        flexWrap: 'wrap',
                    }}
                >
                    <span style={{ fontSize: '1rem' }}>🏓</span>
                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                        {blockedInfo.name}
                    </span>
                    {isCourse && (
                        <span
                            style={{
                                fontSize: '0.7rem',
                                background: '#DBEAFE',
                                color: '#1D4ED8',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                            }}
                        >
                            Info
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                    {blockedInfo.coach}
                    {blockedInfo.group && (
                        <span
                            style={{
                                marginLeft: '0.5rem',
                                background: '#E5E7EB',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '4px',
                            }}
                        >
                            {blockedInfo.group}
                        </span>
                    )}
                </div>
                {/* Participants pour cours indicatifs */}
                {isCourse && count > 0 && (
                    <div
                        style={{
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            marginTop: '0.25rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.25rem',
                        }}
                    >
                        <Users size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {participants.map((p, idx) => (
                            <span
                                key={p.id || idx}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.15rem',
                                }}
                            >
                                {p.name}
                                {p.status === 'pending' && (
                                    <span style={{ opacity: 0.7 }}> (en attente)</span>
                                )}
                                {isAdmin && p.id && p.id !== userId && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAdminDelete(slot.id, p.id, p.name, p.isGuest)
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#EF4444',
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            display: 'inline-flex',
                                        }}
                                        title="Supprimer (admin)"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                                {idx < participants.length - 1 && ', '}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Action/indicator */}
            {viewMode === 'edit' && isAdmin ? (
                <button
                    onClick={() => onDeleteWeekSlot(blockedInfo.id)}
                    style={{
                        width: '50px',
                        background: '#FEE2E2',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#DC2626',
                        cursor: 'pointer',
                    }}
                    title="Supprimer ce créneau"
                >
                    <Trash2 size={18} />
                </button>
            ) : isTraining ? (
                <div
                    style={{
                        width: '50px',
                        background: '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9CA3AF',
                    }}
                    title="Entraînement réservé"
                >
                    <Lock size={18} />
                </div>
            ) : isParticipating ? (
                <button
                    onClick={() => onUnregister(slot.id)}
                    style={{
                        width: '50px',
                        border: 'none',
                        background: '#22C55E',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Se désinscrire"
                >
                    <X size={20} />
                </button>
            ) : canReserveOnWeek ? (
                <button
                    onClick={() => onSlotClick(slot.id)}
                    style={{
                        width: '50px',
                        border: 'none',
                        background: '#DBEAFE',
                        color: '#3B82F6',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="S'inscrire"
                >
                    +
                </button>
            ) : (
                <div
                    style={{
                        width: '50px',
                        background: '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9CA3AF',
                    }}
                    title="Réservations fermées"
                >
                    <Lock size={18} />
                </div>
            )}
        </div>
    )
}

function NormalSlotRow({
    slot,
    availability,
    userCanRegister,
    isParticipating,
    participants,
    count,
    acceptedCount,
    isOverbooked,
    maxPersons,
    viewMode,
    isAdmin,
    userId,
    canReserveOnWeek,
    getParticipantColor,
    onSlotClick,
    onUnregister,
    onAdminDelete,
    onCloseSlot,
}) {
    const isClosed = !availability.available
    const isOpened = availability.type === 'opened'

    // Couleurs selon l'état
    let bgColor = 'var(--color-surface)'
    let timeColor = 'var(--color-bg)'
    let borderColor = '1px solid #E2E8F0'
    let statusText = 'Fermé'
    let statusColor = '#9CA3AF'

    if (isParticipating) {
        bgColor = '#F0FDF4'
        timeColor = '#22C55E'
        borderColor = '2px solid #22C55E'
    } else if (isOpened) {
        bgColor = '#F0FDF4'
        timeColor = '#22C55E'
        borderColor = '1px solid #86EFAC'
        statusText = 'Ouvert'
        statusColor = '#22C55E'
    } else if (isClosed) {
        bgColor = '#F9FAFB'
        timeColor = '#D1D5DB'
        borderColor = '1px solid #E5E7EB'
        statusText = 'Fermé'
        statusColor = '#9CA3AF'
    }

    // Badge de restriction si ouvert avec target spécifique
    const targetBadge =
        isOpened && availability.target !== 'all' ? (
            <span
                style={{
                    fontSize: '0.65rem',
                    background: availability.target === 'competition' ? '#FEF3C7' : '#E0F2FE',
                    color: availability.target === 'competition' ? '#92400E' : '#0369A1',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    fontWeight: '600',
                }}
            >
                {availability.target === 'competition' ? 'Compét' : 'Loisir'}
            </span>
        ) : null

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'stretch',
                background: bgColor,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                border: borderColor,
            }}
        >
            {/* Time Label */}
            <div
                style={{
                    width: '60px',
                    padding: '0.75rem 0.5rem',
                    background: timeColor,
                    color: isParticipating || isOpened ? 'white' : '#6B7280',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                }}
            >
                <span>{slot.label}</span>
            </div>

            {/* Participants Info */}
            <div
                onClick={isParticipating ? () => onSlotClick(slot.id) : undefined}
                style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    minWidth: 0,
                    cursor: isParticipating ? 'pointer' : 'default',
                }}
            >
                {count > 0 ? (
                    <>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    color: isOverbooked ? '#EF4444' : 'var(--color-secondary)',
                                }}
                            >
                                <Users size={14} />
                                <span
                                    style={{
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                    }}
                                >
                                    {acceptedCount}/{maxPersons}
                                    {count > acceptedCount && (
                                        <span
                                            style={{
                                                color: '#9CA3AF',
                                                fontWeight: 'normal',
                                            }}
                                        >
                                            {' '}
                                            (+{count - acceptedCount})
                                        </span>
                                    )}
                                </span>
                            </div>
                            {isOverbooked && (
                                <span
                                    style={{
                                        fontSize: '0.75rem',
                                        color: '#EF4444',
                                        fontWeight: '500',
                                    }}
                                >
                                    ⚠️ Surbooké
                                </span>
                            )}
                            {targetBadge}
                        </div>
                        <div
                            style={{
                                fontSize: '0.8rem',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.25rem',
                            }}
                        >
                            {participants.map((p, idx) => (
                                <span
                                    key={`${p.id || p.name}-${idx}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.15rem',
                                        color: getParticipantColor(p, slot.id),
                                        fontWeight: p.status === 'pending' ? '400' : '500',
                                    }}
                                >
                                    {p.name}
                                    {p.status === 'pending' && (
                                        <span
                                            style={{
                                                fontSize: '0.7rem',
                                                opacity: 0.7,
                                            }}
                                        >
                                            (en attente)
                                        </span>
                                    )}
                                    {isAdmin && p.id && p.id !== userId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAdminDelete(slot.id, p.id, p.name, p.isGuest)
                                            }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#EF4444',
                                                cursor: 'pointer',
                                                padding: '0 2px',
                                                display: 'inline-flex',
                                            }}
                                            title="Supprimer (admin)"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                    {idx < participants.length - 1 && ', '}
                                </span>
                            ))}
                        </div>
                    </>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <span
                            style={{
                                color: statusColor,
                                fontSize: '0.85rem',
                            }}
                        >
                            {statusText}
                        </span>
                        {targetBadge}
                        {/* Message si mauvaise licence */}
                        {isOpened && !userCanRegister && availability.target !== 'all' && (
                            <span
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#9CA3AF',
                                }}
                            >
                                (licence {availability.target === 'competition' ? 'C' : 'L'}{' '}
                                requise)
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Action Button - selon viewMode */}
            {viewMode === 'manage_slots' ? (
                // Vue gestion créneaux : seulement ouvrir/fermer
                isOpened ? (
                    <button
                        onClick={() => onCloseSlot(slot.id)}
                        style={{
                            width: '50px',
                            border: 'none',
                            background: '#FEE2E2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Fermer ce créneau"
                    >
                        <Lock size={18} />
                    </button>
                ) : isClosed ? (
                    <button
                        onClick={() => onSlotClick(slot.id)}
                        style={{
                            width: '50px',
                            border: 'none',
                            background: '#E0F2FE',
                            color: '#0369A1',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Ouvrir ce créneau"
                    >
                        <Unlock size={18} />
                    </button>
                ) : (
                    <div
                        style={{
                            width: '50px',
                            background: '#E5E7EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9CA3AF',
                        }}
                        title="Créneau géré par le template"
                    >
                        <Lock size={18} />
                    </div>
                )
            ) : // Vues normales : inscription/désinscription
            isParticipating ? (
                <button
                    onClick={() => onUnregister(slot.id)}
                    style={{
                        width: '50px',
                        border: 'none',
                        background: '#22C55E',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Se désinscrire"
                >
                    <X size={20} />
                </button>
            ) : userCanRegister && canReserveOnWeek ? (
                <button
                    onClick={() => onSlotClick(slot.id)}
                    style={{
                        width: '50px',
                        border: 'none',
                        background: '#DCFCE7',
                        color: '#22C55E',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="S'inscrire"
                >
                    +
                </button>
            ) : (
                <div
                    style={{
                        width: '50px',
                        background: '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9CA3AF',
                    }}
                    title={
                        isClosed
                            ? 'Créneau fermé'
                            : !userCanRegister
                              ? 'Licence non compatible'
                              : 'Non disponible'
                    }
                >
                    <Lock size={18} />
                </div>
            )}
        </div>
    )
}
