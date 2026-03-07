import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

const HALF_BUFFER = 180 // 180 jours de chaque cote = ~1 an
const EXTEND_THRESHOLD = 1000 // px du bord pour declencher l'extension
const EXTEND_DAYS = 180

function generateDays(centerDate) {
    const days = []
    for (let i = -HALF_BUFFER; i <= HALF_BUFFER; i++) {
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
    const [dayBuffer, setDayBuffer] = useState(() => generateDays(selectedDate))
    const [visibleMonth, setVisibleMonth] = useState(() =>
        format(selectedDate, 'MMMM yyyy', { locale: fr })
    )
    const extendingRef = useRef(false)
    const scrollRAF = useRef(null)

    // Recentrer le buffer si selectedDate est hors du buffer
    useEffect(() => {
        const isInBuffer = dayBuffer.some((d) => isSameDay(d, selectedDate))
        if (!isInBuffer) {
            setDayBuffer(generateDays(selectedDate))
        }
    }, [selectedDate])

    // Scroll vers le jour selectionne
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
    }, [selectedDate, swipeActive, dayBuffer])

    const handleScroll = useCallback(() => {
        if (scrollRAF.current) return
        scrollRAF.current = requestAnimationFrame(() => {
            scrollRAF.current = null
            const el = daySelectorRef.current
            if (!el) return

            const { scrollLeft, scrollWidth, clientWidth } = el

            // Mettre a jour le mois visible
            const centerX = scrollLeft + clientWidth / 2
            const buttons = el.querySelectorAll('[data-date]')
            let closestBtn = null
            let closestDist = Infinity
            for (const btn of buttons) {
                const btnCenter = btn.offsetLeft + btn.offsetWidth / 2
                const dist = Math.abs(btnCenter - centerX)
                if (dist < closestDist) {
                    closestDist = dist
                    closestBtn = btn
                }
                if (btnCenter > centerX + 100) break // Optimisation: stop apres le centre
            }
            if (closestBtn?.dataset.date) {
                const parsed = new Date(closestBtn.dataset.date + 'T00:00:00')
                const month = format(parsed, 'MMMM yyyy', { locale: fr })
                setVisibleMonth(month)
            }

            // Extension aux bords (une seule fois)
            if (extendingRef.current) return

            if (scrollLeft < EXTEND_THRESHOLD) {
                extendingRef.current = true
                const oldScrollWidth = scrollWidth
                const oldScrollLeft = scrollLeft
                setDayBuffer((prev) => {
                    const firstDay = prev[0]
                    const newDays = []
                    for (let i = EXTEND_DAYS; i >= 1; i--) {
                        newDays.push(addDays(firstDay, -i))
                    }
                    return [...newDays, ...prev]
                })
                // Ajuster scrollLeft apres le re-render
                requestAnimationFrame(() => {
                    if (daySelectorRef.current) {
                        const delta = daySelectorRef.current.scrollWidth - oldScrollWidth
                        daySelectorRef.current.scrollLeft = oldScrollLeft + delta
                    }
                    extendingRef.current = false
                })
            } else if (scrollLeft + clientWidth > scrollWidth - EXTEND_THRESHOLD) {
                extendingRef.current = true
                setDayBuffer((prev) => {
                    const lastDay = prev[prev.length - 1]
                    const newDays = []
                    for (let i = 1; i <= EXTEND_DAYS; i++) {
                        newDays.push(addDays(lastDay, i))
                    }
                    return [...prev, ...newDays]
                })
                requestAnimationFrame(() => {
                    extendingRef.current = false
                })
            }
        })
    }, [])

    return (
        <>
            <button
                onClick={onGoToToday}
                disabled={isToday}
                className={clsx(styles.returnToday, isToday && styles.returnTodayDisabled)}
            >
                Revenir à aujourd'hui
            </button>

            <div className={styles.weekNav}>
                <button onClick={onPrevWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronLeft size={20} />
                </button>
                <span className={styles.weekNavTitle}>{visibleMonth}</span>
                <button onClick={onNextWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronRight size={20} />
                </button>
            </div>

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

            {!isWeekConfigured && !isCurrentWeek && (
                <div className={clsx('alert--warning', styles.warningContent)}>
                    <Info size={18} />
                    <span className={styles.warningText}>
                        Cette semaine n'est pas encore configurée. Les réservations ne sont pas
                        ouvertes.
                    </span>
                </div>
            )}

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
