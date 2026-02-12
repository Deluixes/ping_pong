import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

export default function CalendarNavigation({
    weekStart,
    selectedDate,
    weekDays,
    viewMode,
    isWeekConfigured,
    isCurrentWeek,
    viewOptions,
    daysWithSlots,
    onPrevWeek,
    onNextWeek,
    onSelectDate,
    onSetViewMode,
}) {
    return (
        <>
            {/* Week Navigation */}
            <div className={styles.weekNav}>
                <button onClick={onPrevWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronLeft size={20} />
                </button>
                <span className={styles.weekNavTitle}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={onNextWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector */}
            <div className={styles.daySelector}>
                {weekDays.map((day) => {
                    const isSelected = isSameDay(day, selectedDate)
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const hasSlots = daysWithSlots.includes(dayStr)

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => onSelectDate(day)}
                            className={clsx(
                                styles.dayBtn,
                                !isSelected && hasSlots && styles.dayBtnHasSlots,
                                isSelected && !hasSlots && styles.dayBtnSelected,
                                isSelected && hasSlots && styles.dayBtnSelectedHasSlots
                            )}
                        >
                            <span className={styles.dayLabel}>
                                {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span className={styles.dayNumber}>{format(day, 'd')}</span>
                        </button>
                    )
                })}
            </div>

            {/* Warning if week not configured and not current week */}
            {!isWeekConfigured && !isCurrentWeek && (
                <div className={clsx('alert--warning', styles.warningContent)}>
                    <Info size={18} />
                    <span className={styles.warningText}>
                        Cette semaine n'est pas encore configurée. Les réservations ne sont pas
                        ouvertes.
                    </span>
                </div>
            )}

            {/* Filter + Edit Mode - Centered */}
            <div className={styles.viewModeWrapper}>
                <select
                    value={viewMode}
                    onChange={(e) => onSetViewMode(e.target.value)}
                    className={clsx(
                        styles.viewModeSelect,
                        viewMode === 'edit' && styles.viewModeEdit,
                        viewMode === 'manage_slots' && styles.viewModeManageSlots
                    )}
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
