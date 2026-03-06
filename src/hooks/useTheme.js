import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'pingpong_theme'

function getSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved) {
    document.documentElement.setAttribute('data-theme', resolved)
}

export function useTheme() {
    const [preference, setPreference] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || 'auto'
    })

    const resolved = preference === 'auto' ? getSystemTheme() : preference

    useEffect(() => {
        applyTheme(resolved)
    }, [resolved])

    // Listen for system theme changes when in auto mode
    useEffect(() => {
        if (preference !== 'auto' || !window.matchMedia) return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = () => applyTheme(getSystemTheme())
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [preference])

    const setTheme = useCallback((value) => {
        setPreference(value)
        localStorage.setItem(STORAGE_KEY, value)
    }, [])

    return { preference, resolved, setTheme }
}
