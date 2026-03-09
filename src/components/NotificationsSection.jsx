import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { notificationService } from '../services/notifications'
import { Bell, BellOff, Smartphone } from 'lucide-react'
import clsx from 'clsx'
import styles from './NotificationsSection.module.css'

export default function NotificationsSection() {
    const { user } = useAuth()
    const { addToast } = useToast()
    const [notifSupported, setNotifSupported] = useState(false)
    const [notifEnabled, setNotifEnabled] = useState(false)
    const [notifPrefs, setNotifPrefs] = useState({
        invitations_enabled: true,
        slot_openings_enabled: true,
        registrations_enabled: true,
    })
    const [notifLoading, setNotifLoading] = useState(false)
    const [notifPermission, setNotifPermission] = useState('default')

    useEffect(() => {
        const loadNotificationSettings = async () => {
            const supported = notificationService.isSupported()
            setNotifSupported(supported)
            setNotifPermission(notificationService.getPermissionStatus())

            if (supported && user?.id) {
                const prefs = await notificationService.getPreferences(user.id)
                setNotifEnabled(prefs.enabled)
                setNotifPrefs({
                    invitations_enabled: prefs.invitations_enabled,
                    slot_openings_enabled: prefs.slot_openings_enabled,
                    registrations_enabled: prefs.registrations_enabled,
                })
            }
        }
        loadNotificationSettings()
    }, [user?.id])

    const handleToggleNotifications = async () => {
        setNotifLoading(true)
        try {
            if (notifEnabled) {
                await notificationService.disableNotifications(user.id)
                setNotifEnabled(false)
            } else {
                const result = await notificationService.enableNotifications(user.id)
                if (result.success) {
                    setNotifEnabled(true)
                    setNotifPermission('granted')
                } else {
                    addToast(result.error || "Impossible d'activer les notifications", 'error')
                    setNotifPermission(notificationService.getPermissionStatus())
                }
            }
        } catch {
            addToast('Erreur lors de la mise à jour des notifications.', 'error')
        }
        setNotifLoading(false)
    }

    const handleUpdateNotifPref = async (key, value) => {
        const newPrefs = { ...notifPrefs, [key]: value }
        setNotifPrefs(newPrefs)
        try {
            await notificationService.updatePreferences(user.id, newPrefs)
        } catch {
            addToast('Erreur lors de la mise à jour des préférences.', 'error')
        }
    }

    const handleTestNotification = async () => {
        try {
            await notificationService.sendTestNotification()
        } catch {
            addToast("Erreur lors de l'envoi de la notification test.", 'error')
        }
    }

    return (
        <>
            <h2 className={styles.sectionHeading}>
                <Bell size={18} />
                Notifications
            </h2>

            {!notifSupported ? (
                <div className={styles.notifUnsupported}>
                    <Smartphone size={16} />
                    Les notifications ne sont pas supportées sur ce navigateur.
                </div>
            ) : notifPermission === 'denied' && !notifEnabled ? (
                <div className={styles.notifDenied}>
                    <p className={styles.notifDeniedTitle}>Notifications bloquées</p>
                    <p className={styles.notifDeniedText}>
                        Vous avez refusé les notifications. Pour les activer, modifiez les
                        paramètres de votre navigateur pour ce site.
                    </p>
                </div>
            ) : (
                <>
                    {/* Master toggle */}
                    <div
                        className={clsx(
                            styles.notifToggle,
                            notifEnabled && styles.notifToggleEnabled
                        )}
                    >
                        <div>
                            <div className={styles.notifToggleLabel}>
                                {notifEnabled
                                    ? 'Notifications activées'
                                    : 'Notifications désactivées'}
                            </div>
                            <div className={styles.notifToggleSub}>
                                Recevez des alertes sur votre appareil
                            </div>
                        </div>
                        <button
                            onClick={handleToggleNotifications}
                            disabled={notifLoading}
                            className={clsx(
                                styles.notifToggleBtn,
                                notifEnabled && styles.notifToggleBtnDisable,
                                notifLoading && styles.notifToggleBtnLoading
                            )}
                        >
                            {notifEnabled ? <BellOff size={16} /> : <Bell size={16} />}
                            {notifLoading ? '...' : notifEnabled ? 'Désactiver' : 'Activer'}
                        </button>
                    </div>

                    {/* Granular preferences - only show if enabled */}
                    {notifEnabled && (
                        <div className={styles.notifPrefs}>
                            <label className={styles.notifPrefLabel}>
                                <input
                                    type="checkbox"
                                    checked={notifPrefs.invitations_enabled}
                                    onChange={(e) =>
                                        handleUpdateNotifPref(
                                            'invitations_enabled',
                                            e.target.checked
                                        )
                                    }
                                    className={styles.notifPrefCheckbox}
                                />
                                <div>
                                    <div className={styles.notifPrefTitle}>Invitations</div>
                                    <div className={styles.notifPrefSub}>
                                        Quand quelqu'un vous invite sur un créneau
                                    </div>
                                </div>
                            </label>

                            <label className={styles.notifPrefLabel}>
                                <input
                                    type="checkbox"
                                    checked={notifPrefs.slot_openings_enabled}
                                    onChange={(e) =>
                                        handleUpdateNotifPref(
                                            'slot_openings_enabled',
                                            e.target.checked
                                        )
                                    }
                                    className={styles.notifPrefCheckbox}
                                />
                                <div>
                                    <div className={styles.notifPrefTitle}>
                                        Ouvertures de créneaux
                                    </div>
                                    <div className={styles.notifPrefSub}>
                                        Quand un créneau correspondant à votre licence s'ouvre
                                    </div>
                                </div>
                            </label>

                            <label className={styles.notifPrefLabel}>
                                <input
                                    type="checkbox"
                                    checked={notifPrefs.registrations_enabled}
                                    onChange={(e) =>
                                        handleUpdateNotifPref(
                                            'registrations_enabled',
                                            e.target.checked
                                        )
                                    }
                                    className={styles.notifPrefCheckbox}
                                />
                                <div>
                                    <div className={styles.notifPrefTitle}>Inscriptions</div>
                                    <div className={styles.notifPrefSub}>
                                        Quand quelqu'un s'inscrit sur un de vos créneaux
                                    </div>
                                </div>
                            </label>

                            {/* Test button */}
                            <button
                                onClick={handleTestNotification}
                                className={clsx('btn', styles.notifTestBtn)}
                            >
                                Tester les notifications
                            </button>
                        </div>
                    )}
                </>
            )}
        </>
    )
}
