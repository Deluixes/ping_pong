import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { notificationService } from '../services/notifications'
import styles from './NotificationPrompt.module.css'

const SESSION_KEY = 'pingpong_notif_prompt_shown'
const ONBOARDING_KEY = 'pingpong_onboarding_done'

export default function NotificationPrompt() {
    const { user, memberStatus } = useAuth()
    const { addToast } = useToast()
    const [visible, setVisible] = useState(false)
    const [variant, setVariant] = useState(null) // 'first-time' | 'reactivate'
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!user?.id || memberStatus !== 'approved') return
        if (sessionStorage.getItem(SESSION_KEY)) return
        if (!localStorage.getItem(ONBOARDING_KEY)) return
        if (!notificationService.isSupported()) return

        const browserPermission = notificationService.getPermissionStatus()
        if (browserPermission === 'denied') return

        let timeoutId

        notificationService.getPreferences(user.id).then(async (prefs) => {
            if (prefs.enabled && browserPermission !== 'granted') {
                // Mismatch: DB says enabled but browser subscription is gone — reset DB silently
                await notificationService.updatePreferences(user.id, { enabled: false })
                timeoutId = setTimeout(() => {
                    setVariant('reactivate')
                    setVisible(true)
                }, 1500)
            } else if (!prefs.enabled && browserPermission !== 'denied') {
                timeoutId = setTimeout(() => {
                    setVariant('first-time')
                    setVisible(true)
                }, 1500)
            }
        })

        return () => clearTimeout(timeoutId)
    }, [user?.id, memberStatus])

    const handleDismiss = () => {
        sessionStorage.setItem(SESSION_KEY, '1')
        setVisible(false)
    }

    const handleActivate = async () => {
        if (!user?.id) return
        setLoading(true)
        try {
            const result = await notificationService.enableNotifications(user.id)
            if (result.success) {
                addToast('Notifications activées !', 'success')
                sessionStorage.setItem(SESSION_KEY, '1')
                setVisible(false)
            } else {
                addToast(result.error || "Impossible d'activer les notifications", 'error')
                handleDismiss()
            }
        } catch {
            addToast("Erreur lors de l'activation.", 'error')
            handleDismiss()
        } finally {
            setLoading(false)
        }
    }

    if (!visible) return null

    const isReactivate = variant === 'reactivate'

    return (
        <div className="modal-overlay modal-overlay--dark" onClick={handleDismiss}>
            <div className={`modal-dialog ${styles.dialog}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.iconCircle}>
                    <Bell size={28} />
                </div>
                <h3 className={styles.title}>
                    {isReactivate ? 'Réactiver les notifications' : 'Activer les notifications'}
                </h3>
                <p className={styles.message}>
                    {isReactivate
                        ? 'Vos notifications semblent désactivées. Réactivez-les pour recevoir les invitations et les nouveaux créneaux.'
                        : 'Pensez à activer les notifications pour être informés des invitations à jouer et des nouveaux créneaux de jeu.'}
                </p>
                <button
                    onClick={handleActivate}
                    disabled={loading}
                    className="btn btn-primary btn-full"
                >
                    {loading ? 'Activation...' : 'Activer les notifications'}
                </button>
                <button onClick={handleDismiss} className={styles.laterBtn}>
                    Plus tard
                </button>
            </div>
        </div>
    )
}
