import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
    const slotsSet = useMemo(() => new Set(daysWithSlots), [daysWithSlots])
    const daySelectorRef = useRef(null)
    const monthTitleRef = useRef(null)
    const [dayBuffer, setDayBuffer] = useState(() => generateDays(selectedDate))
    const extendingRef = useRef(false)
    const scrollRAF = useRef(null)
    const lastMonthRef = useRef('')
    const [todayVisible, setTodayVisible] = useState(false)
    const todayVisibleRef = useRef(false)
    const programmaticScrollRef = useRef(false)

    // Quand un jour est cliqué directement dans la barre, on ne veut pas re-scroller
    const skipNextScrollRef = useRef(false)

    // Recentrer le buffer si selectedDate est hors du buffer
    useEffect(() => {
        const isInBuffer = dayBuffer.some((d) => isSameDay(d, selectedDate))
        if (!isInBuffer) {
            setDayBuffer(generateDays(selectedDate))
        }
    }, [selectedDate])

    // Scroll vers le jour sélectionné quand selectedDate change
    useEffect(() => {
        // Si le changement vient d'un clic direct sur un bouton jour, ne pas scroller
        if (skipNextScrollRef.current) {
            skipNextScrollRef.current = false
            return
        }

        const scrollToSelected = () => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const btn = daySelectorRef.current?.querySelector(`[data-date="${dateStr}"]`)
            const container = daySelectorRef.current
            console.log('[DEBUG scroll]', {
                dateStr,
                btnFound: !!btn,
                containerFound: !!container,
                offsetLeft: btn?.offsetLeft,
                containerWidth: container?.offsetWidth,
            })
            if (!btn || !container?.scrollTo) return false
            if (btn.offsetLeft === 0 && container.children[0] !== btn) return false
            if (container.offsetWidth === 0) return false

            const scrollTarget = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2
            console.log('[DEBUG scroll target]', {
                scrollTarget,
                currentScrollLeft: container.scrollLeft,
            })
            programmaticScrollRef.current = true
            container.scrollTo({ left: scrollTarget, behavior: 'instant' })
            requestAnimationFrame(() => {
                console.log('[DEBUG after scroll]', {
                    scrollLeft: container.scrollLeft,
                    scrollTarget,
                })
                programmaticScrollRef.current = false
            })
            return true
        }

        let cancelled = false
        const attemptWithRetries = (retriesLeft) => {
            if (cancelled) return
            if (scrollToSelected()) return
            if (retriesLeft > 0) {
                setTimeout(() => attemptWithRetries(retriesLeft - 1), 50)
            }
        }

        requestAnimationFrame(() => {
            if (cancelled) return
            requestAnimationFrame(() => {
                if (cancelled) return
                attemptWithRetries(5)
            })
        })

        return () => {
            cancelled = true
        }
    }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll initial robuste (montage uniquement)
    const hasInitialScrolled = useRef(false)
    useEffect(() => {
        if (hasInitialScrolled.current) return

        const attemptScroll = (attemptsLeft) => {
            if (hasInitialScrolled.current || attemptsLeft <= 0) return

            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const btn = daySelectorRef.current?.querySelector(`[data-date="${dateStr}"]`)
            const container = daySelectorRef.current

            if (btn && container && (btn.offsetLeft > 0 || container.children[0] === btn)) {
                const scrollTarget =
                    btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2
                container.scrollTo({ left: scrollTarget, behavior: 'instant' })
                hasInitialScrolled.current = true

                // Mettre à jour todayVisible après le scroll initial
                setTimeout(() => {
                    const todayStr = format(new Date(), 'yyyy-MM-dd')
                    const todayBtn = container.querySelector(`[data-date="${todayStr}"]`)
                    if (todayBtn) {
                        const btnLeft = todayBtn.offsetLeft
                        const btnRight = btnLeft + todayBtn.offsetWidth
                        const isVisible =
                            btnRight > container.scrollLeft &&
                            btnLeft < container.scrollLeft + container.clientWidth
                        todayVisibleRef.current = isVisible
                        setTodayVisible(isVisible)
                    }
                }, 50)
            } else {
                setTimeout(() => attemptScroll(attemptsLeft - 1), 50)
            }
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                attemptScroll(5)
            })
        })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

            // Vérifier si aujourd'hui est visible dans le strip
            const todayStr = format(new Date(), 'yyyy-MM-dd')
            const todayBtn = el.querySelector(`[data-date="${todayStr}"]`)
            if (todayBtn) {
                const btnLeft = todayBtn.offsetLeft
                const btnRight = btnLeft + todayBtn.offsetWidth
                const isVisible = btnRight > scrollLeft && btnLeft < scrollLeft + clientWidth
                if (isVisible !== todayVisibleRef.current) {
                    todayVisibleRef.current = isVisible
                    setTodayVisible(isVisible)
                }
            }

            // Mois visible — manipulation DOM directe, pas de React state
            const centerX = scrollLeft + clientWidth / 2
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

            // Extension aux bords (pas pendant un scroll programmatique)
            if (extendingRef.current || programmaticScrollRef.current) return

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

    // Clic sur un bouton jour : sélectionner sans scroller
    const handleDayClick = useCallback(
        (day) => {
            skipNextScrollRef.current = true
            onSelectDate(day)
        },
        [onSelectDate]
    )

    return (
        <>
            <button
                onClick={onGoToToday}
                disabled={isToday && todayVisible}
                className={clsx(
                    styles.returnToday,
                    isToday && todayVisible && styles.returnTodayDisabled
                )}
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
                    const hasSlots = slotsSet.has(dayStr)

                    return (
                        <button
                            key={dayStr}
                            data-date={dayStr}
                            onClick={() => handleDayClick(day)}
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

            {!isWeekConfigured && !isCurrentWeek && (
                <div className={clsx('alert--warning', styles.warningContent)}>
                    <Info size={18} />
                    <span className={styles.warningText}>
                        Cette semaine n'est pas encore configurée. Les réservations ne sont pas
                        ouvertes.
                    </span>
                </div>
            )}
        </>
    )
}
