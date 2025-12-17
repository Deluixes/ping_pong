import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { storageService, GROUP_NAME } from '../services/storage'
import { X, Calendar, Users, LogOut, User, Settings, Mail } from 'lucide-react'

export default function SlideMenu({ isOpen, onClose }) {
    const { user, logout } = useAuth()
    const location = useLocation()
    const [pendingCount, setPendingCount] = useState(0)
    const [invitationsCount, setInvitationsCount] = useState(0)

    useEffect(() => {
        if (isOpen && user?.isAdmin) {
            storageService.getPendingCount().then(setPendingCount)
        }
        if (isOpen && user) {
            storageService.getPendingInvitationsCount(user.id).then(setInvitationsCount)
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
            {isOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 998,
                        transition: 'opacity 0.3s'
                    }}
                />
            )}

            {/* Slide Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '280px',
                    maxWidth: '80vw',
                    background: 'white',
                    zIndex: 999,
                    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: isOpen ? 'var(--shadow-lg)' : 'none'
                }}
            >
                {/* Header */}
                <div style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: '1.5rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🏓 {GROUP_NAME}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            padding: '0.5rem',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Info */}
                <div style={{
                    padding: '1rem',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold'
                    }}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.name}
                            {user?.isAdmin && (
                                <span style={{
                                    marginLeft: '0.5rem',
                                    fontSize: '0.7rem',
                                    background: '#FEF3C7',
                                    color: '#92400E',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px'
                                }}>
                                    Admin
                                </span>
                            )}
                            {!user?.isAdmin && user?.role === 'admin_salles' && (
                                <span style={{
                                    marginLeft: '0.5rem',
                                    fontSize: '0.7rem',
                                    background: '#D1FAE5',
                                    color: '#065F46',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px'
                                }}>
                                    Salles
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.email}
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '0.5rem 0' }}>
                    <Link
                        to="/"
                        onClick={onClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.875rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/') ? 'var(--color-primary)' : 'var(--color-text)',
                            background: isActive('/') ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                            fontWeight: isActive('/') ? '500' : '400'
                        }}
                    >
                        <Calendar size={20} />
                        Planning
                    </Link>

                    <Link
                        to="/settings"
                        onClick={onClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.875rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/settings') ? 'var(--color-primary)' : 'var(--color-text)',
                            background: isActive('/settings') ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                            fontWeight: isActive('/settings') ? '500' : '400'
                        }}
                    >
                        <User size={20} />
                        Mon compte
                    </Link>

                    <Link
                        to="/invitations"
                        onClick={onClose}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.875rem 1rem',
                            textDecoration: 'none',
                            color: isActive('/invitations') ? 'var(--color-primary)' : 'var(--color-text)',
                            background: isActive('/invitations') ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                            fontWeight: isActive('/invitations') ? '500' : '400'
                        }}
                    >
                        <Mail size={20} />
                        <span style={{ flex: 1 }}>Mes invitations</span>
                        {invitationsCount > 0 && (
                            <span style={{
                                background: '#F59E0B',
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '10px',
                                minWidth: '20px',
                                textAlign: 'center'
                            }}>
                                {invitationsCount}
                            </span>
                        )}
                    </Link>

                    {user?.isAdmin && (
                        <>
                            <Link
                                to="/admin"
                                onClick={onClose}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    textDecoration: 'none',
                                    color: isActive('/admin') ? 'var(--color-primary)' : 'var(--color-text)',
                                    background: isActive('/admin') ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                    fontWeight: isActive('/admin') ? '500' : '400'
                                }}
                            >
                                <Users size={20} />
                                <span style={{ flex: 1 }}>Gestion des membres</span>
                                {pendingCount > 0 && (
                                    <span style={{
                                        background: '#EF4444',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '10px',
                                        minWidth: '20px',
                                        textAlign: 'center'
                                    }}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                            <Link
                                to="/admin/planning"
                                onClick={onClose}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    textDecoration: 'none',
                                    color: isActive('/admin/planning') ? 'var(--color-primary)' : 'var(--color-text)',
                                    background: isActive('/admin/planning') ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                    fontWeight: isActive('/admin/planning') ? '500' : '400'
                                }}
                            >
                                <Settings size={20} />
                                Gestion du planning
                            </Link>
                        </>
                    )}
                </nav>

                {/* Logout */}
                <div style={{ padding: '1rem', borderTop: '1px solid #E2E8F0' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        <LogOut size={18} />
                        Se déconnecter
                    </button>
                </div>

                {/* Copyright */}
                <div style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)'
                }}>
                    © {new Date().getFullYear()} Jérôme Daulion
                </div>
            </div>
        </>
    )
}
