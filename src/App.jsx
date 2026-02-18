import React, { useState, useEffect, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
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
import { GROUP_NAME } from './constants'
import { storageService } from './services/storage'
import { Menu, Bell } from 'lucide-react'
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

function AppContent() {
    const { user, memberStatus } = useAuth()
    const [menuOpen, setMenuOpen] = useState(false)
    const [notificationCount, setNotificationCount] = useState(0)
    const showMainUI = user && (memberStatus === 'approved' || user?.isAdmin)

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
                    <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

                    <header className={styles.header}>
                        <div className={styles.headerLeft}>
                            <button onClick={() => setMenuOpen(true)} className={styles.menuBtn}>
                                <Menu size={22} />
                            </button>
                            <Link to="/" className={styles.logoLink}>
                                <h2 className={styles.logoTitle}>🏓 {GROUP_NAME}</h2>
                            </Link>
                        </div>
                        <div className={styles.headerRight}>
                            <Link to="/invitations" className={styles.bellLink}>
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

            <main className={styles.main}>
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
