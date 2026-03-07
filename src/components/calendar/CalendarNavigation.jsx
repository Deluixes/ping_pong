import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { format, isSameDay, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './CalendarNavigation.module.css'

// Largeur d'un bouton jour + gap
const BTN_WIDTH = 70
const BTN_GAP = 8
const BTN_STEP = BTN_WIDTH + BTN_GAP
const EXTRA_EACH_SIDE = 3
const FRICTION = 0.95
const MIN_VELOCITY = 0.5

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

    // dayOffset: nombre de jours de decalage par rapport a selectedDate
    // 0 = selectedDate est centre, -1 = on a scroll d'un jour vers la droite, etc.
    const [dayOffset, setDayOffset] = useState(0)
    const [dragPx, setDragPx] = useState(0)

    const touchStartRef = useRef(null)
    const lastTouchRef = useRef(null)
    const velocityRef = useRef(0)
    const inertiaRef = useRef(null)
    const isDraggingRef = useRef(false)
    const directionRef = useRef(null) // 'horizontal' | 'vertical' | null
    const accumulatedRef = useRef(0)

    // Nombre de boutons visibles
    const getVisibleCount = useCallback(() => {
        const w = containerRef.current?.clientWidth || 350
        return Math.ceil(w / BTN_STEP) + 1
    }, [])

    // Jour central affiche
    const centerDay = addDays(selectedDate, dayOffset)
    const visibleMonth = format(centerDay, 'MMMM yyyy', { locale: fr })

    // Generer les jours a rendre
    const visibleCount = getVisibleCount()
    const totalRendered = visibleCount + EXTRA_EACH_SIDE * 2
    const halfRendered = Math.floor(totalRendered / 2)
    const days = []
    for (let i = -halfRendered; i <= halfRendered; i++) {
        days.push(addDays(centerDay, i))
    }

    // Position X du track : centrer le jour central + dragPx
    const centerOffset = (() => {
        const containerWidth = containerRef.current?.clientWidth || 350
        return containerWidth / 2 - BTN_WIDTH / 2 - halfRendered * BTN_STEP
    })()

    // Recentrer quand selectedDate change (via swipe ou clic externe)
    useEffect(() => {
        setDayOffset(0)
        setDragPx(0)
        accumulatedRef.current = 0
        if (inertiaRef.current) {
            cancelAnimationFrame(inertiaRef.current)
            inertiaRef.current = null
        }
    }, [selectedDate])

    const commitDrag = useCallback(() => {
        // Convertir les pixels accumules en jours
        const accumulated = accumulatedRef.current
        const dayShift = Math.round(accumulated / BTN_STEP)
        if (dayShift !== 0) {
            setDayOffset((prev) => prev - dayShift)
            accumulatedRef.current = accumulated - dayShift * BTN_STEP
            setDragPx(accumulatedRef.current)
        }
    }, [])

    const startInertia = useCallback(() => {
        const tick = () => {
            velocityRef.current *= FRICTION
            if (Math.abs(velocityRef.current) < MIN_VELOCITY) {
                velocityRef.current = 0
                // Snap au jour le plus proche
                const remainder = accumulatedRef.current % BTN_STEP
                const snapTarget =
                    Math.abs(remainder) > BTN_STEP / 2
                        ? accumulatedRef.current +
                          (remainder > 0 ? BTN_STEP - remainder : -BTN_STEP - remainder)
                        : accumulatedRef.current - remainder
                const dayShift = Math.round(snapTarget / BTN_STEP)
                setDayOffset((prev) => prev - dayShift)
                accumulatedRef.current = 0
                setDragPx(0)
                inertiaRef.current = null
                return
            }
            accumulatedRef.current += velocityRef.current
            setDragPx(accumulatedRef.current)

            // Commit des jours pendant l'inertie pour le mois visible
            const dayShift = Math.round(accumulatedRef.current / BTN_STEP)
            if (dayShift !== 0) {
                setDayOffset((prev) => prev - dayShift)
                accumulatedRef.current -= dayShift * BTN_STEP
                setDragPx(accumulatedRef.current)
            }

            inertiaRef.current = requestAnimationFrame(tick)
        }
        inertiaRef.current = requestAnimationFrame(tick)
    }, [])

    const handleTouchStart = useCallback((e) => {
        // Empecher le swipe de jour de capturer les touch events du day selector
        e.stopPropagation()
        // Arreter l'inertie
        if (inertiaRef.current) {
            cancelAnimationFrame(inertiaRef.current)
            inertiaRef.current = null
        }
        velocityRef.current = 0
        isDraggingRef.current = false
        directionRef.current = null
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now(),
        }
        lastTouchRef.current = {
            x: e.touches[0].clientX,
            time: Date.now(),
        }
    }, [])

    const handleTouchMove = useCallback((e) => {
        e.stopPropagation()
        if (!touchStartRef.current) return
        const dx = e.touches[0].clientX - touchStartRef.current.x
        const dy = e.touches[0].clientY - touchStartRef.current.y

        if (!directionRef.current) {
            if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
            directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
        }

        if (directionRef.current === 'vertical') return

        // Empecher le scroll vertical pendant le drag horizontal
        e.preventDefault()

        isDraggingRef.current = true
        const now = Date.now()
        const last = lastTouchRef.current
        if (last && now - last.time > 0) {
            velocityRef.current = ((e.touches[0].clientX - last.x) / (now - last.time)) * 16
        }
        lastTouchRef.current = { x: e.touches[0].clientX, time: now }

        accumulatedRef.current = dx
        setDragPx(dx)

        // Commit des jours pendant le drag pour le mois visible
        const dayShift = Math.round(accumulatedRef.current / BTN_STEP)
        if (dayShift !== 0) {
            setDayOffset((prev) => prev - dayShift)
            accumulatedRef.current -= dayShift * BTN_STEP
            setDragPx(accumulatedRef.current)
            touchStartRef.current.x = e.touches[0].clientX - accumulatedRef.current
        }
    }, [])

    const handleTouchEnd = useCallback(
        (e) => {
            e.stopPropagation()
            if (!isDraggingRef.current) {
                // C'etait un tap, pas un drag
                touchStartRef.current = null
                return
            }

            isDraggingRef.current = false
            touchStartRef.current = null

            if (Math.abs(velocityRef.current) > 2) {
                startInertia()
            } else {
                // Snap au jour le plus proche
                const remainder = accumulatedRef.current % BTN_STEP
                const snapDayShift = Math.round(accumulatedRef.current / BTN_STEP)
                setDayOffset((prev) => prev - snapDayShift)
                accumulatedRef.current = 0
                setDragPx(0)
            }
        },
        [startInertia]
    )

    // Attacher les events touch (non-passive pour pouvoir preventDefault)
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

    // Cleanup inertia on unmount
    useEffect(() => {
        return () => {
            if (inertiaRef.current) cancelAnimationFrame(inertiaRef.current)
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
                <span className={styles.weekNavTitle}>{visibleMonth}</span>
                <button onClick={onNextWeek} className={clsx('btn', styles.weekNavBtn)}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector - Touch-based infinite scroll */}
            <div className={styles.daySelector} ref={containerRef}>
                <div
                    ref={trackRef}
                    className={styles.daySelectorTrack}
                    style={{
                        transform: `translateX(${centerOffset + dragPx}px)`,
                    }}
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
