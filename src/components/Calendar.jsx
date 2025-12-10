import React, { useState, useEffect } from 'react'
import { startOfWeek, addDays, format, isSameDay, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { Users, CheckCircle, Circle } from 'lucide-react'

// Constants
const SLOTS = [
    { id: 'morning', label: 'Matin', time: '10h - 12h' },
    { id: 'lunch', label: 'Midi', time: '12h - 14h' },
    { id: 'afternoon', label: 'Après-midi', time: '14h - 18h' },
    { id: 'evening', label: 'Soirée', time: '18h - 22h' }
]

export default function Calendar() {
    const { user } = useAuth()
    // Always start week on Monday
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [events, setEvents] = useState([])
    const [usersMap, setUsersMap] = useState({})
    const [loading, setLoading] = useState(true)

    // Load data
    const loadData = async () => {
        setLoading(true)
        try {
            const [loadedEvents, loadedUsers] = await Promise.all([
                storageService.getEvents(),
                storageService.getUsers()
            ])
            setEvents(loadedEvents)

            // Create user lookup map
            const uMap = {}
            loadedUsers.forEach(u => { uMap[u.id] = u })
            setUsersMap(uMap)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
        // Poll for updates every 5 seconds (simulating realtime for shared storage)
        const interval = setInterval(loadData, 5000)
        return () => clearInterval(interval)
    }, [])

    // Navigation
    const nextWeek = () => setWeekStart(d => addDays(d, 7))
    const prevWeek = () => setWeekStart(d => addDays(d, -7))
    const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

    // Toggle Attendance
    const handleToggle = async (date, slotId) => {
        // Optimistic update
        const dateStr = date.toISOString()
        const isGoing = events.some(e => e.date === dateStr && e.slotId === slotId && e.userId === user.id)

        // UI feedback immediately would be complex with exact state syncing, 
        // so we'll just wait for the fast storage response for now to be safe.
        await storageService.toggleEventAttendance(slotId, dateStr, user.id)
        loadData() // Reload to get fresh state
    }

    // Render Helpers
    const renderDays = () => {
        const days = []
        for (let i = 0; i < 7; i++) {
            const day = addDays(weekStart, i)
            days.push(day)
        }
        return days
    }

    const getParticipants = (day, slotId) => {
        const dateStr = day.toISOString()
        return events
            .filter(e => e.date === dateStr && e.slotId === slotId)
            .map(e => usersMap[e.userId])
            .filter(Boolean)
    }

    if (loading && events.length === 0) return <div className="text-center mt-4">Chargement du planning...</div>

    const weekDays = renderDays()

    return (
        <div className="calendar-view">
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
                <button onClick={prevWeek} className="btn" style={{ background: '#E2E8F0' }}>&larr;</button>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={nextWeek} className="btn" style={{ background: '#E2E8F0' }}>&rarr;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {weekDays.map(day => (
                    <div key={day.toISOString()} className="card" style={{ padding: '1rem' }}>
                        <h3 style={{
                            borderBottom: '2px solid var(--color-bg)',
                            paddingBottom: '0.5rem',
                            marginBottom: '1rem',
                            textTransform: 'capitalize',
                            color: isSameDay(day, startOfDay(new Date())) ? 'var(--color-primary)' : 'inherit'
                        }}>
                            {format(day, 'EEEE d', { locale: fr })}
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                            {SLOTS.map(slot => {
                                const participants = getParticipants(day, slot.id)
                                const isParticipating = participants.some(p => p.id === user.id)
                                const count = participants.length

                                return (
                                    <button
                                        key={slot.id}
                                        onClick={() => handleToggle(day, slot.id)}
                                        style={{
                                            background: isParticipating ? 'var(--color-secondary)' : '#F7FAFC',
                                            color: isParticipating ? 'white' : 'inherit',
                                            border: isParticipating ? 'none' : '1px solid #E2E8F0',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.8 }}>{slot.label}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {count > 0 && <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{count}</span>}
                                            {count > 0 ? <Users size={16} /> : <div style={{ height: '16px' }}>-</div>}
                                        </div>
                                        {/* Tiny avatars row could go here */}
                                        {isParticipating && <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>J'y vais</span>}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Expanded participant list for the day could go here, or simple summary */}
                        {SLOTS.map(slot => {
                            const parts = getParticipants(day, slot.id)
                            if (parts.length === 0) return null
                            return (
                                <div key={'list-' + slot.id} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 'bold', marginRight: '0.5rem', color: 'var(--color-secondary)' }}>{slot.label}:</span>
                                    <span style={{ color: 'var(--color-text-muted)' }}>
                                        {parts.map(p => p.name).join(', ')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
