import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Calendar from './components/Calendar'
import Settings from './components/Settings'
import PendingApproval from './components/PendingApproval'
import AdminPanel from './components/AdminPanel'
import { GROUP_NAME } from './services/storage'

function PrivateRoute({ children, requireApproval = true }) {
    const { user, loading, memberStatus } = useAuth()

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    if (!user) return <Navigate to="/login" />

    // If approval is required and user is not approved (and not admin)
    if (requireApproval && memberStatus !== 'approved' && !user.isAdmin) {
        return <PendingApproval />
    }

    return children
}

function AdminRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    if (!user) return <Navigate to="/login" />
    if (!user.isAdmin) return <Navigate to="/" />

    return children
}

function AppContent() {
    const { user, memberStatus } = useAuth()
    const showMainUI = user && (memberStatus === 'approved' || user?.isAdmin)

    return (
        <div className="app-container">
            {showMainUI && (
                <header style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>🏓 {GROUP_NAME}</h2>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {user?.isAdmin && (
                            <Link
                                to="/admin"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    textDecoration: 'none',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                            >
                                👑 Admin
                            </Link>
                        )}
                        <span style={{ fontSize: '0.85rem' }}>{user?.name}</span>
                        <Link
                            to="/settings"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Paramètres"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </Link>
                    </div>
                </header>
            )}

            <main className="container" style={{ flex: 1 }}>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/settings" element={
                        <PrivateRoute requireApproval={false}>
                            <Settings />
                        </PrivateRoute>
                    } />
                    <Route path="/admin" element={
                        <AdminRoute>
                            <AdminPanel />
                        </AdminRoute>
                    } />
                    <Route path="/" element={
                        <PrivateRoute>
                            <Calendar />
                        </PrivateRoute>
                    } />
                </Routes>
            </main>
        </div>
    )
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    )
}

export default App
