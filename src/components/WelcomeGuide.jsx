import { useState, useEffect } from 'react'
import { Calendar, UserPlus, Bell, Smartphone, Mail, Navigation } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { notificationService } from '../services/notifications'
import styles from './WelcomeGuide.module.css'

const STORAGE_KEY = 'pingpong_onboarding_done'

export default function WelcomeGuide() {
    const { user } = useAuth()
    const { canInstall, hasNativePrompt, promptInstall } = usePwaInstall()
    const [visible, setVisible] = useState(false)
    const [step, setStep] = useState(0)
    const [notifActivated, setNotifActivated] = useState(false)
    const [notifLoading, setNotifLoading] = useState(false)
    const [installDone, setInstallDone] = useState(false)

    useEffect(() => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            setVisible(true)
        }
    }, [])

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1)
        } else {
            handleClose()
        }
    }

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, '1')
        setVisible(false)
    }

    const handleActivateNotifs = async () => {
        if (!user?.id) return
        setNotifLoading(true)
        try {
            const result = await notificationService.enableNotifications(user.id)
            if (result.success) {
                setNotifActivated(true)
            }
        } catch {
            // Silently fail — user can activate later in settings
        } finally {
            setNotifLoading(false)
        }
    }

    const handleInstallApp = async () => {
        const installed = await promptInstall()
        if (installed) {
            setInstallDone(true)
        }
    }

    if (!visible) return null

    const STEPS = [
        {
            icon: Calendar,
            title: 'Consultez le planning',
            description:
                "Parcourez les jours de la semaine pour voir les créneaux disponibles. Les créneaux verts sont ouverts à l'inscription.",
        },
        {
            icon: UserPlus,
            title: 'Inscrivez-vous en un tap',
            description:
                'Appuyez sur le bouton "+" pour vous inscrire à un créneau. Choisissez votre durée et invitez d\'autres membres.',
        },
        {
            icon: Mail,
            title: 'Gérez vos invitations',
            description:
                "Depuis l'onglet Invitations, acceptez ou déclinez les propositions des autres membres du club.",
        },
        {
            icon: Bell,
            title: 'Activez les notifications',
            description:
                "Soyez prévenu quand un joueur s'inscrit sur vos créneaux ou vous envoie une invitation.",
            action: notifActivated ? (
                <div className={styles.actionDone}>✓ Notifications activées</div>
            ) : (
                <button
                    onClick={handleActivateNotifs}
                    disabled={notifLoading}
                    className="btn btn-primary btn-full"
                >
                    {notifLoading ? 'Activation...' : 'Activer les notifications'}
                </button>
            ),
        },
        {
            icon: Smartphone,
            title: "Installez l'application",
            description:
                "Ajoutez l'app à votre écran d'accueil pour y accéder comme une vraie application mobile.",
            action: installDone ? (
                <div className={styles.actionDone}>✓ Application installée</div>
            ) : canInstall && hasNativePrompt ? (
                <button onClick={handleInstallApp} className="btn btn-secondary btn-full">
                    Installer l'app
                </button>
            ) : canInstall ? (
                <p className={styles.altText}>
                    Utilisez le menu de votre navigateur → "Ajouter à l'écran d'accueil"
                </p>
            ) : (
                <div className={styles.actionDone}>✓ Vous utilisez déjà l'app installée</div>
            ),
        },
        {
            icon: Navigation,
            title: 'Naviguez facilement',
            description:
                'Swipez gauche/droite pour changer de jour. Tirez vers le bas pour rafraîchir. Utilisez la barre en bas pour naviguer.',
        },
    ]

    const current = STEPS[step]
    const Icon = current.icon
    const isLast = step === STEPS.length - 1

    return (
        <div className="modal-overlay modal-overlay--dark" onClick={handleClose}>
            <div className={`modal-dialog ${styles.dialog}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.iconCircle}>
                    <Icon size={32} />
                </div>
                <h3 className={styles.title}>{current.title}</h3>
                <p
                    className={styles.description}
                    style={!current.action ? { marginBottom: '1.5rem' } : undefined}
                >
                    {current.description}
                </p>

                {current.action && <div className={styles.actionArea}>{current.action}</div>}

                <div className={styles.dots}>
                    {STEPS.map((_, i) => (
                        <span
                            key={i}
                            className={`${styles.dot} ${i === step ? styles.dotActive : ''}`}
                        />
                    ))}
                </div>

                <div className={styles.actions}>
                    <button onClick={handleClose} className={styles.skipBtn}>
                        Passer
                    </button>
                    <button onClick={handleNext} className="btn btn-primary">
                        {isLast ? "C'est parti !" : 'Suivant'}
                    </button>
                </div>
            </div>
        </div>
    )
}
