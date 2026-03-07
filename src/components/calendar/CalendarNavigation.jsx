import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
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
    const [visibleMonth, setVisibleMonth] = useState(() =>
        format(selectedDate, 'MMMM yyyy', { locale: fr })
    )
    const scrollAdjustRef = useRef(null)
    const isExtendingRef = useRef(false)
    const scrollRAF = useRef(null)

    // Recentrer le buffer UNIQUEMENT si selectedDate est hors du buffer
    useEffect(() => {
        const isInBuffer = dayBuffer.some((d) => isSameDay(d, selectedDate))
        if (!isInBuffer) {
            setDayBuffer(generateDayBuffer(selectedDate))
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

    // Ajuster scrollLeft apres un prepend de jours et debloquer
    useLayoutEffect(() => {
        if (scrollAdjustRef.current && daySelectorRef.current) {
            const { oldScrollLeft, oldScrollWidth, trimLeft } = scrollAdjustRef.current
            const newScrollWidth = daySelectorRef.current.scrollWidth
            if (trimLeft) {
                // On a trimme a gauche : reduire scrollLeft
                const delta = oldScrollWidth - newScrollWidth
                daySelectorRef.current.scrollLeft = oldScrollLeft - delta
            } else {
                // On a prepend a gauche : augmenter scrollLeft
                const delta = newScrollWidth - oldScrollWidth
                daySelectorRef.current.scrollLeft = oldScrollLeft + delta
            }
            scrollAdjustRef.current = null
        }
        isExtendingRef.current = false
    })

    const updateVisibleMonth = useCallback((el) => {
        const centerX = el.scrollLeft + el.clientWidth / 2
        const buttons = el.querySelectorAll('[data-date]')
        for (const btn of buttons) {
            if (btn.offsetLeft <= centerX && btn.offsetLeft + btn.offsetWidth >= centerX) {
                const dateStr = btn.dataset.date
                if (dateStr) {
                    const parsed = new Date(dateStr + 'T00:00:00')
                    const month = format(parsed, 'MMMM yyyy', { locale: fr })
                    setVisibleMonth(month)
                }
                break
            }
        }
    }, [])

    const handleScroll = useCallback(() => {
        if (scrollRAF.current) return
        scrollRAF.current = requestAnimationFrame(() => {
            scrollRAF.current = null
            if (isExtendingRef.current) return
            const el = daySelectorRef.current
            if (!el) return

            const { scrollLeft, scrollWidth, clientWidth } = el

            // Mettre a jour le mois visible
            updateVisibleMonth(el)

            if (scrollLeft < SCROLL_EDGE_THRESHOLD) {
                isExtendingRef.current = true
                setDayBuffer((prev) => {
                    const firstDay = prev[0]
                    const newDays = []
                    for (let i = EXTEND_COUNT; i >= 1; i--) {
                        newDays.push(addDays(firstDay, -i))
                    }
                    const extended = [...newDays, ...prev]
                    // Trim a droite si trop grand
                    const result =
                        extended.length > MAX_BUFFER ? extended.slice(0, MAX_BUFFER) : extended
                    scrollAdjustRef.current = {
                        oldScrollLeft: scrollLeft,
                        oldScrollWidth: scrollWidth,
                        trimLeft: false,
                    }
                    return result
                })
            } else if (scrollLeft + clientWidth > scrollWidth - SCROLL_EDGE_THRESHOLD) {
                isExtendingRef.current = true
                setDayBuffer((prev) => {
                    const lastDay = prev[prev.length - 1]
                    const newDays = []
                    for (let i = 1; i <= EXTEND_COUNT; i++) {
                        newDays.push(addDays(lastDay, i))
                    }
                    const extended = [...prev, ...newDays]
                    // Trim a gauche si trop grand
                    if (extended.length > MAX_BUFFER) {
                        const trimCount = extended.length - MAX_BUFFER
                        scrollAdjustRef.current = {
                            oldScrollLeft: scrollLeft,
                            oldScrollWidth: scrollWidth,
                            trimLeft: true,
                        }
                        return extended.slice(trimCount)
                    }
                    return extended
                })
            }
        })
    }, [updateVisibleMonth])

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
                <span className={styles.weekNavTitle}>{visibleMonth}</span>
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
