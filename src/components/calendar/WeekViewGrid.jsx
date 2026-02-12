import React from 'react'
import { addDays, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import clsx from 'clsx'
import styles from './WeekViewGrid.module.css'

export default function WeekViewGrid({
    weekStart,
    selectedDate,
    weekSlots,
    openedSlots,
    daysWithSlots,
    onSelectDay,
}) {
    return (
        <div className={styles.container}>
            <div className={styles.grid}>
                {/* Header avec jours */}
                <div className={styles.cornerCell}></div>
                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
                    const day = addDays(weekStart, dayOffset)
                    const isSelected = isSameDay(day, selectedDate)
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const hasSlots = daysWithSlots.includes(dayStr)
                    return (
                        <div
                            key={dayOffset}
                            className={clsx(
                                styles.dayHeader,
                                !isSelected && hasSlots && styles.dayHeaderHasSlots,
                                isSelected && !hasSlots && styles.dayHeaderSelected,
                                isSelected && hasSlots && styles.dayHeaderSelectedHasSlots,
                                !isSelected && !hasSlots && styles.dayHeaderDefault
                            )}
                        >
                            <div>{format(day, 'EEE', { locale: fr })}</div>
                            <div className={styles.dayNumber}>{format(day, 'd')}</div>
                        </div>
                    )
                })}

                {/* Lignes horaires de 8h à 22h */}
                {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                    <React.Fragment key={hour}>
                        {/* Colonne heure */}
                        <div className={styles.hourLabel}>{hour}h</div>
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

                            let content = ''
                            let isIndicative = false
                            let isBlocking = false
                            let isOpened = false

                            if (matchingWeekSlot) {
                                if (matchingWeekSlot.isBlocking === false) {
                                    // Cours indicatif
                                    isIndicative = true
                                    const startHour = parseInt(
                                        matchingWeekSlot.startTime.split(':')[0]
                                    )
                                    if (hour === startHour)
                                        content = matchingWeekSlot.name?.substring(0, 8) || 'Cours'
                                } else {
                                    // Entraînement bloquant
                                    isBlocking = true
                                    const startHour = parseInt(
                                        matchingWeekSlot.startTime.split(':')[0]
                                    )
                                    if (hour === startHour)
                                        content = matchingWeekSlot.name?.substring(0, 8) || 'Entr.'
                                }
                            } else if (matchingOpenedSlot) {
                                // Créneau ouvert
                                isOpened = true
                            }

                            return (
                                <div
                                    key={dayOffset}
                                    onClick={() => onSelectDay(day)}
                                    className={clsx(
                                        styles.slotCell,
                                        isIndicative && styles.slotIndicative,
                                        isBlocking && styles.slotBlocking,
                                        isOpened && styles.slotOpened,
                                        !isIndicative &&
                                            !isBlocking &&
                                            !isOpened &&
                                            styles.slotDefault
                                    )}
                                >
                                    {content}
                                </div>
                            )
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Légende */}
            <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={clsx(styles.legendSwatch, styles.legendSwatchOpened)}></div>
                    <span>Ouvert</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={clsx(styles.legendSwatch, styles.legendSwatchCours)}></div>
                    <span>Cours</span>
                </div>
                <div className={styles.legendItem}>
                    <div
                        className={clsx(styles.legendSwatch, styles.legendSwatchEntrainement)}
                    ></div>
                    <span>Entraînement</span>
                </div>
            </div>
        </div>
    )
}
