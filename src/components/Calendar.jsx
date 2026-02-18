import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { startOfWeek, addDays } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { CalendarProvider } from '../contexts/CalendarContext'
import { RegistrationProvider } from '../contexts/RegistrationContext'
import { useCalendarData } from '../hooks/useCalendarData'
import { useSlotHelpers } from '../hooks/useSlotHelpers'
import { useRegistrationModal } from '../hooks/useRegistrationModal'

import RegistrationModal from './calendar/RegistrationModal'
import OpenSlotModal from './calendar/OpenSlotModal'
import ActionChoiceModal from './calendar/ActionChoiceModal'
import ParticipantsModal from './calendar/ParticipantsModal'
import CalendarNavigation from './calendar/CalendarNavigation'
import WeekViewGrid from './calendar/WeekViewGrid'
import DayViewSlots from './calendar/DayViewSlots'
import styles from './Calendar.module.css'

export default function Calendar() {
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const [selectedDate, setSelectedDate] = useState(() => {
        const dateParam = searchParams.get('date')
        if (dateParam) {
            const parsed = new Date(dateParam)
            if (!isNaN(parsed.getTime())) {
                return parsed
            }
        }
        return new Date()
    })
    const [weekStart, setWeekStart] = useState(() => startOfWeek(selectedDate, { weekStartsOn: 1 }))
    const [viewMode, setViewMode] = useState('occupied')

    // Nettoyer les searchParams au montage
    useEffect(() => {
        const dateParam = searchParams.get('date')
        const slotParam = searchParams.get('slot')
        if (dateParam || slotParam) {
            setSearchParams({}, { replace: true })
        }
    }, [])

    // Navigation semaine
    const nextWeek = () => {
        setWeekStart((d) => addDays(d, 7))
        setSelectedDate((d) => addDays(d, 7))
    }
    const prevWeek = () => {
        setWeekStart((d) => addDays(d, -7))
        setSelectedDate((d) => addDays(d, -7))
    }

    const weekDays = []
    for (let i = 0; i < 7; i++) {
        weekDays.push(addDays(weekStart, i))
    }

    // Hooks extraits
    const calendarData = useCalendarData(user, selectedDate, weekStart)
    const slotHelpers = useSlotHelpers({
        events: calendarData.events,
        selectedDate,
        weekSlots: calendarData.weekSlots,
        weekHours: calendarData.weekHours,
        isWeekConfigured: calendarData.isWeekConfigured,
        openedSlots: calendarData.openedSlots,
        invitations: calendarData.invitations,
        maxPersons: calendarData.maxPersons,
        user,
    })
    const modal = useRegistrationModal({ user, selectedDate, slotHelpers, calendarData })

    const isAdmin = user?.isAdmin

    // Combine opened slots + week slots non-bloquants pour colorer les jours
    const daysWithSlots = useMemo(() => {
        const dates = new Set(calendarData.daysWithOpenedSlots)
        for (const ws of calendarData.weekSlots) {
            if (ws.date && !ws.isBlocking) dates.add(ws.date)
        }
        return [...dates]
    }, [calendarData.daysWithOpenedSlots, calendarData.weekSlots])

    const calendarCtx = useMemo(
        () => ({
            viewMode,
            userId: user.id,
            isAdmin,
            maxPersons: calendarData.maxPersons,
            canReserveOnWeek: slotHelpers.canReserveOnWeek(),
            getBlockedSlotInfo: slotHelpers.getBlockedSlotInfo,
            isSlotInOpeningHours: slotHelpers.isSlotInOpeningHours,
            isSlotAvailable: slotHelpers.isSlotAvailable,
            canUserRegister: slotHelpers.canUserRegister,
            isUserParticipating: slotHelpers.isUserParticipating,
            getParticipants: slotHelpers.getParticipants,
            getAcceptedParticipantCount: slotHelpers.getAcceptedParticipantCount,
            getParticipantColor: slotHelpers.getParticipantColor,
            getOpenedSlotInfo: slotHelpers.getOpenedSlotInfo,
            isUserOnSlot: slotHelpers.isUserOnSlot,
            onSlotClick: modal.handleSlotClick,
            onUnregister: modal.handleUnregister,
            onAdminDelete: modal.handleAdminDelete,
            onCloseSlot: modal.handleCloseSlot,
            onDeleteWeekSlot: modal.handleDeleteWeekSlot,
            onAcceptInvitation: modal.handleAcceptInvitation,
            onDeclineInvitation: modal.handleDeclineInvitation,
            onShowParticipants: modal.handleShowParticipants,
        }),
        [viewMode, user.id, isAdmin, calendarData.maxPersons, slotHelpers, modal]
    )

    // ==================== RENDER ====================

    if (calendarData.loading) {
        return (
            <div className={styles.loading}>
                <p>Chargement du planning...</p>
                <button
                    onClick={() => window.location.reload()}
                    className={`btn ${styles.reloadBtn}`}
                >
                    Recharger la page
                </button>
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            <RegistrationProvider
                modal={modal}
                selectedDate={selectedDate}
                slotHelpers={slotHelpers}
                calendarData={calendarData}
            >
                <RegistrationModal />
                <OpenSlotModal />
                <ActionChoiceModal />
                <ParticipantsModal />
            </RegistrationProvider>

            <CalendarNavigation
                weekStart={weekStart}
                selectedDate={selectedDate}
                weekDays={weekDays}
                viewMode={viewMode}
                isWeekConfigured={calendarData.isWeekConfigured}
                isCurrentWeek={slotHelpers.isCurrentWeek()}
                viewOptions={modal.getViewOptions()}
                daysWithSlots={daysWithSlots}
                onPrevWeek={prevWeek}
                onNextWeek={nextWeek}
                onSelectDate={setSelectedDate}
                onSetViewMode={setViewMode}
            />

            {viewMode === 'week' ? (
                <WeekViewGrid
                    weekStart={weekStart}
                    selectedDate={selectedDate}
                    weekSlots={calendarData.weekSlots}
                    openedSlots={calendarData.openedSlots}
                    daysWithSlots={daysWithSlots}
                    onSelectDay={(day) => {
                        setSelectedDate(day)
                        setViewMode('occupied')
                    }}
                />
            ) : (
                <CalendarProvider value={calendarCtx}>
                    <DayViewSlots />
                </CalendarProvider>
            )}
        </div>
    )
}
