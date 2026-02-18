import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { changelog } from '../data/changelog'
import styles from './Changelog.module.css'

export default function Changelog() {
    const navigate = useNavigate()

    return (
        <div className={styles.wrapper}>
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Nouveautés</h1>
            </div>

            {changelog.map((release) => (
                <div key={release.version} className={`card ${styles.releaseCard}`}>
                    <div className={styles.releaseHeader}>
                        <Sparkles size={18} className={styles.releaseIcon} />
                        <div>
                            <div className={styles.releaseTitle}>{release.title}</div>
                            <div className={styles.releaseMeta}>
                                v{release.version} —{' '}
                                {new Date(release.date).toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </div>
                        </div>
                    </div>
                    <ul className={styles.changeList}>
                        {release.changes.map((change, i) => (
                            <li key={i} className={styles.changeItem}>
                                {change}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}
