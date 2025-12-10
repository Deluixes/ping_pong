import React, { useState, useEffect, useCallback } from 'react'
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { Users, ChevronLeft, ChevronRight, Check } from 'lucide-react'

// Generate 30-min slots from 9:00 to 22:00
const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 22; hour++) {
        slots.push({ id: `${hour}:00`, label: `${hour}:00` })
        slots.push({ id: `${hour}:30`, label: `${hour}:30` })
    }
    return slots
}

const TIME_SLOTS = generateTimeSlots()

export default function Calendar() {
    const { user } = useAuth()
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [events, setEvents] = useState([])
    const [usersMap, setUsersMap] = useState({})
    const [loading, setLoading] = useState(true)

    // Load data once on mount and after toggle (no auto-polling to avoid resets)
    const loadData = useCallback(async () => {
        try {
            const [loadedEvents, loadedUsers] = await Promise.all([
                storageService.getEvents(),
                storageService.getUsers()
            ])
            setEvents(loadedEvents)
            const uMap = {}
            loadedUsers.forEach(u => { uMap[u.id] = u })
            setUsersMap(uMap)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Navigation
    const nextWeek = () => setWeekStart(d => addDays(d, 7))
    const prevWeek = () => setWeekStart(d => addDays(d, -7))

    // Get days of the week
    const weekDays = []
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i))
    }

    // Toggle Attendance
    const handleToggle = async (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        await storageService.toggleEventAttendance(slotId, dateStr, user.id)
        await loadData()
    }

    // Get participants for a slot on the selected date
    const getParticipants = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events
            .filter(e => e.date === dateStr && e.slotId === slotId)
            .map(e => usersMap[e.userId])
            .filter(Boolean)
    }

    // Check if user is participating in a slot
    const isUserParticipating = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.some(e => e.date === dateStr && e.slotId === slotId && e.userId === user.id)
    }

    // Count participants for a day (for the week view badges)
    const getDayParticipantCount = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter(e => e.date === dateStr)
        return new Set(dayEvents.map(e => e.userId)).size
    }

    if (loading) return <div className="text-center mt-4">Chargement du planning...</div>

    return (
        <div className="calendar-view" style={{ paddingBottom: '2rem' }}>
            {/* Week Navigation */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                marginTop: '1rem',
                background: 'var(--color-surface)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <button onClick={prevWeek} className="btn" style={{ background: 'var(--color-bg)', padding: '0.5rem' }}>
                    <ChevronLeft size={20} />
                </button>
                <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {format(weekStart, 'MMMM yyyy', { locale: fr })}
                </span>
                <button onClick={nextWeek} className="btn" style={{ background: 'var(--color-bg)', padding: '0.5rem' }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Day Selector (Horizontal Scroll) */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                marginBottom: '1rem'
            }}>
                {weekDays.map(day => {
                    const isSelected = isSameDay(day, selectedDate)
                    const isToday = isSameDay(day, new Date())
                    const participantCount = getDayParticipantCount(day)

                    return (
                        <button
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            style={{
                                flex: '0 0 auto',
                                minWidth: '70px',
                                padding: '0.75rem 0.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: isSelected ? '2px solid var(--color-primary)' : '1px solid #E2E8F0',
                                background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: isSelected ? 'white' : 'inherit',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.25rem',
                                position: 'relative'
                            }}
                        >
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7 }}>
                                {format(day, 'EEE', { locale: fr })}
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                {format(day, 'd')}
                            </span>
                            {isToday && !isSelected && (
                                <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: 'var(--color-primary)',
                                    marginTop: '2px'
                                }} />
                            )}
                            {participantCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-4px',
                                    right: '-4px',
                                    background: isSelected ? 'white' : 'var(--color-primary)',
                                    color: isSelected ? 'var(--color-primary)' : 'white',
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    textAlign: 'center'
                                }}>
                                    {participantCount}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Selected Day Title */}
            <h2 style={{
                marginBottom: '1rem',
                textTransform: 'capitalize',
                color: 'var(--color-secondary)',
                fontSize: '1.1rem'
            }}>
                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h2>

            {/* Time Slots Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TIME_SLOTS.map(slot => {
                    const participants = getParticipants(slot.id)
                    const isParticipating = isUserParticipating(slot.id)
                    const count = participants.length

                    return (
                        <div
                            key={slot.id}
                            style={{
                                display: 'flex',
                                alignItems: 'stretch',
                                background: 'var(--color-surface)',
                                borderRadius: 'var(--radius-md)',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-sm)',
                                border: isParticipating ? '2px solid var(--color-primary)' : '1px solid #E2E8F0'
                            }}
                        >
                            {/* Time Label */}
                            <div style={{
                                width: '70px',
                                padding: '0.75rem',
                                background: isParticipating ? 'var(--color-primary)' : 'var(--color-bg)',
                                color: isParticipating ? 'white' : 'var(--color-text)',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {slot.label}
                            </div>

                            {/* Participants Info */}
                            <div style={{
                                flex: 1,
                                padding: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                flexWrap: 'wrap'
                            }}>
                                {count > 0 ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-secondary)' }}>
                                            <Users size={16} />
                                            <span style={{ fontWeight: 'bold' }}>{count}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            {participants.map(p => p.name).join(', ')}
                                        </div>
                                    </>
                                ) : (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Aucun inscrit</span>
                                )}
                            </div>

                            {/* Toggle Button */}
                            <button
                                onClick={() => handleToggle(slot.id)}
                                style={{
                                    width: '60px',
                                    border: 'none',
                                    background: isParticipating ? 'var(--color-primary)' : 'var(--color-bg)',
                                    color: isParticipating ? 'white' : 'var(--color-text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                title={isParticipating ? 'Annuler' : "J'y vais !"}
                            >
                                {isParticipating ? <Check size={24} /> : '+'}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Manual Refresh Button */}
            <button
                onClick={loadData}
                className="btn"
                style={{
                    marginTop: '1.5rem',
                    width: '100%',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text-muted)'
                }}
            >
                🔄 Actualiser les données
            </button>
        </div>
    )
}
