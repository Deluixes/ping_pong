import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

const BTN_WIDTH = 70
const BTN_GAP = 8
const BTN_STEP = BTN_WIDTH + BTN_GAP
const EXTRA_EACH_SIDE = 6
const FRICTION = 0.94
const MIN_VELOCITY = 0.3

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
    const containerRef = useRef(null)
    const trackRef = useRef(null)
    const [dayOffset, setDayOffset] = useState(0)
    const dayOffsetRef = useRef(0)

    const touchStartRef = useRef(null)
    const lastTouchRef = useRef(null)
    const velocityRef = useRef(0)
    const inertiaRef = useRef(null)
    const isDraggingRef = useRef(false)
    const directionRef = useRef(null)
    const accumulatedPxRef = useRef(0)

    // Nombre de boutons visibles
    const containerWidth = containerRef.current?.clientWidth || 350
    const visibleCount = Math.ceil(containerWidth / BTN_STEP) + 1
    const totalRendered = visibleCount + EXTRA_EACH_SIDE * 2
    const halfRendered = Math.floor(totalRendered / 2)

    // Jour central et mois visible
    const centerDay = addDays(selectedDate, dayOffset)
    const visibleMonth = format(centerDay, 'MMMM yyyy', { locale: fr })

    // Generer les jours
    const days = []
    for (let i = -halfRendered; i <= halfRendered; i++) {
        days.push(addDays(centerDay, i))
    }

    // Position de base du track (sans drag)
    const baseOffset = containerWidth / 2 - BTN_WIDTH / 2 - halfRendered * BTN_STEP

    // Appliquer le transform directement sur le DOM (pas de React state)
    const applyTransform = useCallback(
        (px) => {
            if (trackRef.current) {
                trackRef.current.style.transform = `translateX(${baseOffset + px}px)`
            }
        },
        [baseOffset]
    )

    // Recentrer quand selectedDate change
    useEffect(() => {
        dayOffsetRef.current = 0
        accumulatedPxRef.current = 0
        setDayOffset(0)
        if (inertiaRef.current) {
            cancelAnimationFrame(inertiaRef.current)
            inertiaRef.current = null
        }
    }, [selectedDate])

    // Commit : convertir les pixels accumules en jours (re-render React)
    const commitDayShift = useCallback(() => {
        const px = accumulatedPxRef.current
        const shift = Math.round(px / BTN_STEP)
        if (shift !== 0) {
            dayOffsetRef.current -= shift
            accumulatedPxRef.current = px - shift * BTN_STEP
            setDayOffset(dayOffsetRef.current)
        }
    }, [])

    const startInertia = useCallback(() => {
        const tick = () => {
            velocityRef.current *= FRICTION
            if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
                velocityRef.current = 0
                // Snap final
                const px = accumulatedPxRef.current
                const shift = Math.round(px / BTN_STEP)
                dayOffsetRef.current -= shift
                accumulatedPxRef.current = 0
                setDayOffset(dayOffsetRef.current)
                applyTransform(0)
                inertiaRef.current = null
                return
            }

            accumulatedPxRef.current += velocityRef.current
            applyTransform(accumulatedPxRef.current)

            // Commit quand on depasse un BTN_STEP
            const shift = Math.round(accumulatedPxRef.current / BTN_STEP)
            if (Math.abs(shift) >= 1) {
                dayOffsetRef.current -= shift
                accumulatedPxRef.current -= shift * BTN_STEP
                setDayOffset(dayOffsetRef.current)
                applyTransform(accumulatedPxRef.current)
            }

            inertiaRef.current = requestAnimationFrame(tick)
        }
        inertiaRef.current = requestAnimationFrame(tick)
    }, [applyTransform])

    const handleTouchStart = useCallback((e) => {
        e.stopPropagation()
        if (inertiaRef.current) {
            cancelAnimationFrame(inertiaRef.current)
            inertiaRef.current = null
        }
        velocityRef.current = 0
        isDraggingRef.current = false
        directionRef.current = null
        accumulatedPxRef.current = 0
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        }
        lastTouchRef.current = {
            x: e.touches[0].clientX,
            time: Date.now(),
        }
    }, [])

    const handleTouchMove = useCallback(
        (e) => {
            e.stopPropagation()
            if (!touchStartRef.current) return
            const dx = e.touches[0].clientX - touchStartRef.current.x
            const dy = e.touches[0].clientY - touchStartRef.current.y

            if (!directionRef.current) {
                if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
                directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
            }

            if (directionRef.current === 'vertical') return
            e.preventDefault()

            isDraggingRef.current = true

            // Calculer la velocite
            const now = Date.now()
            const last = lastTouchRef.current
            if (last && now - last.time > 0) {
                velocityRef.current = ((e.touches[0].clientX - last.x) / (now - last.time)) * 16
            }
            lastTouchRef.current = { x: e.touches[0].clientX, time: now }

            // Mettre a jour le pixel offset - DOM direct, pas de React state
            accumulatedPxRef.current = dx
            applyTransform(accumulatedPxRef.current)

            // Commit si on depasse un BTN_STEP (pour mettre a jour le mois + les jours rendus)
            const shift = Math.round(accumulatedPxRef.current / BTN_STEP)
            if (Math.abs(shift) >= 1) {
                dayOffsetRef.current -= shift
                accumulatedPxRef.current -= shift * BTN_STEP
                setDayOffset(dayOffsetRef.current)
                // Re-ajuster le touchStart pour le prochain delta
                touchStartRef.current.x = e.touches[0].clientX - accumulatedPxRef.current
            }
        },
        [applyTransform]
    )

    const handleTouchEnd = useCallback(
        (e) => {
            e.stopPropagation()
            if (!isDraggingRef.current) {
                touchStartRef.current = null
                return
            }

            isDraggingRef.current = false
            touchStartRef.current = null

            if (Math.abs(velocityRef.current) > 2) {
                startInertia()
            } else {
                // Snap final
                const shift = Math.round(accumulatedPxRef.current / BTN_STEP)
                dayOffsetRef.current -= shift
                accumulatedPxRef.current = 0
                setDayOffset(dayOffsetRef.current)
                applyTransform(0)
            }
        },
        [startInertia, applyTransform]
    )

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd])

    useEffect(() => {
        return () => {
            if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current)
        }
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

            <div className={styles.daySelector} ref={containerRef}>
                <div
                    ref={trackRef}
                    className={styles.daySelectorTrack}
                    style={{ transform: `translateX(${baseOffset}px)` }}
                >
                    {days.map((day) => {
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
