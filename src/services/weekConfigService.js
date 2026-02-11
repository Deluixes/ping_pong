import { supabase } from '../lib/supabase'
import { timeToMinutes, slotsOverlap } from '../utils/time'
import { templateService } from './templateService'

export const weekConfigService = {
    async analyzeTemplateConflicts(templateId, weekStarts) {
        const [templateResult, templateSlots] = await Promise.all([
            supabase.from('week_templates').select('name').eq('id', templateId).single(),
            templateService.getTemplateSlots(templateId),
        ])

        if (!templateResult.data) {
            return { success: false, error: 'Template not found' }
        }

        const result = {
            templateName: templateResult.data.name,
            configuredWeeks: [],
            conflicts: [],
        }

        for (const weekStart of weekStarts) {
            const existingConfig = await weekConfigService.getWeekConfig(weekStart)

            if (existingConfig) {
                result.configuredWeeks.push({
                    weekStart,
                    templateName: existingConfig.templateName,
                })

                const weekStartDate = new Date(weekStart)
                const dates = []
                for (let i = 0; i < 7; i++) {
                    const d = new Date(weekStartDate)
                    d.setDate(d.getDate() + i)
                    dates.push(d.toISOString().split('T')[0])
                }

                const newSlots = templateSlots.map((slot) => {
                    const dateIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1
                    return {
                        date: dates[dateIndex],
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        name: slot.name,
                        dayOfWeek: slot.dayOfWeek,
                    }
                })

                const weekConflicts = []
                for (const newSlot of newSlots) {
                    for (const existingSlot of existingConfig.slots) {
                        if (slotsOverlap(newSlot, existingSlot)) {
                            weekConflicts.push({
                                weekStart,
                                newSlot: {
                                    date: newSlot.date,
                                    startTime: newSlot.startTime,
                                    endTime: newSlot.endTime,
                                    name: newSlot.name,
                                },
                                existingSlot: {
                                    date: existingSlot.date,
                                    startTime: existingSlot.startTime,
                                    endTime: existingSlot.endTime,
                                    name: existingSlot.name,
                                },
                            })
                            break
                        }
                    }
                }

                if (weekConflicts.length > 0) {
                    result.conflicts.push(...weekConflicts)
                }
            }
        }

        return {
            success: true,
            hasConfiguredWeeks: result.configuredWeeks.length > 0,
            ...result,
        }
    },

    async getWeekConfig(weekStart) {
        const { data: config, error } = await supabase
            .from('week_configs')
            .select('*')
            .eq('week_start', weekStart)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching week config:', error)
            return null
        }

        if (!config) return null

        const [slotsResult, hoursResult] = await Promise.all([
            supabase
                .from('week_slots')
                .select('*')
                .eq('week_config_id', config.id)
                .order('date')
                .order('start_time'),
            supabase
                .from('week_hours')
                .select('*')
                .eq('week_config_id', config.id)
                .order('date')
                .order('start_time'),
        ])

        return {
            id: config.id,
            weekStart: config.week_start,
            templateName: config.template_name,
            slots: (slotsResult.data || []).map((s) => ({
                id: s.id,
                date: s.date,
                startTime: s.start_time,
                endTime: s.end_time,
                name: s.name,
                coach: s.coach,
                group: s.group_name,
                isBlocking: s.is_blocking,
            })),
            hours: (hoursResult.data || []).map((h) => ({
                id: h.id,
                date: h.date,
                startTime: h.start_time,
                endTime: h.end_time,
            })),
        }
    },

    async isWeekConfigured(weekStart) {
        const { data, error } = await supabase
            .from('week_configs')
            .select('id')
            .eq('week_start', weekStart)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking week config:', error)
            return false
        }

        return !!data
    },

    async getConfiguredWeeks(startDate, endDate) {
        const { data, error } = await supabase
            .from('week_configs')
            .select('week_start, template_name')
            .gte('week_start', startDate)
            .lte('week_start', endDate)
            .order('week_start', { ascending: true })

        if (error) {
            console.error('Error fetching configured weeks:', error)
            return []
        }
        return data
    },

    async applyTemplateToWeeks(templateId, weekStarts, mode = 'overwrite') {
        const [templateResult, slotsResult, hoursResult] = await Promise.all([
            supabase.from('week_templates').select('name').eq('id', templateId).single(),
            templateService.getTemplateSlots(templateId),
            templateService.getTemplateHours(templateId),
        ])

        if (!templateResult.data) {
            return { success: false, error: 'Template not found' }
        }

        const templateName = templateResult.data.name
        const templateSlots = slotsResult
        const templateHours = hoursResult

        let totalDeleted = 0
        let skippedSlots = 0

        for (const weekStart of weekStarts) {
            let configId
            const existing = await weekConfigService.getWeekConfig(weekStart)
            let existingSlots = []
            let existingHours = []

            if (existing) {
                configId = existing.id
                existingSlots = existing.slots || []
                existingHours = existing.hours || []

                if (mode === 'overwrite') {
                    await Promise.all([
                        supabase.from('week_slots').delete().eq('week_config_id', existing.id),
                        supabase.from('week_hours').delete().eq('week_config_id', existing.id),
                    ])
                    existingSlots = []
                    existingHours = []
                    await supabase
                        .from('week_configs')
                        .update({ template_name: templateName })
                        .eq('id', configId)
                }
            } else {
                const { data: newConfig, error } = await supabase
                    .from('week_configs')
                    .insert({ week_start: weekStart, template_name: templateName })
                    .select()
                    .single()

                if (error) {
                    console.error('Error creating week config:', error)
                    continue
                }
                configId = newConfig.id
            }

            const weekStartDate = new Date(weekStart)
            const dates = []
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStartDate)
                d.setDate(d.getDate() + i)
                dates.push(d.toISOString().split('T')[0])
            }

            const newSlots = []
            for (const slot of templateSlots) {
                const dateIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1
                const newSlot = {
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: slot.startTime,
                    end_time: slot.endTime,
                    name: slot.name,
                    coach: slot.coach || null,
                    group_name: slot.group || null,
                    is_blocking: slot.isBlocking,
                }

                if (mode === 'merge' && existingSlots.length > 0) {
                    const hasConflict = existingSlots.some((existingSlot) =>
                        slotsOverlap(
                            {
                                date: newSlot.date,
                                startTime: newSlot.start_time,
                                endTime: newSlot.end_time,
                            },
                            existingSlot
                        )
                    )
                    if (hasConflict) {
                        skippedSlots++
                        continue
                    }
                }

                if (mode === 'merge_keep_new' && existingSlots.length > 0) {
                    const conflictingSlots = existingSlots.filter((existingSlot) =>
                        slotsOverlap(
                            {
                                date: newSlot.date,
                                startTime: newSlot.start_time,
                                endTime: newSlot.end_time,
                            },
                            existingSlot
                        )
                    )
                    for (const conflictSlot of conflictingSlots) {
                        await supabase.from('week_slots').delete().eq('id', conflictSlot.id)
                    }
                }

                newSlots.push(newSlot)
            }

            if (newSlots.length > 0) {
                await supabase.from('week_slots').insert(newSlots)
            }

            const newHours = []
            for (const hour of templateHours) {
                const dateIndex = hour.dayOfWeek === 0 ? 6 : hour.dayOfWeek - 1
                const newHour = {
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: hour.startTime,
                    end_time: hour.endTime,
                }

                if (mode === 'merge' && existingHours.length > 0) {
                    const hasConflict = existingHours.some((existingHour) =>
                        slotsOverlap(
                            {
                                date: newHour.date,
                                startTime: newHour.start_time,
                                endTime: newHour.end_time,
                            },
                            existingHour
                        )
                    )
                    if (hasConflict) {
                        continue
                    }
                }

                if (mode === 'merge_keep_new' && existingHours.length > 0) {
                    const conflictingHours = existingHours.filter((existingHour) =>
                        slotsOverlap(
                            {
                                date: newHour.date,
                                startTime: newHour.start_time,
                                endTime: newHour.end_time,
                            },
                            existingHour
                        )
                    )
                    for (const conflictHour of conflictingHours) {
                        await supabase.from('week_hours').delete().eq('id', conflictHour.id)
                    }
                }

                newHours.push(newHour)
            }

            if (newHours.length > 0) {
                await supabase.from('week_hours').insert(newHours)
            }

            const blockingSlots = newSlots.filter((s) => s.is_blocking)
            for (const slot of blockingSlots) {
                const { data: dayReservations } = await supabase
                    .from('reservations')
                    .select('id, slot_id')
                    .eq('date', slot.date)

                if (dayReservations && dayReservations.length > 0) {
                    const slotStartMinutes = timeToMinutes(slot.start_time)
                    const slotEndMinutes = timeToMinutes(slot.end_time)

                    const conflicting = dayReservations.filter((r) => {
                        const resMinutes = timeToMinutes(r.slot_id)
                        return resMinutes >= slotStartMinutes && resMinutes < slotEndMinutes
                    })

                    if (conflicting.length > 0) {
                        const ids = conflicting.map((r) => r.id)
                        await supabase.from('reservations').delete().in('id', ids)
                        totalDeleted += conflicting.length
                    }
                }
            }
        }

        return { success: true, deletedReservations: totalDeleted, skippedSlots }
    },

    async applyMultipleTemplatesToWeeks(templateIds, weekStarts) {
        if (!templateIds || templateIds.length === 0) {
            return { success: false, error: 'No templates provided' }
        }

        let totalDeleted = 0
        let totalSkipped = 0

        const firstResult = await weekConfigService.applyTemplateToWeeks(
            templateIds[0],
            weekStarts,
            'overwrite'
        )
        if (!firstResult.success) {
            return firstResult
        }
        totalDeleted += firstResult.deletedReservations || 0

        for (let i = 1; i < templateIds.length; i++) {
            const result = await weekConfigService.applyTemplateToWeeks(
                templateIds[i],
                weekStarts,
                'merge'
            )
            if (!result.success) {
                return result
            }
            totalDeleted += result.deletedReservations || 0
            totalSkipped += result.skippedSlots || 0
        }

        return { success: true, deletedReservations: totalDeleted, skippedSlots: totalSkipped }
    },

    async deleteWeekSlot(id) {
        const { error } = await supabase.from('week_slots').delete().eq('id', id)

        if (error) {
            console.error('Error deleting week slot:', error)
            return { success: false }
        }
        return { success: true }
    },

    async addWeekSlot(weekConfigId, slot) {
        const { data, error } = await supabase
            .from('week_slots')
            .insert({
                week_config_id: weekConfigId,
                date: slot.date,
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
            console.error('Error adding week slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    },

    async getWeekSlots(weekStart) {
        const config = await weekConfigService.getWeekConfig(weekStart)
        if (!config) return []
        return config.slots
    },

    async getWeekHours(weekStart) {
        const config = await weekConfigService.getWeekConfig(weekStart)
        if (!config) return []
        return config.hours
    },

    async deleteWeekConfig(weekStart) {
        const { error } = await supabase.from('week_configs').delete().eq('week_start', weekStart)

        if (error) {
            console.error('Error deleting week config:', error)
            return { success: false }
        }
        return { success: true }
    },
}
