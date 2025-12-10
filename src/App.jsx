import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
// Will implement Calendar next
import Calendar from './components/Calendar'

function PrivateRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) return <div>Chargement...</div>
    if (!user) return <Navigate to="/login" />

    return children
}

function AppContent() {
    const { user, logout } = useAuth()

    return (
        <div className="app-container">
            {user && (
                <header style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Ping Pong Club</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span>Hello, {user.name}</span>
                        <button
                            onClick={logout}
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Sortir
                        </button>
                    </div>
                </header>
            )}

            <main className="container" style={{ flex: 1 }}>
                <Routes>
                    <Route path="/login" element={<Login />} />
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
