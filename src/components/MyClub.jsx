import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Newspaper } from 'lucide-react'
import ClubMembers from './ClubMembers'

export default function MyClub() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('members')

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                marginTop: '1rem'
            }}>
                <button
                    onClick={() => navigate('/')}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Mon club</h1>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: '#F3F4F6',
                padding: '0.25rem',
                borderRadius: 'var(--radius-md)'
            }}>
                <button
                    onClick={() => setActiveTab('members')}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'members' ? 'white' : 'transparent',
                        color: activeTab === 'members' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'members' ? '600' : '400',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'members' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Users size={18} />
                    Membres
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'news' ? 'white' : 'transparent',
                        color: activeTab === 'news' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'news' ? '600' : '400',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'news' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Newspaper size={18} />
                    News
                </button>
            </div>

            {/* Content */}
            {activeTab === 'members' && <ClubMembers />}
            {activeTab === 'news' && (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Newspaper size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                        Les actualités du club arrivent bientôt !
                    </p>
                </div>
            )}
        </div>
    )
}
