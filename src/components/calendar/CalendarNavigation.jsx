import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CalendarNavigation({
    weekStart,
    selectedDate,
    weekDays,
    viewMode,
    isWeekConfigured,
    isCurrentWeek,
    viewOptions,
    getDayParticipantCount,
    onPrevWeek,
    onNextWeek,
    onSelectDate,
    onSetViewMode,
}) {
    return (
        <>
            {/* Week Navigation */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    marginTop: '1rem',
                    background: 'var(--color-surface)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-sm)',
                }}
            >
                <button
                    onClick={onPrevWeek}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </span>
                <button
                    onClick={onNextWeek}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector */}
            <div
                style={{
                    display: 'flex',
                    gap: '0.5rem',
                    overflowX: 'auto',
                    padding: '0.5rem',
                    marginBottom: '1rem',
                    marginLeft: '-0.5rem',
                    marginRight: '-0.5rem',
                }}
            >
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, new Date())
                    const participantCount = getDayParticipantCount(day)

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onSelectDate(day)}
                            style={{
                                flex: '0 0 auto',
                                minWidth: '70px',
                                padding: '0.75rem 0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: isSelected
                                    ? '2px solid var(--color-primary)'
                                    : '1px solid #E2E8F0',
                                background: isSelected
                                    ? 'var(--color-primary)'
                                    : 'var(--color-surface)',
                                color: isSelected ? 'white' : 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.25rem',
                                position: 'relative',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    textTransform: 'uppercase',
                                    opacity: 0.7,
                                }}
                            >
                                {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                {format(day, 'd')}
                            </span>
                            {isToday && !isSelected && (
                                <div
                                    style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'var(--color-primary)',
                                        marginTop: '2px',
                                    }}
                                />
                            )}
                            {participantCount > 0 && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: isSelected ? 'white' : 'var(--color-primary)',
                                        color: isSelected ? 'var(--color-primary)' : 'white',
                                        fontSize: '0.65rem',
                                        fontWeight: 'bold',
                                        padding: '2px 5px',
                                        borderRadius: '10px',
                                        minWidth: '18px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {participantCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Warning if week not configured and not current week */}
            {!isWeekConfigured && !isCurrentWeek && (
                <div
                    style={{
                        background: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#92400E',
                    }}
                >
                    <Info size={18} />
                    <span style={{ fontSize: '0.9rem' }}>
                        Cette semaine n'est pas encore configurée. Les réservations ne sont pas
                        ouvertes.
                    </span>
                </div>
            )}

            {/* Filter + Edit Mode - Centered */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: '1rem',
                }}
            >
                <select
                    value={viewMode}
                    onChange={(e) => onSetViewMode(e.target.value)}
                    style={{
                        padding: '0.5rem 1.5rem 0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #E2E8F0',
                        background:
                            viewMode === 'edit'
                                ? '#FEE2E2'
                                : viewMode === 'manage_slots'
                                  ? '#E0F2FE'
                                  : 'white',
                        fontSize: '0.85rem',
                        color:
                            viewMode === 'edit'
                                ? '#991B1B'
                                : viewMode === 'manage_slots'
                                  ? '#0369A1'
                                  : 'var(--color-text)',
                        cursor: 'pointer',
                        fontWeight:
                            viewMode === 'edit' || viewMode === 'manage_slots' ? '500' : '400',
                    }}
                >
                    {viewOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </>
    )
}
