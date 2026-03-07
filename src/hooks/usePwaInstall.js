import { useState, useEffect, useCallback } from 'react'

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [dismissed, setDismissed] = useState(false)

    const [isStandalone] = useState(
        () =>
            (typeof window.matchMedia === 'function' &&
                window.matchMedia('(display-mode: standalone)').matches) ||
            window.navigator.standalone === true
    )

    useEffect(() => {
        if (isStandalone) return

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        const installedHandler = () => {
            setDeferredPrompt(null)
            setDismissed(true)
        }

        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('appinstalled', installedHandler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('appinstalled', installedHandler)
        }
    }, [isStandalone])

    const promptInstall = useCallback(async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setDeferredPrompt(null)
                setDismissed(true)
            }
            return true
        }
        return false
    }, [deferredPrompt])

    return {
        canInstall: !isStandalone && !dismissed,
        hasNativePrompt: deferredPrompt !== null,
        promptInstall,
    }
}
