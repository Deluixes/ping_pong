import React from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function WeekViewGrid({
    weekStart,
    selectedDate,
    weekSlots,
    openedSlots,
    onSelectDay,
}) {
    return (
        <div style={{ overflowX: 'auto' }}>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '50px repeat(7, 1fr)',
                    gap: '1px',
                    background: '#E2E8F0',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    minWidth: '600px',
                }}
            >
                {/* Header avec jours */}
                <div
                    style={{
                        background: 'var(--color-secondary)',
                        padding: '0.5rem',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.7rem',
                    }}
                ></div>
                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                    const day = addDays(weekStart, dayOffset)
                    const isToday = isSameDay(day, new Date())
                    const isSelected = isSameDay(day, selectedDate)
                    return (
                        <div
                            key={dayOffset}
                            style={{
                                background: isSelected
                                    ? 'var(--color-primary)'
                                    : isToday
                                      ? '#F0FDF4'
                                      : 'var(--color-secondary)',
                                padding: '0.5rem 0.25rem',
                                color: isSelected ? 'white' : isToday ? '#166534' : 'white',
                                fontWeight: 'bold',
                                fontSize: '0.7rem',
                                textAlign: 'center',
                            }}
                        >
                            <div>{format(day, 'EEE', { locale: fr })}</div>
                            <div style={{ fontSize: '0.85rem' }}>{format(day, 'd')}</div>
                        </div>
                    )
                })}

                {/* Lignes horaires de 8h à 22h */}
                {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                    <React.Fragment key={hour}>
                        {/* Colonne heure */}
                        <div
                            style={{
                                background: '#F9FAFB',
                                padding: '0.25rem',
                                fontSize: '0.65rem',
                                color: '#6B7280',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '500',
                            }}
                        >
                            {hour}h
                        </div>
                        {/* 7 colonnes pour les jours */}
                        {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                            const day = addDays(weekStart, dayOffset)
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const slotId = `${hour}:00`

                            // Trouver les créneaux pour cette heure et ce jour
                            const dayWeekSlots = weekSlots.filter((ws) => ws.date === dateStr)
                            const dayOpenedSlots = openedSlots.filter((os) => os.date === dateStr)

                            // Vérifier si un créneau bloquant ou indicatif existe à cette heure
                            const matchingWeekSlot = dayWeekSlots.find((ws) => {
                                const startHour = parseInt(ws.startTime.split(':')[0])
                                const endHour = parseInt(ws.endTime.split(':')[0])
                                return hour >= startHour && hour < endHour
                            })

                            // Vérifier si un créneau ouvert existe à cette heure
                            const matchingOpenedSlot = dayOpenedSlots.find(
                                (os) => os.slotId === slotId
                            )

                            let bgColor = 'white'
                            let content = ''
                            let textColor = '#6B7280'

                            if (matchingWeekSlot) {
                                if (matchingWeekSlot.isBlocking === false) {
                                    // Cours indicatif
                                    bgColor = '#DBEAFE'
                                    textColor = '#1D4ED8'
                                    const startHour = parseInt(
                                        matchingWeekSlot.startTime.split(':')[0]
                                    )
                                    if (hour === startHour)
                                        content = matchingWeekSlot.name?.substring(0, 8) || 'Cours'
                                } else {
                                    // Entraînement bloquant
                                    bgColor = '#F3F4F6'
                                    textColor = '#6B7280'
                                    const startHour = parseInt(
                                        matchingWeekSlot.startTime.split(':')[0]
                                    )
                                    if (hour === startHour)
                                        content = matchingWeekSlot.name?.substring(0, 8) || 'Entr.'
                                }
                            } else if (matchingOpenedSlot) {
                                // Créneau ouvert
                                bgColor = '#DCFCE7'
                                textColor = '#166534'
                            }

                            return (
                                <div
                                    key={dayOffset}
                                    onClick={() => onSelectDay(day)}
                                    style={{
                                        background: bgColor,
                                        padding: '0.15rem',
                                        minHeight: '24px',
                                        fontSize: '0.55rem',
                                        color: textColor,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        textAlign: 'center',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {content}
                                </div>
                            )
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Légende */}
            <div
                style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '0.75rem',
                    flexWrap: 'wrap',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div
                        style={{
                            width: '12px',
                            height: '12px',
                            background: '#DCFCE7',
                            borderRadius: '2px',
                        }}
                    ></div>
                    <span>Ouvert</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div
                        style={{
                            width: '12px',
                            height: '12px',
                            background: '#DBEAFE',
                            borderRadius: '2px',
                        }}
                    ></div>
                    <span>Cours</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div
                        style={{
                            width: '12px',
                            height: '12px',
                            background: '#F3F4F6',
                            borderRadius: '2px',
                        }}
                    ></div>
                    <span>Entraînement</span>
                </div>
            </div>
        </div>
    )
}
