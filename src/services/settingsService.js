import { supabase } from '../lib/supabase'

export const settingsService = {
    async getSetting(key) {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error) {
            console.error('Error fetching setting:', error)
            return null
        }

        return data?.value
    },

    async updateSetting(key, value) {
        const { error } = await supabase
            .from('settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)

        if (error) {
            console.error('Error updating setting:', error)
            return { success: false }
        }

        return { success: true }
    },
}
