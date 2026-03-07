import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { GROUP_NAME, CLUB_URL } from '../constants'
import {
    X,
    Calendar,
    Users,
    LogOut,
    User,
    Settings,
    Mail,
    Shield,
    Home,
    ExternalLink,
    Sparkles,
    Download,
} from 'lucide-react'
import clsx from 'clsx'
import { usePwaInstall } from '../hooks/usePwaInstall'
import styles from './SlideMenu.module.css'

export default function SlideMenu({ isOpen, onClose }) {
    const { user, logout, simulatedRole, setSimulatedRole, getSimulatableRoles } = useAuth()
    const { canInstall, promptInstall } = usePwaInstall()
    const location = useLocation()
    const navigate = useNavigate()
    const [pendingCount, setPendingCount] = useState(0)
    const [invitationsCount, setInvitationsCount] = useState(0)
    const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)

    useEffect(() => {
        if (isOpen && user?.isAdmin) {
            storageService.getPendingCount().then(setPendingCount)
        }
        if (isOpen && user) {
            storageService.getPendingInvitationsCount(user.id).then(setInvitationsCount)
            storageService.getProfilePhotoUrl(user.id).then(setProfilePhotoUrl)
        }
    }, [isOpen, user?.isAdmin, user])

    const handleLogout = async () => {
        await logout()
        onClose()
    }

    const isActive = (path) => location.pathname === path

    return (
        <>
            {/* Overlay */}
            {isOpen && <div onClick={onClose} className={styles.overlay} />}

            {/* Slide Panel */}
            <div className={clsx(styles.panel, isOpen && styles.panelOpen)}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <div className={styles.headerTitle}>🏓 {GROUP_NAME}</div>
                    </div>
                    <button onClick={onClose} className={styles.closeBtn}>
                        <X size={20} />
                    </button>
                </div>

                {/* User Info - cliquable pour aller aux paramètres */}
                <div
                    onClick={() => {
                        navigate('/settings')
                        onClose()
                    }}
                    className={styles.userInfo}
                >
                    <div className="avatar avatar--md">
                        {profilePhotoUrl ? (
                            <img src={profilePhotoUrl} alt={user?.name} className="avatar__img" />
                        ) : (
                            user?.name?.charAt(0).toUpperCase() || 'U'
                        )}
                    </div>
                    <div className={styles.userDetails}>
                        <div className={styles.userName}>{user?.name}</div>
                        <div className={styles.userEmail}>{user?.email}</div>
                        {(user?.role === 'super_admin' ||
                            user?.role === 'admin' ||
                            user?.role === 'admin_salles') && (
                            <div className={styles.userRole}>
                                {user?.role === 'super_admin' && (
                                    <span className="badge badge--warning">Super Admin</span>
                                )}
                                {user?.role === 'admin' && (
                                    <span className="badge badge--info">Admin</span>
                                )}
                                {user?.role === 'admin_salles' && (
                                    <span className="badge badge--success">Gestion Salle</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className={styles.nav}>
                    <Link
                        to="/"
                        onClick={onClose}
                        className={clsx(styles.navLink, isActive('/') && styles.navLinkActive)}
                    >
                        <Calendar size={20} />
                        Planning
                    </Link>

                    <Link
                        to="/settings"
                        onClick={onClose}
                        className={clsx(
                            styles.navLink,
                            isActive('/settings') && styles.navLinkActive
                        )}
                    >
                        <User size={20} />
                        Mon compte
                    </Link>

                    <Link
                        to="/invitations"
                        onClick={onClose}
                        className={clsx(
                            styles.navLink,
                            isActive('/invitations') && styles.navLinkActive
                        )}
                    >
                        <Mail size={20} />
                        <span className={styles.navLinkLabel}>Invitations reçues</span>
                        {invitationsCount > 0 && (
                            <span className="badge--count">{invitationsCount}</span>
                        )}
                    </Link>

                    <Link
                        to="/club"
                        onClick={onClose}
                        className={clsx(styles.navLink, isActive('/club') && styles.navLinkActive)}
                    >
                        <Home size={20} />
                        Mon club
                    </Link>

                    <Link
                        to="/changelog"
                        onClick={onClose}
                        className={clsx(
                            styles.navLink,
                            isActive('/changelog') && styles.navLinkActive
                        )}
                    >
                        <Sparkles size={20} />
                        Notes de l'App
                    </Link>

                    {user?.isAdmin && (
                        <>
                            <Link
                                to="/admin"
                                onClick={onClose}
                                className={clsx(
                                    styles.navLink,
                                    isActive('/admin') && styles.navLinkActive
                                )}
                            >
                                <Users size={20} />
                                <span className={styles.navLinkLabel}>Gestion des membres</span>
                                {pendingCount > 0 && (
                                    <span className="badge--count">{pendingCount}</span>
                                )}
                            </Link>
                            <Link
                                to="/admin/planning"
                                onClick={onClose}
                                className={clsx(
                                    styles.navLink,
                                    isActive('/admin/planning') && styles.navLinkActive
                                )}
                            >
                                <Settings size={20} />
                                Gestion du planning
                            </Link>
                        </>
                    )}
                </nav>

                {/* Lien site du club */}
                <a
                    href={CLUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={styles.externalLink}
                >
                    <ExternalLink size={20} />
                    Site du club
                </a>

                {/* Install PWA */}
                {canInstall && (
                    <button onClick={promptInstall} className={styles.installBtn}>
                        <Download size={20} />
                        Installer l'app
                    </button>
                )}

                {/* Role Simulation */}
                {getSimulatableRoles && getSimulatableRoles().length > 0 && (
                    <div
                        className={clsx(
                            styles.roleSimulation,
                            simulatedRole && styles.roleSimulationActive
                        )}
                    >
                        <div
                            className={clsx(
                                styles.roleSimulationHeader,
                                simulatedRole && styles.roleSimulationHeaderActive
                            )}
                        >
                            <Shield size={14} />
                            {simulatedRole ? 'Mode simulation actif' : 'Simuler un rôle'}
                        </div>
                        <select
                            value={simulatedRole || ''}
                            onChange={(e) => setSimulatedRole(e.target.value || null)}
                            className={clsx(
                                styles.roleSelect,
                                simulatedRole && styles.roleSelectActive
                            )}
                        >
                            <option value="">
                                {user?.realRole === 'super_admin'
                                    ? 'Super Admin (mon rôle)'
                                    : user?.realRole === 'admin'
                                      ? 'Admin (mon rôle)'
                                      : user?.realRole === 'admin_salles'
                                        ? 'Gestion Salle (mon rôle)'
                                        : 'Mon rôle'}
                            </option>
                            {getSimulatableRoles().map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        {simulatedRole && (
                            <div className={styles.roleSimulationHint}>
                                Vous voyez l'app comme :{' '}
                                {simulatedRole === 'admin'
                                    ? 'Admin'
                                    : simulatedRole === 'admin_salles'
                                      ? 'Gestion Salle'
                                      : 'Membre'}
                            </div>
                        )}
                    </div>
                )}

                {/* Logout */}
                <div className={styles.logoutSection}>
                    <button onClick={handleLogout} className={clsx(styles.logoutBtn, 'btn-danger')}>
                        <LogOut size={18} />
                        Se déconnecter
                    </button>
                </div>

                {/* Copyright */}
                <div className={styles.copyright}>© {new Date().getFullYear()} Jérôme Daulion</div>
            </div>
        </>
    )
}
