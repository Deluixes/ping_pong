import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowLeft, Users, Newspaper } from 'lucide-react'
import ClubMembers from './ClubMembers'
import styles from './MyClub.module.css'

export default function MyClub() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('members')

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Mon club</h1>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                <button
                    onClick={() => setActiveTab('members')}
                    className={clsx('tab-btn', activeTab === 'members' && 'tab-btn--active')}
                >
                    <Users size={18} />
                    Membres
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    className={clsx('tab-btn', activeTab === 'news' && 'tab-btn--active')}
                >
                    <Newspaper size={18} />
                    News
                </button>
            </div>

            {/* Content */}
            {activeTab === 'members' && <ClubMembers />}
            {activeTab === 'news' && (
                <div className={clsx('card', styles.emptyCard)}>
                    <Newspaper size={48} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>Les actualités du club arrivent bientôt !</p>
                </div>
            )}
        </div>
    )
}
