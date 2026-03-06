import { useState, useEffect } from 'react'
import { Calendar, UserPlus, Bell, Smartphone } from 'lucide-react'
import styles from './WelcomeGuide.module.css'

const STEPS = [
    {
        icon: Calendar,
        title: 'Consultez le planning',
        description:
            "Parcourez les jours de la semaine pour voir les creneaux disponibles. Les creneaux verts sont ouverts a l'inscription.",
    },
    {
        icon: UserPlus,
        title: 'Inscrivez-vous en un tap',
        description:
            'Appuyez sur le bouton "+" pour vous inscrire a un creneau. Choisissez votre duree et invitez d\'autres membres.',
    },
    {
        icon: Bell,
        title: 'Recevez des notifications',
        description:
            "Activez les notifications dans les parametres pour etre prevenu quand un joueur s'inscrit sur vos creneaux.",
    },
    {
        icon: Smartphone,
        title: 'Naviguez facilement',
        description:
            'Swipez gauche/droite pour changer de jour. Tirez vers le bas pour rafraichir. Utilisez la barre en bas pour naviguer.',
    },
]

const STORAGE_KEY = 'pingpong_onboarding_done'

export default function WelcomeGuide() {
    const [visible, setVisible] = useState(false)
    const [step, setStep] = useState(0)

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

    if (!visible) return null

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
                <p className={styles.description}>{current.description}</p>

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
