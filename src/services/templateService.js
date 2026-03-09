import { supabase } from '../lib/supabase'

export const templateService = {
    async getTemplates() {
        const { data, error } = await supabase
            .from('week_templates')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching templates:', error)
            return []
        }
        return data
    },

    async createTemplate(name) {
        const { data, error } = await supabase
            .from('week_templates')
            .insert({ name })
            .select()
            .single()

        if (error) {
            console.error('Error creating template:', error)
            return { success: false, error }
        }
        return { success: true, template: data }
    },

    async updateTemplate(id, name) {
        const { error } = await supabase.from('week_templates').update({ name }).eq('id', id)

        if (error) {
            console.error('Error updating template:', error)
            return { success: false }
        }
        return { success: true }
    },

    async deleteTemplate(id) {
        const { error } = await supabase.from('week_templates').delete().eq('id', id)

        if (error) {
            console.error('Error deleting template:', error)
            return { success: false }
        }
        return { success: true }
    },

    async getTemplateSlots(templateId) {
        const { data, error } = await supabase
            .from('template_slots')
            .select('*')
            .eq('template_id', templateId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching template slots:', error)
            return []
        }

        return data.map((s) => ({
            id: s.id,
            templateId: s.template_id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            name: s.name,
            coach: s.coach,
            group: s.group_name,
            isBlocking: s.is_blocking,
        }))
    },

    async createTemplateSlot(templateId, slot) {
        const { data, error } = await supabase
            .from('template_slots')
            .insert({
                template_id: templateId,
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                name: slot.name,
                coach: slot.coach || null,
                group_name: slot.group || null,
                is_blocking: slot.isBlocking !== false,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating template slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    },

    async updateTemplateSlot(id, slot) {
        const { error } = await supabase
            .from('template_slots')
            .update({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                name: slot.name,
                coach: slot.coach || null,
                group_name: slot.group || null,
                is_blocking: slot.isBlocking !== false,
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating template slot:', error)
            return { success: false }
        }
        return { success: true }
    },

    async deleteTemplateSlot(id) {
        const { error } = await supabase.from('template_slots').delete().eq('id', id)

        if (error) {
            console.error('Error deleting template slot:', error)
            return { success: false }
        }
        return { success: true }
    },

    async getTemplateHours(templateId) {
        const { data, error } = await supabase
            .from('template_hours')
            .select('*')
            .eq('template_id', templateId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching template hours:', error)
            return []
        }

        return data.map((h) => ({
            id: h.id,
            templateId: h.template_id,
            dayOfWeek: h.day_of_week,
            startTime: h.start_time,
            endTime: h.end_time,
        }))
    },

    async createTemplateHour(templateId, hour) {
        const { data, error } = await supabase
            .from('template_hours')
            .insert({
                template_id: templateId,
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime,
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating template hour:', error)
            return { success: false, error }
        }
        return { success: true, hour: data }
    },

    async updateTemplateHour(id, hour) {
        const { error } = await supabase
            .from('template_hours')
            .update({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime,
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating template hour:', error)
            return { success: false }
        }
        return { success: true }
    },

    async deleteTemplateHour(id) {
        const { error } = await supabase.from('template_hours').delete().eq('id', id)

        if (error) {
            console.error('Error deleting template hour:', error)
            return { success: false }
        }
        return { success: true }
    },
}
