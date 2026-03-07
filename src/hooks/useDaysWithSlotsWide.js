import { useState, useEffect, useRef, useCallback } from 'react'
import { format, addDays } from 'date-fns'
import { storageService } from '../services/storage'

const RANGE_DAYS = 56 // 8 weeks before/after
const REFETCH_THRESHOLD_DAYS = 14 // re-fetch if center moved > 2 weeks

export function useDaysWithSlotsWide(selectedDate) {
    const [wideDays, setWideDays] = useState([])
    const lastCenterRef = useRef(null)

    const fetchWideDays = useCallback(async (centerDate) => {
        const startDate = format(addDays(centerDate, -RANGE_DAYS), 'yyyy-MM-dd')
        const endDate = format(addDays(centerDate, RANGE_DAYS), 'yyyy-MM-dd')

        const [openedDates, weekSlotDates] = await Promise.all([
            storageService.getOpenedSlotsForWeek(startDate, endDate),
            storageService.getWeekSlotDates(startDate, endDate),
        ])

        const merged = new Set([...openedDates, ...weekSlotDates])
        setWideDays([...merged])
        lastCenterRef.current = centerDate
    }, [])

    useEffect(() => {
        const last = lastCenterRef.current
        if (!last) {
            fetchWideDays(selectedDate)
            return
        }

        const daysDiff = Math.abs((selectedDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        if (daysDiff > REFETCH_THRESHOLD_DAYS) {
            fetchWideDays(selectedDate)
        }
    }, [selectedDate, fetchWideDays])

    return wideDays
}
