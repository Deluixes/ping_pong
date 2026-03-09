import { useRef, useEffect, useState, useCallback } from 'react'

const THRESHOLD = 60

export function usePullToRefresh(onRefresh, { disabled = false } = {}) {
    const [pulling, setPulling] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const startY = useRef(0)
    const startX = useRef(0)
    const directionRef = useRef(null)
    const containerRef = useRef(null)

    const handleTouchStart = useCallback(
        (e) => {
            if (disabled) return
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY
                startX.current = e.touches[0].clientX
                directionRef.current = null
                setPulling(true)
            }
        },
        [disabled]
    )

    const handleTouchMove = useCallback(
        (e) => {
            if (!pulling || directionRef.current === 'horizontal') return
            const dx = e.touches[0].clientX - startX.current
            const dy = e.touches[0].clientY - startY.current

            if (!directionRef.current) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
                directionRef.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal'
                if (directionRef.current === 'horizontal') return
            }

            if (dy > 0) {
                setPullDistance(Math.min(dy * 0.5, 80))
            }
        },
        [pulling]
    )

    const handleTouchEnd = useCallback(async () => {
        directionRef.current = null
        if (pullDistance > THRESHOLD && !refreshing) {
            setRefreshing(true)
            setPullDistance(40)
            try {
                await onRefresh()
            } finally {
                setRefreshing(false)
            }
        }
        setPulling(false)
        setPullDistance(0)
    }, [pullDistance, refreshing, onRefresh])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: true })
        el.addEventListener('touchend', handleTouchEnd)
        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd])

    return { containerRef, pullDistance, refreshing }
}
