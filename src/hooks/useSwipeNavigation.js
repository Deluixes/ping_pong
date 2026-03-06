import { useRef, useEffect, useCallback } from 'react'

const MIN_SWIPE_DISTANCE = 50
const MAX_SWIPE_TIME = 300

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, containerRef }) {
    const touchStart = useRef({ x: 0, y: 0, time: 0 })

    const handleTouchStart = useCallback((e) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now(),
        }
    }, [])

    const handleTouchEnd = useCallback(
        (e) => {
            const dx = e.changedTouches[0].clientX - touchStart.current.x
            const dy = e.changedTouches[0].clientY - touchStart.current.y
            const dt = Date.now() - touchStart.current.time

            // Must be fast, horizontal, and not too vertical
            if (dt > MAX_SWIPE_TIME) return
            if (Math.abs(dx) < MIN_SWIPE_DISTANCE) return
            if (Math.abs(dy) > Math.abs(dx) * 0.7) return

            if (dx > 0) {
                onSwipeRight?.()
            } else {
                onSwipeLeft?.()
            }
        },
        [onSwipeLeft, onSwipeRight]
    )

    useEffect(() => {
        const el = containerRef?.current
        if (!el) return
        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchend', handleTouchEnd, { passive: true })
        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [containerRef, handleTouchStart, handleTouchEnd])
}
