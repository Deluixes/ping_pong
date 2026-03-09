import React from 'react'
import clsx from 'clsx'
import { format, addWeeks, isSameWeek, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import styles from './WeekCalendarGrid.module.css'

export default function WeekCalendarGrid({
    currentMonth,
    weeks,
    configuredWeeks,
    selectedWeeks,
    loading,
    onPrevMonth,
    onNextMonth,
    onToggleWeek,
    onSelectAll,
    onClearSelection,
}) {
    const today = startOfDay(new Date())

    const isWeekSelected = (weekStart) => {
        const weekStr = format(weekStart, 'yyyy-MM-dd')
        return selectedWeeks.includes(weekStr)
    }

    const isWeekConfigured = (weekStart) => {
        const weekStr = format(weekStart, 'yyyy-MM-dd')
        return configuredWeeks.includes(weekStr)
    }

    const isCurrentWeek = (weekStart) => {
        return isSameWeek(weekStart, today, { weekStartsOn: 1 })
    }

    return (
        <>
            {/* Month navigation */}
            <div className={styles.monthNav}>
                <button onClick={onPrevMonth} className={clsx('btn', styles.monthNavBtn)}>
                    <ChevronLeft size={20} />
                </button>
                <span className={styles.monthLabel}>
                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={onNextMonth} className={clsx('btn', styles.monthNavBtn)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Selection actions */}
            <div className={styles.selectionActions}>
                <button onClick={onSelectAll} className={clsx('btn', styles.selectionBtn)}>
                    Tout sélectionner
                </button>
                <button onClick={onClearSelection} className={clsx('btn', styles.selectionBtn)}>
                    Effacer
                </button>
                {selectedWeeks.length > 0 && (
                    <span className={styles.selectionCount}>{selectedWeeks.length} semaine(s)</span>
                )}
            </div>

            {/* Weeks grid */}
            {loading ? (
                <div className={styles.loading}>Chargement...</div>
            ) : (
                <div className={styles.weeksGrid}>
                    {weeks.map((weekStart) => {
                        const weekStr = format(weekStart, 'yyyy-MM-dd')
                        const selected = isWeekSelected(weekStart)
                        const configured = isWeekConfigured(weekStart)
                        const current = isCurrentWeek(weekStart)

                        return (
                            <button
                                key={weekStr}
                                onClick={() => onToggleWeek(weekStart)}
                                className={clsx(
                                    styles.weekBtn,
                                    selected ? styles.weekBtnSelected : styles.weekBtnUnselected
                                )}
                            >
                                {/* Checkbox */}
                                <div
                                    className={clsx(
                                        styles.checkbox,
                                        selected ? styles.checkboxChecked : styles.checkboxUnchecked
                                    )}
                                >
                                    {selected && <Check size={14} color="white" />}
                                </div>

                                {/* Week info */}
                                <div className={styles.weekInfo}>
                                    <div className={styles.weekDateRange}>
                                        {format(weekStart, 'd MMM', { locale: fr })} -{' '}
                                        {format(addWeeks(weekStart, 1), 'd MMM', {
                                            locale: fr,
                                        })}
                                    </div>
                                    <div className={styles.weekNumber}>
                                        Semaine {format(weekStart, 'w')}
                                    </div>
                                </div>

                                {/* Status badges */}
                                <div className={styles.statusBadges}>
                                    {current && (
                                        <span className={styles.badgeCurrent}>En cours</span>
                                    )}
                                    {configured && (
                                        <span className={styles.badgeConfigured}>Configurée</span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}
        </>
    )
}
