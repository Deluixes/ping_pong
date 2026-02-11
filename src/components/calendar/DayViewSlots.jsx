import clsx from 'clsx'
import { Users, X, Lock, Unlock, Trash2 } from 'lucide-react'
import { TIME_SLOTS } from './calendarUtils'
import styles from './DayViewSlots.module.css'

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
        <div className={styles.slotList}>
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

    return (
        <div
            className={clsx(styles.blockedRow, {
                [styles.blockedRowCourseParticipating]: isCourse && isParticipating,
                [styles.blockedRowCourse]: isCourse && !isParticipating,
                [styles.blockedRowTraining]: isTraining,
            })}
        >
            {/* Time Label */}
            <div
                className={clsx(styles.timeLabel, {
                    [styles.timeLabelCourseParticipating]: isCourse && isParticipating,
                    [styles.timeLabelCourse]: isCourse && !isParticipating,
                    [styles.timeLabelTraining]: isTraining,
                })}
            >
                <span>{slot.label}</span>
            </div>

            {/* Slot Info */}
            <div
                onClick={isParticipating && isCourse ? () => onSlotClick(slot.id) : undefined}
                className={clsx(styles.slotInfo, {
                    [styles.slotInfoClickable]: isParticipating && isCourse,
                })}
            >
                <div
                    className={clsx(styles.infoRow, {
                        [styles.courseInfoText]: isCourse,
                        [styles.trainingInfoText]: isTraining,
                    })}
                >
                    <span className={styles.pingPongIcon}>🏓</span>
                    <span className={styles.slotName}>{blockedInfo.name}</span>
                    {isCourse && <span className={styles.infoBadge}>Info</span>}
                </div>
                <div className={styles.coachText}>
                    {blockedInfo.coach}
                    {blockedInfo.group && (
                        <span className={styles.groupBadge}>{blockedInfo.group}</span>
                    )}
                </div>
                {/* Participants pour cours indicatifs */}
                {isCourse && count > 0 && (
                    <div className={styles.participantsList}>
                        <Users size={12} />
                        {participants.map((p, idx) => (
                            <span key={p.id || idx} className={styles.participantName}>
                                {p.name}
                                {p.status === 'pending' && (
                                    <span className={styles.pendingTag}> (en attente)</span>
                                )}
                                {isAdmin && p.id && p.id !== userId && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onAdminDelete(slot.id, p.id, p.name, p.isGuest)
                                        }}
                                        className={styles.adminDeleteBtn}
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
                    className={clsx(styles.actionBtn, styles.actionBtnDelete)}
                    title="Supprimer ce créneau"
                >
                    <Trash2 size={18} />
                </button>
            ) : isTraining ? (
                <div
                    className={clsx(styles.actionBtn, styles.actionBtnLocked)}
                    title="Entraînement réservé"
                >
                    <Lock size={18} />
                </div>
            ) : isParticipating ? (
                <button
                    onClick={() => onUnregister(slot.id)}
                    className={clsx(styles.actionBtn, styles.actionBtnUnregister)}
                    title="Se désinscrire"
                >
                    <X size={20} />
                </button>
            ) : canReserveOnWeek ? (
                <button
                    onClick={() => onSlotClick(slot.id)}
                    className={clsx(styles.actionBtn, styles.actionBtnRegisterCourse)}
                    title="S'inscrire"
                >
                    +
                </button>
            ) : (
                <div
                    className={clsx(styles.actionBtn, styles.actionBtnLocked)}
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

    // Badge de restriction si ouvert avec target spécifique
    const targetBadge =
        isOpened && availability.target !== 'all' ? (
            <span
                className={clsx(styles.targetBadge, {
                    [styles.targetBadgeCompetition]: availability.target === 'competition',
                    [styles.targetBadgeLoisir]: availability.target !== 'competition',
                })}
            >
                {availability.target === 'competition' ? 'Compét' : 'Loisir'}
            </span>
        ) : null

    return (
        <div
            className={clsx(styles.normalRow, {
                [styles.normalRowParticipating]: isParticipating,
                [styles.normalRowOpened]: isOpened && !isParticipating,
                [styles.normalRowClosed]: isClosed && !isOpened && !isParticipating,
                [styles.normalRowDefault]: !isParticipating && !isOpened && !isClosed,
            })}
        >
            {/* Time Label */}
            <div
                className={clsx(styles.timeLabel, {
                    [styles.timeLabelParticipating]: isParticipating,
                    [styles.timeLabelOpened]: isOpened && !isParticipating,
                    [styles.timeLabelClosed]: isClosed && !isOpened && !isParticipating,
                    [styles.timeLabelDefault]: !isParticipating && !isOpened && !isClosed,
                })}
            >
                <span>{slot.label}</span>
            </div>

            {/* Participants Info */}
            <div
                onClick={isParticipating ? () => onSlotClick(slot.id) : undefined}
                className={clsx(styles.slotInfo, {
                    [styles.slotInfoClickable]: isParticipating,
                })}
            >
                {count > 0 ? (
                    <>
                        <div className={styles.infoRow}>
                            <div
                                className={clsx(styles.participantCount, {
                                    [styles.participantCountOverbooked]: isOverbooked,
                                    [styles.participantCountNormal]: !isOverbooked,
                                })}
                            >
                                <Users size={14} />
                                <span className={styles.countText}>
                                    {acceptedCount}/{maxPersons}
                                    {count > acceptedCount && (
                                        <span className={styles.pendingCount}>
                                            {' '}
                                            (+{count - acceptedCount})
                                        </span>
                                    )}
                                </span>
                            </div>
                            {isOverbooked && (
                                <span className={styles.overbookedLabel}>⚠️ Surbooké</span>
                            )}
                            {targetBadge}
                        </div>
                        <div className={styles.participantNames}>
                            {participants.map((p, idx) => (
                                <span
                                    key={`${p.id || p.name}-${idx}`}
                                    className={styles.participantName}
                                    style={{
                                        color: getParticipantColor(p, slot.id),
                                        fontWeight: p.status === 'pending' ? '400' : '500',
                                    }}
                                >
                                    {p.name}
                                    {p.status === 'pending' && (
                                        <span className={styles.pendingTag}>(en attente)</span>
                                    )}
                                    {isAdmin && p.id && p.id !== userId && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onAdminDelete(slot.id, p.id, p.name, p.isGuest)
                                            }}
                                            className={styles.adminDeleteBtn}
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
                    <div className={styles.infoRow}>
                        <span
                            className={clsx(styles.statusText, {
                                [styles.statusClosed]: isClosed && !isOpened,
                                [styles.statusOpened]: isOpened,
                            })}
                        >
                            {isOpened ? 'Ouvert' : 'Fermé'}
                        </span>
                        {targetBadge}
                        {/* Message si mauvaise licence */}
                        {isOpened && !userCanRegister && availability.target !== 'all' && (
                            <span className={styles.licenceHint}>
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
                        className={clsx(styles.actionBtn, styles.actionBtnClose)}
                        title="Fermer ce créneau"
                    >
                        <Lock size={18} />
                    </button>
                ) : isClosed ? (
                    <button
                        onClick={() => onSlotClick(slot.id)}
                        className={clsx(styles.actionBtn, styles.actionBtnOpen)}
                        title="Ouvrir ce créneau"
                    >
                        <Unlock size={18} />
                    </button>
                ) : (
                    <div
                        className={clsx(styles.actionBtn, styles.actionBtnLocked)}
                        title="Créneau géré par le template"
                    >
                        <Lock size={18} />
                    </div>
                )
            ) : // Vues normales : inscription/désinscription
            isParticipating ? (
                <button
                    onClick={() => onUnregister(slot.id)}
                    className={clsx(styles.actionBtn, styles.actionBtnUnregister)}
                    title="Se désinscrire"
                >
                    <X size={20} />
                </button>
            ) : userCanRegister && canReserveOnWeek ? (
                <button
                    onClick={() => onSlotClick(slot.id)}
                    className={clsx(styles.actionBtn, styles.actionBtnRegister)}
                    title="S'inscrire"
                >
                    +
                </button>
            ) : (
                <div
                    className={clsx(styles.actionBtn, styles.actionBtnLocked)}
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
