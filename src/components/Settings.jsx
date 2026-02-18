import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Lock } from 'lucide-react'
import ChangePassword from './ChangePassword'
import ProfileSection from './ProfileSection'
import NotificationsSection from './NotificationsSection'
import MaintenanceSection from './MaintenanceSection'
import clsx from 'clsx'
import styles from './Settings.module.css'

export default function Settings() {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const [showPasswordModal, setShowPasswordModal] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Paramètres</h1>
            </div>

            {/* Profile Section */}
            <div className={clsx('card', styles.section)}>
                <ProfileSection />
            </div>

            {/* Password Section */}
            <div className={clsx('card', styles.section)}>
                <h2 className={styles.sectionHeading}>
                    <Lock size={18} />
                    Mot de passe
                </h2>

                <button
                    onClick={() => setShowPasswordModal(true)}
                    className={clsx('btn', styles.passwordBtn)}
                >
                    <Lock size={16} />
                    Modifier le mot de passe
                </button>
            </div>

            {/* Notifications Section */}
            <div className={clsx('card', styles.section)}>
                <NotificationsSection />
            </div>

            {/* Maintenance Section */}
            <div className={clsx('card', styles.section)}>
                <MaintenanceSection />
            </div>

            {/* Logout Section */}
            <div className="card">
                <button onClick={handleLogout} className={clsx('btn', styles.logoutBtn)}>
                    Se déconnecter
                </button>
            </div>

            {/* Version info */}
            <p className={styles.version}>Ping Pong Club PWA v1.0</p>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className={clsx('modal-overlay', styles.modalPadding)}>
                    <div className={clsx('card', styles.modalCard)}>
                        <ChangePassword
                            forced={false}
                            onClose={() => setShowPasswordModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
