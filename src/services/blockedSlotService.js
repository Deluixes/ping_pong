import { supabase } from '../lib/supabase'

export const blockedSlotService = {
    async getBlockedSlots() {
        const { data, error } = await supabase
            .from('blocked_slots')
            .select('*')
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching blocked slots:', error)
            return []
        }

        return data.map((s) => ({
            id: s.id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            group: s.group_name,
            coach: s.coach,
            name: s.name,
            enabled: s.enabled,
        }))
    },

    async createBlockedSlot(slot) {
        const { data, error } = await supabase
            .from('blocked_slots')
            .insert({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                group_name: slot.group || null,
                coach: slot.coach,
                name: slot.name,
                enabled: true,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating blocked slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    },

    async updateBlockedSlot(id, slot) {
        const { error } = await supabase
            .from('blocked_slots')
            .update({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                group_name: slot.group || null,
                coach: slot.coach,
                name: slot.name,
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    },

    async toggleBlockedSlot(id, enabled) {
        const { error } = await supabase.from('blocked_slots').update({ enabled }).eq('id', id)

        if (error) {
            console.error('Error toggling blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    },

    async deleteBlockedSlot(id) {
        const { error } = await supabase.from('blocked_slots').delete().eq('id', id)

        if (error) {
            console.error('Error deleting blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    },
}
