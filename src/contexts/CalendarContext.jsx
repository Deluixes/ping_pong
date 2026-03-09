import { createContext, useContext } from 'react'

const CalendarContext = createContext(null)

export function CalendarProvider({ value, children }) {
    return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export const useCalendar = () => useContext(CalendarContext)
