import { useRef, useEffect, useState, useCallback } from 'react'

const THRESHOLD = 60

export function usePullToRefresh(onRefresh) {
    const [pulling, setPulling] = useState(false)
    const [pullDistance, setPullDistance] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const startY = useRef(0)
    const containerRef = useRef(null)

    const handleTouchStart = useCallback((e) => {
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY
            setPulling(true)
        }
    }, [])

    const handleTouchMove = useCallback(
        (e) => {
            if (!pulling) return
            const diff = e.touches[0].clientY - startY.current
            if (diff > 0) {
                setPullDistance(Math.min(diff * 0.5, 80))
            }
        },
        [pulling]
    )

    const handleTouchEnd = useCallback(async () => {
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
