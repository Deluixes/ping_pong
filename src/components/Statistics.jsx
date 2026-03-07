import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Activity, Clock, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { storageService } from '../services/storage'
import { timeToMinutes } from '../utils/time'
import styles from './Statistics.module.css'

const MONTHS = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
]

function getDateRange(year, month) {
    if (month === 'all') {
        return { start: `${year}-01-01`, end: `${year}-12-31` }
    }
    const m = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    return { start: `${year}-${m}-01`, end: `${year}-${m}-${lastDay}` }
}

function computeTrainingSessions(userEvents) {
    const byDate = new Map()
    for (const e of userEvents) {
        if (!byDate.has(e.date)) byDate.set(e.date, [])
        byDate.get(e.date).push(e)
    }

    let sessionCount = 0
    let totalSlots = 0

    for (const events of byDate.values()) {
        // Convert to intervals
        const intervals = events.map((e) => {
            const start = timeToMinutes(e.slotId)
            return { start, end: start + (e.duration || 1) * 30 }
        })
        intervals.sort((a, b) => a.start - b.start)

        // Merge overlapping/adjacent intervals
        const merged = [intervals[0]]
        for (let i = 1; i < intervals.length; i++) {
            const last = merged[merged.length - 1]
            if (intervals[i].start <= last.end) {
                last.end = Math.max(last.end, intervals[i].end)
            } else {
                merged.push({ ...intervals[i] })
            }
        }

        sessionCount += merged.length
        for (const e of events) {
            totalSlots += e.duration || 1
        }
    }

    return { sessionCount, totalSlots }
}

function computePartners(userEvents, allEvents, userId) {
    const partnerCounts = new Map()

    // Pre-compute user time ranges by date
    const userRangesByDate = new Map()
    for (const e of userEvents) {
        if (!userRangesByDate.has(e.date)) userRangesByDate.set(e.date, [])
        const start = timeToMinutes(e.slotId)
        userRangesByDate.get(e.date).push({ start, end: start + (e.duration || 1) * 30 })
    }

    for (const e of allEvents) {
        if (e.userId === userId) continue
        const userRanges = userRangesByDate.get(e.date)
        if (!userRanges) continue

        const start = timeToMinutes(e.slotId)
        const end = start + (e.duration || 1) * 30

        const overlaps = userRanges.some((r) => r.start < end && start < r.end)
        if (overlaps) {
            const key = e.userId
            if (!partnerCounts.has(key)) {
                partnerCounts.set(key, { userId: e.userId, userName: e.userName, count: 0 })
            }
            partnerCounts.get(key).count++
        }
    }

    return [...partnerCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10)
}

export default function Statistics() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const currentYear = new Date().getFullYear()

    const [year, setYear] = useState(currentYear)
    const [month, setMonth] = useState('all')
    const [loading, setLoading] = useState(true)
    const [allEvents, setAllEvents] = useState([])

    useEffect(() => {
        if (!user) return
        setLoading(true)
        const { start, end } = getDateRange(year, month)
        storageService.getEvents(start, end).then((events) => {
            setAllEvents(events)
            setLoading(false)
        })
    }, [user, year, month])

    const userEvents = useMemo(
        () => allEvents.filter((e) => e.userId === user?.id),
        [allEvents, user?.id]
    )

    const { sessionCount, totalSlots } = useMemo(
        () =>
            userEvents.length > 0
                ? computeTrainingSessions(userEvents)
                : { sessionCount: 0, totalSlots: 0 },
        [userEvents]
    )

    const totalHours = (totalSlots * 30) / 60

    const partners = useMemo(
        () => (userEvents.length > 0 ? computePartners(userEvents, allEvents, user?.id) : []),
        [userEvents, allEvents, user?.id]
    )

    return (
        <div className={styles.wrapper}>
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Statistiques</h1>
            </div>

            {/* Filtres */}
            <div className={styles.filters}>
                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={styles.filterSelect}
                >
                    {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
                <select
                    value={month}
                    onChange={(e) =>
                        setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    className={styles.filterSelect}
                >
                    <option value="all">Toute l'année</option>
                    {MONTHS.map((name, i) => (
                        <option key={i + 1} value={i + 1}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className={styles.loading}>Chargement...</div>
            ) : (
                <>
                    {/* Cards stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Activity size={22} />
                            </div>
                            <div className={styles.statValue}>{sessionCount}</div>
                            <div className={styles.statLabel}>Entraînements</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Clock size={22} />
                            </div>
                            <div className={styles.statValue}>
                                {totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h
                            </div>
                            <div className={styles.statLabel}>Heures totales</div>
                        </div>
                    </div>

                    {/* Partenaires */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <Users size={18} />
                            Partenaires les plus fréquents
                        </h2>
                        {partners.length === 0 ? (
                            <p className={styles.emptyText}>Aucune donnée pour cette période</p>
                        ) : (
                            <div className={styles.partnerList}>
                                {partners.map((p, i) => (
                                    <div key={p.userId} className={styles.partnerRow}>
                                        <span className={styles.partnerRank}>{i + 1}</span>
                                        <span className={styles.partnerName}>{p.userName}</span>
                                        <span className={styles.partnerCount}>
                                            {p.count} {p.count > 1 ? 'sessions' : 'session'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
