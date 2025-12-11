import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Calendar from './components/Calendar'
import Settings from './components/Settings'
import PendingApproval from './components/PendingApproval'
import AdminPanel from './components/AdminPanel'
import PlanningSettings from './components/PlanningSettings'
import SlideMenu from './components/SlideMenu'
import { GROUP_NAME } from './services/storage'
import { Menu } from 'lucide-react'

function PrivateRoute({ children, requireApproval = true }) {
    const { user, loading, memberStatus } = useAuth()

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    if (!user) return <Navigate to="/login" />

    // Admins bypass approval requirement
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
    const [menuOpen, setMenuOpen] = useState(false)
    const showMainUI = user && (memberStatus === 'approved' || user?.isAdmin)

    return (
        <div className="app-container">
            {showMainUI && (
                <>
                    <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

                    <header style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                                onClick={() => setMenuOpen(true)}
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '0.5rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex'
                                }}
                            >
                                <Menu size={22} />
                            </button>
                            <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0 }}>
                                    🏓 {GROUP_NAME}
                                </h2>
                            </Link>
                        </div>
                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{user?.name}</span>
                    </header>
                </>
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
                    <Route path="/admin/planning" element={
                        <AdminRoute>
                            <PlanningSettings />
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
