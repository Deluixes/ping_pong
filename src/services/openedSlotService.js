import { supabase } from '../lib/supabase'

export function mapOpenedSlotRow(r) {
    return {
        id: r.id,
        date: r.date,
        slotId: r.slot_id,
        openedBy: r.opened_by,
        target: r.target,
        createdAt: r.created_at,
    }
}

export const openedSlotService = {
    async getOpenedSlotsForWeek(startDate, endDate) {
        const { data, error } = await supabase
            .from('opened_slots')
            .select('date')
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) {
            console.error('Error fetching opened slots for week:', error)
            return []
        }

        return [...new Set(data.map((s) => s.date))]
    },

    async getOpenedSlotsForWeekFull(startDate, endDate) {
        const { data, error } = await supabase
            .from('opened_slots')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) {
            console.error('Error fetching opened slots for week (full):', error)
            return []
        }

        return data.map(mapOpenedSlotRow)
    },

    async getOpenedSlotsForDate(date) {
        const { data, error } = await supabase.from('opened_slots').select('*').eq('date', date)

        if (error) {
            console.error('Error fetching opened slots:', error)
            return []
        }

        return data.map(mapOpenedSlotRow)
    },

    async openSlot(date, slotId, openedBy, target = 'all') {
        const { data, error } = await supabase
            .from('opened_slots')
            .insert({
                date: date,
                slot_id: slotId,
                opened_by: openedBy,
                target: target,
            })
            .select()
            .single()

        if (error) {
            console.error('Error opening slot:', error)
            return { success: false, error }
        }

        return { success: true, slot: data }
    },

    async closeSlot(date, slotId) {
        const { error } = await supabase
            .from('opened_slots')
            .delete()
            .eq('date', date)
            .eq('slot_id', slotId)

        if (error) {
            console.error('Error closing slot:', error)
            return { success: false }
        }

        return { success: true }
    },

    async updateOpenedSlotTarget(id, target) {
        const { error } = await supabase.from('opened_slots').update({ target }).eq('id', id)

        if (error) {
            console.error('Error updating opened slot target:', error)
            return { success: false }
        }

        return { success: true }
    },
}
