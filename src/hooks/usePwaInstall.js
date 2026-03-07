import { useState, useEffect, useCallback } from 'react'

export function usePwaInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)

    const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true

    useEffect(() => {
        if (isStandalone) return

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }

        const installedHandler = () => {
            setDeferredPrompt(null)
        }

        window.addEventListener('beforeinstallprompt', handler)
        window.addEventListener('appinstalled', installedHandler)

        return () => {
            window.removeEventListener('beforeinstallprompt', handler)
            window.removeEventListener('appinstalled', installedHandler)
        }
    }, [isStandalone])

    const promptInstall = useCallback(async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    }, [deferredPrompt])

    return {
        canInstall: !isStandalone && deferredPrompt !== null,
        promptInstall,
    }
}
