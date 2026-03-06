import React, { useState, useEffect, useCallback } from 'react'
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    Link,
    useLocation,
} from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './components/Login'
import Calendar from './components/Calendar'
import Settings from './components/Settings'
import PendingApproval from './components/PendingApproval'
import AdminPanel from './components/AdminPanel'
import PlanningSettings from './components/PlanningSettings'
import MyInvitations from './components/MyInvitations'
import MyClub from './components/MyClub'
import Changelog from './components/Changelog'
import SlideMenu from './components/SlideMenu'
import ChangePassword from './components/ChangePassword'
import DevIndicator from './components/DevIndicator'
import WelcomeGuide from './components/WelcomeGuide'
import { useTheme } from './hooks/useTheme'
import { GROUP_NAME } from './constants'
import { storageService } from './services/storage'
import { Menu, Bell, Calendar as CalendarIcon, Mail, Home, User } from 'lucide-react'
import clsx from 'clsx'
import styles from './components/App.module.css'

function PrivateRoute({ children, requireApproval = true, allowPasswordChange = false }) {
    const { user, loading, memberStatus, mustChangePassword } = useAuth()

    if (loading) return <div className={styles.loading}>Chargement...</div>
    if (!user) return <Navigate to="/login" />

    // Force password change for migrated users (unless on password change page)
    if (mustChangePassword && !allowPasswordChange) {
        return <ChangePassword forced={true} />
    }

    // Admins bypass approval requirement
    if (requireApproval && memberStatus !== 'approved' && !user.isAdmin) {
        return <PendingApproval />
    }

    return children
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) return <div className={styles.loading}>Chargement...</div>
    if (!user) return <Navigate to="/login" />
    if (!user.isAdmin) return <Navigate to="/" />

    return children
}

const PAGE_TITLES = {
    '/': 'Planning',
    '/settings': 'Mon compte',
    '/invitations': 'Invitations',
    '/club': 'Mon club',
    '/changelog': "Notes de l'App",
    '/admin': 'Gestion membres',
    '/admin/planning': 'Gestion planning',
}

function AppContent() {
    useTheme()
    const { user, memberStatus } = useAuth()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const [notificationCount, setNotificationCount] = useState(0)
    const showMainUI = user && (memberStatus === 'approved' || user?.isAdmin)
    const pageTitle = PAGE_TITLES[location.pathname]

    const refreshNotificationCount = useCallback(() => {
        if (user) {
            storageService.getPendingInvitationsCount(user.id).then(setNotificationCount)
        }
    }, [user])

    useEffect(() => {
        refreshNotificationCount()

        // S'abonner aux changements des invitations pour mettre à jour le compteur
        const invitationsSub = storageService.subscribeToInvitations(() => {
            refreshNotificationCount()
        })

        return () => {
            storageService.unsubscribe(invitationsSub)
        }
    }, [refreshNotificationCount])

    return (
        <div className="app-container">
            {showMainUI && (
                <>
                    <WelcomeGuide />
                    <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

                    <header className={styles.header}>
                        <div className={styles.headerLeft}>
                            <button
                                onClick={() => setMenuOpen(true)}
                                className={styles.menuBtn}
                                aria-label="Ouvrir le menu"
                            >
                                <Menu size={22} />
                            </button>
                            <Link to="/" className={styles.logoLink}>
                                <h2 className={styles.logoTitle}>🏓 {pageTitle || GROUP_NAME}</h2>
                            </Link>
                        </div>
                        <div className={styles.headerRight}>
                            <Link
                                to="/invitations"
                                className={styles.bellLink}
                                aria-label="Invitations"
                            >
                                <Bell size={20} />
                                {notificationCount > 0 && (
                                    <span className={styles.notifBadge}>{notificationCount}</span>
                                )}
                            </Link>
                            <span className={styles.userName}>{user?.name}</span>
                        </div>
                    </header>
                </>
            )}

            <main className={styles.main} key={location.pathname}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/reset-password"
                        element={
                            <PrivateRoute requireApproval={false} allowPasswordChange={true}>
                                <ChangePassword forced={true} />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <PrivateRoute requireApproval={false}>
                                <Settings />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/invitations"
                        element={
                            <PrivateRoute>
                                <MyInvitations onNotificationChange={refreshNotificationCount} />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/club"
                        element={
                            <PrivateRoute>
                                <MyClub />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/changelog"
                        element={
                            <PrivateRoute>
                                <Changelog />
                            </PrivateRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminPanel />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="/admin/planning"
                        element={
                            <AdminRoute>
                                <PlanningSettings />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Calendar />
                            </PrivateRoute>
                        }
                    />
                </Routes>
            </main>

            <DevIndicator />

            {showMainUI && (
                <nav className={styles.bottomTab}>
                    <Link
                        to="/"
                        className={clsx(
                            styles.tabItem,
                            location.pathname === '/' && styles.tabItemActive
                        )}
                    >
                        <CalendarIcon size={20} />
                        <span>Planning</span>
                    </Link>
                    <Link
                        to="/invitations"
                        className={clsx(
                            styles.tabItem,
                            location.pathname === '/invitations' && styles.tabItemActive
                        )}
                    >
                        <span className={styles.tabItemIconWrap}>
                            <Mail size={20} />
                            {notificationCount > 0 && (
                                <span className={styles.tabBadge}>{notificationCount}</span>
                            )}
                        </span>
                        <span>Invitations</span>
                    </Link>
                    <Link
                        to="/club"
                        className={clsx(
                            styles.tabItem,
                            location.pathname === '/club' && styles.tabItemActive
                        )}
                    >
                        <Home size={20} />
                        <span>Club</span>
                    </Link>
                    <Link
                        to="/settings"
                        className={clsx(
                            styles.tabItem,
                            location.pathname === '/settings' && styles.tabItemActive
                        )}
                    >
                        <User size={20} />
                        <span>Compte</span>
                    </Link>
                </nav>
            )}
        </div>
    )
}

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AuthProvider>
                    <ToastProvider>
                        <ConfirmProvider>
                            <AppContent />
                        </ConfirmProvider>
                    </ToastProvider>
                </AuthProvider>
            </Router>
        </ErrorBoundary>
    )
}

export default App
