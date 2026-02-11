import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { startOfWeek, addDays } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
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
            <RegistrationModal
                modalStep={modal.modalStep}
                selectedSlotId={modal.selectedSlotId}
                selectedDate={selectedDate}
                selectedDuration={modal.selectedDuration}
                guests={modal.guests}
                approvedMembers={calendarData.approvedMembers}
                inviteOnlyMode={modal.inviteOnlyMode}
                availableDurations={modal.availableDurations}
                currentSlotAccepted={modal.currentSlotAccepted}
                isCurrentSlotOverbooked={modal.isCurrentSlotOverbooked}
                totalTables={calendarData.totalTables}
                isUserParticipating={slotHelpers.isUserParticipating}
                getParticipants={slotHelpers.getParticipants}
                getEndTime={slotHelpers.getEndTime}
                onDurationSelect={modal.handleDurationSelect}
                onModeChoice={modal.handleModeChoice}
                onSetModalStep={modal.setModalStep}
                onUpdateGuest={modal.updateGuest}
                onRemoveGuest={modal.removeGuest}
                onAddGuestField={modal.addGuestField}
                onRegister={modal.handleRegister}
                onClose={modal.closeModal}
            />

            {modal.showOpenSlotModal && (
                <OpenSlotModal
                    slotToOpen={modal.slotToOpen}
                    selectedDate={selectedDate}
                    selectedTarget={modal.selectedTarget}
                    selectedOpenDuration={modal.selectedOpenDuration}
                    availableOpenDurations={
                        modal.slotToOpen
                            ? slotHelpers.getAvailableOpenDurations(modal.slotToOpen)
                            : []
                    }
                    getEndTime={slotHelpers.getEndTime}
                    onSetSelectedTarget={modal.setSelectedTarget}
                    onSetSelectedOpenDuration={modal.setSelectedOpenDuration}
                    onOpenSlot={modal.handleOpenSlot}
                    onClose={() => modal.setShowOpenSlotModal(false)}
                />
            )}

            {modal.showActionChoice && (
                <ActionChoiceModal
                    selectedSlotId={modal.selectedSlotId}
                    selectedDate={selectedDate}
                    onShowParticipants={modal.handleShowParticipants}
                    onOpenInviteModal={modal.handleOpenInviteModal}
                    onClose={() => modal.setShowActionChoice(false)}
                />
            )}

            {modal.showParticipantsList && (
                <ParticipantsModal
                    selectedSlotId={modal.selectedSlotId}
                    selectedDate={selectedDate}
                    participantsToShow={modal.participantsToShow}
                    isUserRegistered={!!slotHelpers.getUserRegistration(modal.selectedSlotId)}
                    isUserOnSlot={slotHelpers.isUserOnSlot(modal.selectedSlotId)}
                    onRegister={() => {
                        modal.setShowParticipantsList(false)
                        modal.setSelectedDuration(null)
                        modal.setModalStep('duration')
                        modal.setInviteOnlyMode(false)
                    }}
                    onInviteOnly={() => {
                        modal.setShowParticipantsList(false)
                        modal.setSelectedDuration(null)
                        modal.setModalStep('duration')
                        modal.setInviteOnlyMode(true)
                    }}
                    onClose={() => modal.setShowParticipantsList(false)}
                />
            )}

            <CalendarNavigation
                weekStart={weekStart}
                selectedDate={selectedDate}
                weekDays={weekDays}
                viewMode={viewMode}
                isWeekConfigured={calendarData.isWeekConfigured}
                isCurrentWeek={slotHelpers.isCurrentWeek()}
                viewOptions={modal.getViewOptions()}
                getDayParticipantCount={slotHelpers.getDayParticipantCount}
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
                    onSelectDay={(day) => {
                        setSelectedDate(day)
                        setViewMode('occupied')
                    }}
                />
            ) : (
                <DayViewSlots
                    viewMode={viewMode}
                    userId={user.id}
                    isAdmin={isAdmin}
                    maxPersons={calendarData.maxPersons}
                    canReserveOnWeek={slotHelpers.canReserveOnWeek()}
                    getBlockedSlotInfo={slotHelpers.getBlockedSlotInfo}
                    isSlotInOpeningHours={slotHelpers.isSlotInOpeningHours}
                    isSlotAvailable={slotHelpers.isSlotAvailable}
                    canUserRegister={slotHelpers.canUserRegister}
                    isUserParticipating={slotHelpers.isUserParticipating}
                    getParticipants={slotHelpers.getParticipants}
                    getAcceptedParticipantCount={slotHelpers.getAcceptedParticipantCount}
                    getParticipantColor={slotHelpers.getParticipantColor}
                    getOpenedSlotInfo={slotHelpers.getOpenedSlotInfo}
                    onSlotClick={modal.handleSlotClick}
                    onUnregister={modal.handleUnregister}
                    onAdminDelete={modal.handleAdminDelete}
                    onCloseSlot={modal.handleCloseSlot}
                    onDeleteWeekSlot={modal.handleDeleteWeekSlot}
                />
            )}
        </div>
    )
}
