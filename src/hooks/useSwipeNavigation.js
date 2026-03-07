import { useRef, useState, useEffect, useCallback } from 'react'

const MIN_SWIPE_DISTANCE = 40
const RESISTANCE = 0.4
const SLIDE_OUT_MS = 150
const SLIDE_IN_MS = 200

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, containerRef }) {
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [transitioning, setTransitioning] = useState(false)
    const [slidePhase, setSlidePhase] = useState(null) // 'out' | 'in' | null
    const touchStart = useRef({ x: 0, y: 0 })
    const swipingRef = useRef(false)
    const directionRef = useRef(null) // 'horizontal' | 'vertical' | null
    const offsetRef = useRef(0)

    const handleTouchStart = useCallback(
        (e) => {
            if (transitioning) return
            touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            }
            swipingRef.current = false
            directionRef.current = null
            offsetRef.current = 0
        },
        [transitioning]
    )

    const handleTouchMove = useCallback(
        (e) => {
            if (transitioning) return
            const dx = e.touches[0].clientX - touchStart.current.x
            const dy = e.touches[0].clientY - touchStart.current.y

            if (!directionRef.current) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
                directionRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
            }

            if (directionRef.current === 'vertical') return

            swipingRef.current = true
            offsetRef.current = dx * RESISTANCE
            setSwipeOffset(offsetRef.current)
        },
        [transitioning]
    )

    const handleTouchEnd = useCallback(() => {
        if (!swipingRef.current || transitioning) {
            setSwipeOffset(0)
            directionRef.current = null
            return
        }

        const currentOffset = offsetRef.current

        if (Math.abs(currentOffset) > MIN_SWIPE_DISTANCE * RESISTANCE) {
            // Animate out
            setTransitioning(true)
            const direction = currentOffset > 0 ? 1 : -1
            const containerWidth = containerRef?.current?.offsetWidth || 300
            setSwipeOffset(direction * containerWidth * 0.5)

            // After slide-out, change day and slide-in from opposite side
            setTimeout(() => {
                if (direction > 0) {
                    onSwipeRight?.()
                } else {
                    onSwipeLeft?.()
                }
                // Position new content off-screen on the opposite side (no transition)
                setSlidePhase('in')
                setSwipeOffset(-direction * containerWidth * 0.3)

                // Next frame: animate slide-in to center
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setSwipeOffset(0)
                        setTimeout(() => {
                            setTransitioning(false)
                            setSlidePhase(null)
                        }, SLIDE_IN_MS)
                    })
                })
            }, SLIDE_OUT_MS)
        } else {
            // Snap back
            setSwipeOffset(0)
        }

        swipingRef.current = false
        directionRef.current = null
    }, [transitioning, onSwipeLeft, onSwipeRight, containerRef])

    useEffect(() => {
        const el = containerRef?.current
        if (!el) return
        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: true })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])

    const isSwiping = swipingRef.current && !transitioning

    const getTransition = () => {
        if (isSwiping) return 'none'
        if (slidePhase === 'in' && swipeOffset !== 0) return 'none'
        if (slidePhase === 'in')
            return `transform ${SLIDE_IN_MS}ms ease-out, opacity ${SLIDE_IN_MS}ms ease-out`
        return `transform ${SLIDE_OUT_MS}ms ease-out, opacity ${SLIDE_OUT_MS}ms ease-out`
    }

    return {
        swipeStyle:
            swipeOffset || slidePhase
                ? {
                      transform: `translateX(${swipeOffset}px)`,
                      transition: getTransition(),
                      opacity:
                          slidePhase === 'in'
                              ? swipeOffset === 0
                                  ? 1
                                  : 0.6
                              : Math.max(0.4, 1 - Math.abs(swipeOffset) / 250),
                  }
                : undefined,
    }
}
