// Generate 30-min slots from 8:00 to 23:00 (for unconfigured weeks)
const generateTimeSlots = () => {
    const slots = []
    for (let hour = 8; hour < 23; hour++) {
        slots.push({ id: `${hour}:00`, label: `${hour}:00`, hour, minute: 0 })
        slots.push({ id: `${hour}:30`, label: `${hour}:30`, hour, minute: 30 })
    }
    return slots
}

export const TIME_SLOTS = generateTimeSlots()
export const DEFAULT_TOTAL_TABLES = 8

export const DURATION_OPTIONS = [
    { slots: 1, label: '30 min', value: 1 },
    { slots: 2, label: '1 h', value: 2 },
    { slots: 3, label: '1 h 30', value: 3 },
    { slots: 4, label: '2 h', value: 4 },
    { slots: 5, label: '2 h 30', value: 5 },
    { slots: 6, label: '3 h', value: 6 },
    { slots: 7, label: '3 h 30', value: 7 },
    { slots: 8, label: '4 h', value: 8 },
]

// Cache events in localStorage for instant display
export const getCachedEvents = () => {
    try {
        const cached = localStorage.getItem('pingpong_events')
        if (cached) {
            const { events, timestamp } = JSON.parse(cached)
            // Cache valid for 5 minutes
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return events
            }
        }
    } catch {
        /* ignore */
    }
    return []
}

export const setCachedEvents = (events) => {
    try {
        localStorage.setItem(
            'pingpong_events',
            JSON.stringify({
                events,
                timestamp: Date.now(),
            })
        )
    } catch {
        /* ignore */
    }
}
