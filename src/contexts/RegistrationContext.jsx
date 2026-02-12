import { createContext, useContext } from 'react'

const RegistrationContext = createContext(null)

export function RegistrationProvider({ modal, selectedDate, slotHelpers, calendarData, children }) {
    const value = {
        ...modal,
        selectedDate,
        // Fonctions de slotHelpers utilisees par les modals
        isUserParticipating: slotHelpers.isUserParticipating,
        getParticipants: slotHelpers.getParticipants,
        getEndTime: slotHelpers.getEndTime,
        getUserRegistration: slotHelpers.getUserRegistration,
        isUserOnSlot: slotHelpers.isUserOnSlot,
        getAvailableOpenDurations: slotHelpers.getAvailableOpenDurations,
        // Donnees de calendarData utilisees par les modals
        approvedMembers: calendarData.approvedMembers,
        totalTables: calendarData.totalTables,
    }
    return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export const useRegistration = () => useContext(RegistrationContext)
