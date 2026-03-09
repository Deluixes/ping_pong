import { useRef, useState, useCallback } from 'react'

const THRESHOLD = 80
const RESISTANCE = 0.6

export function useSwipeAction({ onSwipeLeft, onSwipeRight }) {
    const [offset, setOffset] = useState(0)
    const touchStart = useRef({ x: 0, y: 0 })
    const swiping = useRef(false)
    const direction = useRef(null)
    const currentOffset = useRef(0)
    const elementRef = useRef(null)

    const handleTouchStart = useCallback((e) => {
        touchStart.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
        }
        swiping.current = false
        direction.current = null
        currentOffset.current = 0
    }, [])

    const handleTouchMove = useCallback((e) => {
        const dx = e.touches[0].clientX - touchStart.current.x
        const dy = e.touches[0].clientY - touchStart.current.y

        if (!direction.current) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
            direction.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
        }

        if (direction.current === 'vertical') return

        swiping.current = true
        currentOffset.current = dx * RESISTANCE
        setOffset(currentOffset.current)
    }, [])

    const handleTouchEnd = useCallback(() => {
        if (!swiping.current) {
            setOffset(0)
            direction.current = null
            return
        }

        const finalOffset = currentOffset.current

        if (Math.abs(finalOffset) > THRESHOLD) {
            if (finalOffset > 0) {
                onSwipeRight?.()
            } else {
                onSwipeLeft?.()
            }
        }

        // Snap back
        if (elementRef.current) {
            const el = elementRef.current
            el.style.transition = 'transform 0.25s ease-out'
            el.style.transform = 'translateX(0px)'
            const cleanup = () => {
                el.style.transition = ''
                el.style.transform = ''
            }
            el.addEventListener('transitionend', cleanup, { once: true })
        }

        setOffset(0)
        currentOffset.current = 0
        swiping.current = false
        direction.current = null
    }, [onSwipeLeft, onSwipeRight])

    const swipeHandlers = {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
    }

    const swipeStyle =
        swiping.current && offset
            ? { transform: `translateX(${offset}px)`, willChange: 'transform' }
            : undefined

    return {
        elementRef,
        swipeHandlers,
        swipeStyle,
        offset,
    }
}
