import { supabase } from '../lib/supabase'

export const openingHourService = {
    async getOpeningHours() {
        const { data, error } = await supabase
            .from('opening_hours')
            .select('*')
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching opening hours:', error)
            return []
        }

        return data.map((h) => ({
            id: h.id,
            dayOfWeek: h.day_of_week,
            startTime: h.start_time,
            endTime: h.end_time,
            enabled: h.enabled,
        }))
    },

    async createOpeningHour(hour) {
        const { data, error } = await supabase
            .from('opening_hours')
            .insert({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime,
                enabled: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating opening hour:', error)
            return { success: false, error }
        }
        return { success: true, hour: data }
    },

    async updateOpeningHour(id, hour) {
        const { error } = await supabase
            .from('opening_hours')
            .update({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime,
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating opening hour:', error)
            return { success: false }
        }
        return { success: true }
    },

    async toggleOpeningHour(id, enabled) {
        const { error } = await supabase.from('opening_hours').update({ enabled }).eq('id', id)

        if (error) {
            console.error('Error toggling opening hour:', error)
            return { success: false }
        }
        return { success: true }
    },

    async deleteOpeningHour(id) {
        const { error } = await supabase.from('opening_hours').delete().eq('id', id)

        if (error) {
            console.error('Error deleting opening hour:', error)
            return { success: false }
        }
        return { success: true }
    },
}
