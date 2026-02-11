import { supabase } from '../lib/supabase'

export const profilePhotoService = {
    async uploadProfilePhoto(userId, file) {
        try {
            const fileExt = file.name.split('.').pop().toLowerCase()
            const fileName = `${userId}/avatar.${fileExt}`

            const { data: files } = await supabase.storage.from('profile-photos').list(userId)

            if (files && files.length > 0) {
                const filesToRemove = files.map((f) => `${userId}/${f.name}`)
                await supabase.storage.from('profile-photos').remove(filesToRemove)
            }

            const { error: uploadError } = await supabase.storage
                .from('profile-photos')
                .upload(fileName, file, { upsert: true })

            if (uploadError) {
                console.error('Error uploading photo:', uploadError)
                return { success: false, error: uploadError.message }
            }

            const {
                data: { publicUrl },
            } = supabase.storage.from('profile-photos').getPublicUrl(fileName)

            const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`

            const { error: updateError } = await supabase
                .from('members')
                .update({ profile_photo_url: urlWithTimestamp })
                .eq('user_id', userId)

            if (updateError) {
                console.error('Error updating member photo URL:', updateError)
                return { success: false, error: updateError.message }
            }

            return { success: true, url: urlWithTimestamp }
        } catch (error) {
            console.error('Error in uploadProfilePhoto:', error)
            return { success: false, error: error.message }
        }
    },

    async deleteProfilePhoto(userId) {
        try {
            const { data: files } = await supabase.storage.from('profile-photos').list(userId)

            if (files && files.length > 0) {
                const filesToRemove = files.map((f) => `${userId}/${f.name}`)
                await supabase.storage.from('profile-photos').remove(filesToRemove)
            }

            const { error } = await supabase
                .from('members')
                .update({ profile_photo_url: null })
                .eq('user_id', userId)

            if (error) {
                console.error('Error clearing photo URL:', error)
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            console.error('Error in deleteProfilePhoto:', error)
            return { success: false, error: error.message }
        }
    },

    async getProfilePhotoUrl(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('profile_photo_url')
            .eq('user_id', userId)
            .single()

        if (error || !data) return null
        return data.profile_photo_url
    },
}
