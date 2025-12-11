import React, { useState, useEffect, useCallback, useRef } from 'react'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { ADMIN_EMAILS } from '../lib/supabase'
import { Users, ChevronLeft, ChevronRight, X, Clock, Trash2, UserPlus } from 'lucide-react'

// Generate 30-min slots from 9:00 to 22:00
const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 22; hour++) {
        slots.push({ id: `${hour}:00`, label: `${hour}:00`, hour, minute: 0 })
        slots.push({ id: `${hour}:30`, label: `${hour}:30`, hour, minute: 30 })
    }
    return slots
}

const TIME_SLOTS = generateTimeSlots()
const DEFAULT_TOTAL_TABLES = 8

const DURATION_OPTIONS = [
    { slots: 1, label: '30 min', value: 1 },
    { slots: 2, label: '1 h', value: 2 },
    { slots: 3, label: '1 h 30', value: 3 },
    { slots: 4, label: '2 h', value: 4 },
    { slots: 5, label: '2 h 30', value: 5 },
    { slots: 6, label: '3 h', value: 6 },
    { slots: 7, label: '3 h 30', value: 7 },
    { slots: 8, label: '4 h', value: 8 }
]

// Cache events in localStorage for instant display
const getCachedEvents = () => {
    try {
        const cached = localStorage.getItem('pingpong_events')
        if (cached) {
            const { events, timestamp } = JSON.parse(cached)
            // Cache valid for 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return events
            }
        }
    } catch { /* ignore */ }
    return []
}

const setCachedEvents = (events) => {
    try {
        localStorage.setItem('pingpong_events', JSON.stringify({
            events,
            timestamp: Date.now()
        }))
    } catch { /* ignore */ }
}

export default function Calendar() {
    const { user } = useAuth()
    const [selectedDate, setSelectedDate] = useState(() => new Date())
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [events, setEvents] = useState(getCachedEvents)
    const [loading, setLoading] = useState(() => getCachedEvents().length === 0)
    const [showOnlyOccupied, setShowOnlyOccupied] = useState(false)

    // Modal state - 2 steps (duration -> guests)
    const [modalStep, setModalStep] = useState(null) // 'duration' | 'guests' | null
    const [selectedSlotId, setSelectedSlotId] = useState(null)
    const [selectedDuration, setSelectedDuration] = useState(null)
    const [guests, setGuests] = useState([''])

    // Settings
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const maxPersons = totalTables * 2

    // Admin check
    const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())

    // Approved members for guest selection
    const [approvedMembers, setApprovedMembers] = useState([])

    // Ref for subscription to avoid re-subscriptions
    const subscriptionRef = useRef(null)
    const userIdRef = useRef(user?.id)

    const loadData = useCallback(async () => {
        const currentUserId = userIdRef.current
        if (!currentUserId) {
            setLoading(false)
            return
        }
        try {
            // Load settings
            const tablesSettings = await storageService.getSetting('total_tables')
            if (tablesSettings) setTotalTables(parseInt(tablesSettings))

            // Load events first (most important), members can wait
            const loadedEvents = await storageService.getEvents()
            setEvents(loadedEvents)
            setCachedEvents(loadedEvents)
            setLoading(false)

            // Load members in background (for guest selection)
            const members = await storageService.getMembers()
            setApprovedMembers(members.approved.filter(m => m.userId !== currentUserId))
        } catch (error) {
            console.error('Error loading data:', error)
            setLoading(false)
        }
    }, [])

    // Update userIdRef when user changes
    useEffect(() => {
        userIdRef.current = user?.id
        if (user?.id) {
            loadData()
        }
    }, [user?.id, loadData])

    // Setup subscription once on mount
    useEffect(() => {
        // Subscribe to real-time changes (only once)
        subscriptionRef.current = storageService.subscribeToReservations(() => {
            loadData()
        })

        return () => {
            if (subscriptionRef.current) {
                storageService.unsubscribe(subscriptionRef.current)
                subscriptionRef.current = null
            }
        }
    }, [loadData])

    // Navigation
    const nextWeek = () => setWeekStart(d => addDays(d, 7))
    const prevWeek = () => setWeekStart(d => addDays(d, -7))

    const weekDays = []
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i))
    }

    // Get slot index
    const getSlotIndex = (slotId) => TIME_SLOTS.findIndex(s => s.id === slotId)

    // Check if a slot has a table available for the user
    const getSlotEvents = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.filter(e => e.date === dateStr && e.slotId === slotId)
    }

    const getParticipants = (slotId) => {
        return getSlotEvents(slotId)
            .map(e => ({
                id: e.userId,
                name: e.userName || 'Inconnu',
                duration: e.duration,
                guests: e.guests || [],
                overbooked: e.overbooked || false
            }))
    }

    const getSlotParticipantCount = (slotId) => {
        return getSlotEvents(slotId).length
    }

    const isUserParticipating = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.some(e => e.date === dateStr && e.slotId === slotId && e.userId === user.id)
    }

    const getUserRegistration = (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        return events.find(e => e.date === dateStr && e.slotId === slotId && e.userId === user.id)
    }

    // Calculate available durations from a starting slot
    const getAvailableDurations = (startSlotId) => {
        const startIndex = getSlotIndex(startSlotId)
        if (startIndex === -1) return []

        const available = []

        for (const duration of DURATION_OPTIONS) {
            // Check if we have enough slots remaining in the day
            if (startIndex + duration.slots <= TIME_SLOTS.length) {
                available.push(duration)
            } else {
                break
            }
        }

        return available
    }

    const getDayParticipantCount = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const dayEvents = events.filter(e => e.date === dateStr)
        return new Set(dayEvents.map(e => e.userId)).size
    }

    // Actions
    const handleSlotClick = (slotId) => {
        if (isUserParticipating(slotId)) {
            handleUnregister(slotId)
        } else {
            // Open duration selection modal
            setSelectedSlotId(slotId)
            setSelectedDuration(null)
            setModalStep('duration')
        }
    }

    const handleDurationSelect = (duration) => {
        setSelectedDuration(duration)
        setGuests([''])
        setModalStep('guests')
    }

    const addGuestField = () => {
        if (guests.length < 3) {
            setGuests([...guests, ''])
        }
    }

    const updateGuest = (index, value) => {
        const newGuests = [...guests]
        newGuests[index] = value
        setGuests(newGuests)
    }

    const removeGuest = (index) => {
        const newGuests = guests.filter((_, i) => i !== index)
        setGuests(newGuests.length > 0 ? newGuests : [''])
    }

    const handleRegister = async () => {
        if (!selectedSlotId || !selectedDuration) return

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const startIndex = getSlotIndex(selectedSlotId)
        const guestNames = guests.filter(g => g.trim()).map(g => g.trim())

        // Check if slot is overbooked
        const participantCount = getSlotParticipantCount(selectedSlotId)
        const isOverbooked = participantCount >= maxPersons

        try {
            // Register for all slots in the duration
            for (let i = 0; i < selectedDuration.slots; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                await storageService.registerForSlot(slot.id, dateStr, user.id, user.name, selectedDuration.slots, guestNames, isOverbooked)
            }
            closeModal()
            await loadData()
        } catch (error) {
            console.error('Registration error:', error)
        }
    }

    const handleUnregister = async (slotId) => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const registration = getUserRegistration(slotId)

        if (registration) {
            // Find all slots that are part of this booking (same table, consecutive)
            const startIndex = getSlotIndex(slotId)
            const duration = registration.duration || 1

            for (let i = 0; i < duration; i++) {
                const slot = TIME_SLOTS[startIndex + i]
                if (slot) {
                    await storageService.unregisterFromSlot(slot.id, dateStr, user.id)
                }
            }
        }

        await loadData()
    }

    // Admin: delete any user's reservation
    const handleAdminDelete = async (slotId, userId, userName) => {
        if (!isAdmin) return
        if (!window.confirm(`Supprimer la réservation de ${userName} ?`)) return

        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        await storageService.adminDeleteEvent(slotId, dateStr, userId)
        await loadData()
    }

    const closeModal = () => {
        setModalStep(null)
        setSelectedSlotId(null)
        setSelectedDuration(null)
        setGuests([''])
    }

    if (loading) {
        return (
            <div className="text-center mt-4">
                <p>Chargement du planning...</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn"
                    style={{ marginTop: '1rem' }}
                >
                    Recharger la page
                </button>
            </div>
        )
    }

    const availableDurations = selectedSlotId ? getAvailableDurations(selectedSlotId) : []

    // Calculate if slot is overbooked for warning display
    const currentSlotParticipants = selectedSlotId ? getSlotParticipantCount(selectedSlotId) : 0
    const isCurrentSlotOverbooked = currentSlotParticipants >= maxPersons

    // Get end time for display
    const getEndTime = (startSlotId, durationSlots) => {
        const startIndex = getSlotIndex(startSlotId)
        const endSlot = TIME_SLOTS[startIndex + durationSlots]
        if (endSlot) return endSlot.label
        return '22:00'
    }

    return (
        <div className="calendar-view" style={{ paddingBottom: '2rem' }}>
            {/* Modal */}
            {modalStep && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    zIndex: 1000
                }}
                    onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                    <div style={{
                        background: 'white',
                        borderRadius: '1.5rem 1.5rem 0 0',
                        padding: '1.5rem',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '70vh',
                        overflow: 'auto',
                        animation: 'slideUp 0.2s ease-out'
                    }}>
                        <style>{`
              @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
              }
            `}</style>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={20} />
                                {modalStep === 'duration' ? 'Durée de réservation' : 'Confirmer la réservation'}
                            </h3>
                            <button
                                onClick={closeModal}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <strong>{selectedSlotId}</strong> - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                            {selectedDuration && (
                                <span> → <strong>{getEndTime(selectedSlotId, selectedDuration.slots)}</strong></span>
                            )}
                        </p>

                        {/* Step 1: Duration Selection */}
                        {modalStep === 'duration' && (
                            <>
                                {availableDurations.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {availableDurations.map(duration => (
                                            <button
                                                key={duration.value}
                                                onClick={() => handleDurationSelect(duration)}
                                                style={{
                                                    padding: '1rem 1.5rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '2px solid var(--color-primary)',
                                                    background: 'white',
                                                    color: 'var(--color-primary)',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.5rem' }}>⏱️</span>
                                                <span>{duration.label}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {selectedSlotId} → {getEndTime(selectedSlotId, duration.slots)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: '#FEE2E2',
                                        border: '1px solid #EF4444',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem',
                                        textAlign: 'center',
                                        color: '#991B1B'
                                    }}>
                                        Aucune durée disponible pour ce créneau.
                                    </div>
                                )}
                            </>
                        )}

                        {/* Step 2: Invite Guests + Confirmation */}
                        {modalStep === 'guests' && (
                            <>
                                <button
                                    onClick={() => setModalStep('duration')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--color-primary)',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem',
                                        padding: 0
                                    }}
                                >
                                    ← Changer la durée
                                </button>

                                {/* Warning if overbooked */}
                                {isCurrentSlotOverbooked && (
                                    <div style={{
                                        background: '#FEF3C7',
                                        border: '1px solid #F59E0B',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '1rem',
                                        marginBottom: '1rem'
                                    }}>
                                        <p style={{ margin: 0, color: '#92400E', fontWeight: '500' }}>
                                            ⚠️ Attention : il n'y a que {totalTables} tables disponibles et {currentSlotParticipants} personnes sont déjà inscrites. Êtes-vous sûr de ce créneau ?
                                        </p>
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)'
                                }}>
                                    <UserPlus size={18} />
                                    <span style={{ fontWeight: '500' }}>Inviter des membres (optionnel)</span>
                                </div>

                                {approvedMembers.length > 0 ? (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                            {guests.map((guest, idx) => (
                                                <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <select
                                                        value={guest}
                                                        onChange={(e) => updateGuest(idx, e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.75rem',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid #DDD',
                                                            fontSize: '0.95rem',
                                                            background: 'white'
                                                        }}
                                                    >
                                                        <option value="">-- Choisir un membre --</option>
                                                        {approvedMembers
                                                            .filter(m => !guests.includes(m.name) || m.name === guest)
                                                            .map(m => (
                                                                <option key={m.userId} value={m.name}>{m.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                    {guests.length > 1 && (
                                                        <button
                                                            onClick={() => removeGuest(idx)}
                                                            style={{
                                                                background: '#FEE2E2',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-md)',
                                                                padding: '0 0.75rem',
                                                                color: '#991B1B',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {guests.length < 3 && guests.length < approvedMembers.length && (
                                            <button
                                                onClick={addGuestField}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: 'var(--color-bg)',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem'
                                                }}
                                            >
                                                <UserPlus size={16} />
                                                Ajouter un joueur
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div style={{
                                        background: 'var(--color-bg)',
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: '1rem',
                                        textAlign: 'center',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.9rem'
                                    }}>
                                        Aucun autre membre dans le groupe pour le moment
                                    </div>
                                )}

                                <button
                                    onClick={handleRegister}
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    ✓ Confirmer la réservation
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

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

            {/* Day Selector */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                padding: '0.5rem',
                marginBottom: '1rem',
                marginLeft: '-0.5rem',
                marginRight: '-0.5rem'
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

            {/* Title + Filter */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                gap: '0.5rem',
                flexWrap: 'wrap'
            }}>
                <h2 style={{
                    textTransform: 'capitalize',
                    color: 'var(--color-secondary)',
                    fontSize: '1.1rem',
                    margin: 0
                }}>
                    {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </h2>
                <button
                    onClick={() => setShowOnlyOccupied(!showOnlyOccupied)}
                    className="btn"
                    style={{
                        background: showOnlyOccupied ? 'var(--color-secondary)' : 'var(--color-bg)',
                        color: showOnlyOccupied ? 'white' : 'var(--color-text)',
                        fontSize: '0.8rem',
                        padding: '0.5rem 0.75rem'
                    }}
                >
                    {showOnlyOccupied ? '👥 Avec inscrits' : '📋 Tout afficher'}
                </button>
            </div>

            {/* Time Slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {TIME_SLOTS
                    .filter(slot => {
                        if (!showOnlyOccupied) return true
                        return getParticipants(slot.id).length > 0
                    })
                    .map(slot => {
                        const participants = getParticipants(slot.id)
                        const isParticipating = isUserParticipating(slot.id)
                        const count = participants.length
                        const isOverbooked = count >= maxPersons

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
                                    width: '60px',
                                    padding: '0.75rem 0.5rem',
                                    background: isParticipating ? 'var(--color-primary)' : 'var(--color-bg)',
                                    color: isParticipating ? 'white' : 'var(--color-text)',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <span>{slot.label}</span>
                                </div>

                                {/* Participants Info */}
                                <div style={{
                                    flex: 1,
                                    padding: '0.5rem 0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    minWidth: 0
                                }}>
                                    {count > 0 ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverbooked ? '#EF4444' : 'var(--color-secondary)' }}>
                                                    <Users size={14} />
                                                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{count}</span>
                                                </div>
                                                {isOverbooked && (
                                                    <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: '500' }}>
                                                        ⚠️ Surbooké
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {participants.map((p, idx) => (
                                                    <span
                                                        key={p.id}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.15rem',
                                                            color: p.overbooked ? '#EF4444' : 'inherit'
                                                        }}
                                                    >
                                                        {p.name}
                                                        {p.guests && p.guests.length > 0 && (
                                                            <span style={{ color: p.overbooked ? '#EF4444' : 'var(--color-secondary)' }}>
                                                                +{p.guests.join(', ')}
                                                            </span>
                                                        )}
                                                        {isAdmin && p.id !== user.id && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAdminDelete(slot.id, p.id, p.name) }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#EF4444',
                                                                    cursor: 'pointer',
                                                                    padding: '0 2px',
                                                                    display: 'inline-flex'
                                                                }}
                                                                title="Supprimer (admin)"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                        {idx < participants.length - 1 && ', '}
                                                    </span>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Disponible</span>
                                    )}
                                </div>

                                {/* Toggle Button */}
                                <button
                                    onClick={() => handleSlotClick(slot.id)}
                                    style={{
                                        width: '50px',
                                        border: 'none',
                                        background: isParticipating ? 'var(--color-primary)' : 'var(--color-bg)',
                                        color: isParticipating ? 'white' : 'var(--color-text-muted)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    title={isParticipating ? 'Annuler' : "S'inscrire"}
                                >
                                    {isParticipating ? <X size={20} /> : '+'}
                                </button>
                            </div>
                        )
                    })}
            </div>

            {/* Refresh */}
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
                🔄 Actualiser
            </button>
        </div>
    )
}
