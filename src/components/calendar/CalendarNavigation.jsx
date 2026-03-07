import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

const HALF_BUFFER = 180
const EXTEND_THRESHOLD = 10000
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
    const monthTitleRef = useRef(null)
    const todayBtnRef = useRef(null)
    const [dayBuffer, setDayBuffer] = useState(() => generateDays(selectedDate))
    const extendingRef = useRef(false)
    const scrollRAF = useRef(null)
    const lastMonthRef = useRef('')
    const todayVisibleRef = useRef(true)

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

    // Initialiser le mois affiche
    useEffect(() => {
        const month = format(selectedDate, 'MMMM yyyy', { locale: fr })
        lastMonthRef.current = month
        if (monthTitleRef.current) {
            monthTitleRef.current.textContent = month
        }
    }, [selectedDate])

    const handleScroll = useCallback(() => {
        if (scrollRAF.current) return
        scrollRAF.current = requestAnimationFrame(() => {
            scrollRAF.current = null
            const el = daySelectorRef.current
            if (!el) return

            const { scrollLeft, scrollWidth, clientWidth } = el

            // Verifier si aujourd'hui est visible dans le strip
            const todayStr = format(new Date(), 'yyyy-MM-dd')
            const todayBtn = el.querySelector(`[data-date="${todayStr}"]`)
            if (todayBtn) {
                const btnLeft = todayBtn.offsetLeft
                const btnRight = btnLeft + todayBtn.offsetWidth
                const isVisible = btnRight > scrollLeft && btnLeft < scrollLeft + clientWidth
                if (isVisible !== todayVisibleRef.current) {
                    todayVisibleRef.current = isVisible
                    if (todayBtnRef.current) {
                        todayBtnRef.current.disabled = isVisible
                        if (isVisible) {
                            todayBtnRef.current.classList.add(styles.returnTodayDisabled)
                        } else {
                            todayBtnRef.current.classList.remove(styles.returnTodayDisabled)
                        }
                    }
                }
            }

            // Mois visible — manipulation DOM directe, pas de React state
            const centerX = scrollLeft + clientWidth / 2
            // Estimer l'index du bouton central (chaque bouton fait ~78px : 70 + 8 gap)
            const btnStep = 78
            const estimatedIndex = Math.round(centerX / btnStep)
            const buttons = el.children
            const idx = Math.max(0, Math.min(estimatedIndex, buttons.length - 1))
            const btn = buttons[idx]
            if (btn?.dataset?.date) {
                const parts = btn.dataset.date.split('-')
                const d = new Date(+parts[0], +parts[1] - 1, +parts[2])
                const month = format(d, 'MMMM yyyy', { locale: fr })
                if (month !== lastMonthRef.current) {
                    lastMonthRef.current = month
                    if (monthTitleRef.current) {
                        monthTitleRef.current.textContent = month
                    }
                }
            }

            // Extension aux bords
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
                ref={todayBtnRef}
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
                <span className={styles.weekNavTitle} ref={monthTitleRef}>
                    {format(selectedDate, 'MMMM yyyy', { locale: fr })}
                </span>
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
