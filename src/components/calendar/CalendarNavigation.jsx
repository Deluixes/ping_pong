import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

const BUFFER_DAYS_EACH_SIDE = 10
const EXTEND_COUNT = 7
const MAX_BUFFER = 42
const SCROLL_EDGE_THRESHOLD = 100

function generateDayBuffer(
    centerDate,
    before = BUFFER_DAYS_EACH_SIDE,
    after = BUFFER_DAYS_EACH_SIDE
) {
    const days = []
    for (let i = -before; i <= after; i++) {
        days.push(addDays(centerDate, i))
    }
    return days
}

export default function CalendarNavigation({
    weekStart,
    selectedDate,
    viewMode,
    isWeekConfigured,
    isCurrentWeek,
    isToday,
    viewOptions,
    daysWithSlots,
    swipeActive,
    onPrevWeek,
    onNextWeek,
    onSelectDate,
    onSetViewMode,
    onGoToToday,
}) {
    const daySelectorRef = useRef(null)
    const [dayBuffer, setDayBuffer] = useState(() => generateDayBuffer(selectedDate))
    const scrollAdjustRef = useRef(null)
    const lastCenterRef = useRef(selectedDate)

    // Recentrer le buffer quand selectedDate change significativement
    useEffect(() => {
        const first = dayBuffer[0]
        const last = dayBuffer[dayBuffer.length - 1]
        const edgeThreshold = 5

        const daysFromStart = Math.round((selectedDate - first) / (1000 * 60 * 60 * 24))
        const daysFromEnd = Math.round((last - selectedDate) / (1000 * 60 * 60 * 24))

        if (daysFromStart < edgeThreshold || daysFromEnd < edgeThreshold) {
            setDayBuffer(generateDayBuffer(selectedDate))
            lastCenterRef.current = selectedDate
        }
    }, [selectedDate])

    // Scroll le jour selectionne en vue quand selectedDate change
    useEffect(() => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const btn = daySelectorRef.current?.querySelector(`[data-date="${dateStr}"]`)
        const container = daySelectorRef.current
        if (btn && container?.scrollTo) {
            const scrollTarget = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2
            container.scrollTo({
                left: scrollTarget,
                behavior: swipeActive ? 'instant' : 'smooth',
            })
        }
    }, [selectedDate, swipeActive])

    // Ajuster scrollLeft apres un prepend de jours
    useLayoutEffect(() => {
        if (scrollAdjustRef.current && daySelectorRef.current) {
            const { oldScrollLeft, oldScrollWidth } = scrollAdjustRef.current
            const newScrollWidth = daySelectorRef.current.scrollWidth
            const delta = newScrollWidth - oldScrollWidth
            daySelectorRef.current.scrollLeft = oldScrollLeft + delta
            scrollAdjustRef.current = null
        }
    })

    const handleScroll = useCallback(() => {
        const el = daySelectorRef.current
        if (!el) return

        const { scrollLeft, scrollWidth, clientWidth } = el

        if (scrollLeft < SCROLL_EDGE_THRESHOLD) {
            // Prepend jours
            setDayBuffer((prev) => {
                if (prev.length >= MAX_BUFFER) {
                    // Trim de la fin si buffer trop grand
                    const trimmed = prev.slice(0, prev.length - EXTEND_COUNT)
                    const firstDay = trimmed[0]
                    const newDays = []
                    for (let i = EXTEND_COUNT; i >= 1; i--) {
                        newDays.push(addDays(firstDay, -i))
                    }
                    scrollAdjustRef.current = {
                        oldScrollLeft: scrollLeft,
                        oldScrollWidth: scrollWidth,
                    }
                    return [...newDays, ...trimmed]
                }
                const firstDay = prev[0]
                const newDays = []
                for (let i = EXTEND_COUNT; i >= 1; i--) {
                    newDays.push(addDays(firstDay, -i))
                }
                scrollAdjustRef.current = { oldScrollLeft: scrollLeft, oldScrollWidth: scrollWidth }
                return [...newDays, ...prev]
            })
        }

        if (scrollLeft + clientWidth > scrollWidth - SCROLL_EDGE_THRESHOLD) {
            // Append jours
            setDayBuffer((prev) => {
                if (prev.length >= MAX_BUFFER) {
                    // Trim du debut si buffer trop grand
                    const trimmed = prev.slice(EXTEND_COUNT)
                    const lastDay = trimmed[trimmed.length - 1]
                    const newDays = []
                    for (let i = 1; i <= EXTEND_COUNT; i++) {
                        newDays.push(addDays(lastDay, i))
                    }
                    return [...trimmed, ...newDays]
                }
                const lastDay = prev[prev.length - 1]
                const newDays = []
                for (let i = 1; i <= EXTEND_COUNT; i++) {
                    newDays.push(addDays(lastDay, i))
                }
                return [...prev, ...newDays]
            })
        }
    }, [])

    return (
        <>
            {/* Bouton Revenir a aujourd'hui */}
            <button
                onClick={onGoToToday}
                disabled={isToday}
                className={clsx(styles.returnToday, isToday && styles.returnTodayDisabled)}
            >
                Revenir à aujourd'hui
            </button>

            {/* Week Navigation */}
            <div className={styles.weekNav}>
                <button onClick={onPrevWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronLeft size={20} />
                </button>
                <span className={styles.weekNavTitle}>
                    {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMMM yyyy', {
                        locale: fr,
                    })}
                </span>
                <button onClick={onNextWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector - Infinite Scroll */}
            <div className={styles.daySelector} ref={daySelectorRef} onScroll={handleScroll}>
                {dayBuffer.map((day) => {
                    const isSelected = isSameDay(day, selectedDate)
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const hasSlots = daysWithSlots.includes(dayStr)

                    return (
                        <button
                            key={dayStr}
                            data-date={dayStr}
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

            {/* Filter + Edit Mode */}
            <div className={styles.viewModeWrapper}>
                <select
                    value={viewMode}
                    onChange={(e) => onSetViewMode(e.target.value)}
                    className={clsx(
                        styles.viewModeSelect,
                        viewMode === 'edit' && styles.viewModeSelectEdit,
                        viewMode === 'manage_slots' && styles.viewModeSelectManageSlots
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
