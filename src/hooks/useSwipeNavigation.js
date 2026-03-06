import { useRef, useState, useEffect, useCallback } from 'react'

const MIN_SWIPE_DISTANCE = 40
const RESISTANCE = 0.4

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, containerRef }) {
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [transitioning, setTransitioning] = useState(false)
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

            setTimeout(() => {
                if (direction > 0) {
                    onSwipeRight?.()
                } else {
                    onSwipeLeft?.()
                }
                setSwipeOffset(0)
                setTransitioning(false)
            }, 150)
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

    return {
        swipeStyle: swipeOffset
            ? {
                  transform: `translateX(${swipeOffset}px)`,
                  transition: isSwiping
                      ? 'none'
                      : 'transform 0.15s ease-out, opacity 0.15s ease-out',
                  opacity: Math.max(0.4, 1 - Math.abs(swipeOffset) / 250),
              }
            : undefined,
    }
}
