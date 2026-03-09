import { useRef, useState, useEffect, useCallback } from 'react'

const MIN_SWIPE_DISTANCE = 40
const RESISTANCE = 0.4
const ANIMATION_DURATION = 350

export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, containerRef, targetRef }) {
    const [swipeOffset, setSwipeOffset] = useState(0)
    const [transitioning, setTransitioning] = useState(false)
    const touchStart = useRef({ x: 0, y: 0 })
    const swipingRef = useRef(false)
    const directionRef = useRef(null)
    const offsetRef = useRef(0)
    const inScrollableRef = useRef(false)
    const animationRef = useRef(null)

    const cancelAnimation = useCallback(() => {
        if (animationRef.current) {
            animationRef.current.cancel()
            animationRef.current = null
        }
    }, [])

    const handleTouchStart = useCallback(
        (e) => {
            if (transitioning) return

            let el = e.target
            const container = containerRef?.current
            inScrollableRef.current = false
            while (el && el !== container) {
                if (el.scrollWidth > el.clientWidth) {
                    const style = window.getComputedStyle(el)
                    const overflowX = style.overflowX
                    if (overflowX === 'auto' || overflowX === 'scroll') {
                        inScrollableRef.current = true
                        break
                    }
                }
                el = el.parentElement
            }

            touchStart.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            }
            swipingRef.current = false
            directionRef.current = null
            offsetRef.current = 0
        },
        [transitioning, containerRef]
    )

    const handleTouchMove = useCallback(
        (e) => {
            if (transitioning || inScrollableRef.current) return
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
        const target = targetRef?.current

        if (Math.abs(currentOffset) > MIN_SWIPE_DISTANCE * RESISTANCE && target) {
            setTransitioning(true)
            const direction = currentOffset > 0 ? 1 : -1
            const containerWidth = containerRef?.current?.offsetWidth || 300

            // Changer le jour immediatement
            if (direction > 0) {
                onSwipeRight?.()
            } else {
                onSwipeLeft?.()
            }

            // Reset l'offset React (l'animation WAAPI prend le relais)
            setSwipeOffset(0)

            cancelAnimation()

            // Animation continue via Web Animations API
            const anim = target.animate(
                [
                    {
                        transform: `translateX(${currentOffset}px)`,
                        opacity: 0.85,
                    },
                    {
                        transform: `translateX(${direction * containerWidth * 0.4}px)`,
                        opacity: 0.4,
                        offset: 0.35,
                    },
                    {
                        transform: `translateX(${-direction * containerWidth * 0.12}px)`,
                        opacity: 0.4,
                        offset: 0.42,
                    },
                    {
                        transform: 'translateX(0px)',
                        opacity: 1,
                    },
                ],
                {
                    duration: ANIMATION_DURATION,
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                    fill: 'none',
                }
            )

            animationRef.current = anim

            anim.finished
                .then(() => {
                    setTransitioning(false)
                    animationRef.current = null
                })
                .catch(() => {
                    // Animation cancelled
                    setTransitioning(false)
                    animationRef.current = null
                })
        } else if (target) {
            // Snap-back smooth via WAAPI
            const anim = target.animate(
                [{ transform: `translateX(${currentOffset}px)` }, { transform: 'translateX(0px)' }],
                {
                    duration: 200,
                    easing: 'ease-out',
                    fill: 'none',
                }
            )
            anim.finished.then(() => setSwipeOffset(0)).catch(() => setSwipeOffset(0))
            setSwipeOffset(0)
        } else {
            setSwipeOffset(0)
        }

        swipingRef.current = false
        directionRef.current = null
    }, [transitioning, onSwipeLeft, onSwipeRight, containerRef, targetRef, cancelAnimation])

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
            cancelAnimation()
        }
    }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd, cancelAnimation])

    const isSwiping = swipingRef.current && !transitioning

    return {
        swipeStyle:
            isSwiping && swipeOffset
                ? {
                      transform: `translateX(${swipeOffset}px)`,
                      willChange: 'transform',
                      opacity: Math.max(0.5, 1 - Math.abs(swipeOffset) / 200),
                  }
                : undefined,
        isTransitioning: transitioning,
    }
}
