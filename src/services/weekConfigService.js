import { supabase } from '../lib/supabase'
import { timeToMinutes, slotsOverlap } from '../utils/time'
import { templateService } from './templateService'

// ==================== Helpers pour applyTemplateToWeeks ====================

function buildWeekDates(weekStart) {
    const weekStartDate = new Date(weekStart)
    const dates = []
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStartDate)
        d.setDate(d.getDate() + i)
        dates.push(d.toISOString().split('T')[0])
    }
    return dates
}

function templateItemToDbRow(item, configId, dates, isSlot) {
    const dateIndex = item.dayOfWeek === 0 ? 6 : item.dayOfWeek - 1
    const row = {
        week_config_id: configId,
        date: dates[dateIndex],
        start_time: item.startTime,
        end_time: item.endTime,
    }
    if (isSlot) {
        row.name = item.name
        row.coach = item.coach || null
        row.group_name = item.group || null
        row.is_blocking = item.isBlocking
    }
    return row
}

function filterByMode(dbRows, mode, existingItems) {
    const kept = []
    let skipped = 0
    const toDelete = []

    for (const row of dbRows) {
        const asOverlap = { date: row.date, startTime: row.start_time, endTime: row.end_time }

        if (mode === 'merge' && existingItems.length > 0) {
            if (existingItems.some((existing) => slotsOverlap(asOverlap, existing))) {
                skipped++
                continue
            }
        }

        if (mode === 'merge_keep_new' && existingItems.length > 0) {
            toDelete.push(...existingItems.filter((existing) => slotsOverlap(asOverlap, existing)))
        }

        kept.push(row)
    }

    return { kept, skipped, toDelete }
}

async function deleteByIds(table, items) {
    if (items.length === 0) return
    await supabase
        .from(table)
        .delete()
        .in(
            'id',
            items.map((item) => item.id)
        )
}

async function cleanupBlockedReservations(blockingSlots) {
    if (blockingSlots.length === 0) return 0

    // Grouper par date pour faire un seul SELECT/DELETE par date
    const byDate = {}
    for (const slot of blockingSlots) {
        if (!byDate[slot.date]) byDate[slot.date] = []
        byDate[slot.date].push(slot)
    }

    const results = await Promise.all(
        Object.entries(byDate).map(async ([date, slots]) => {
            const { data: dayReservations } = await supabase
                .from('reservations')
                .select('id, slot_id')
                .eq('date', date)

            if (!dayReservations || dayReservations.length === 0) return 0

            const conflictingIds = []
            for (const r of dayReservations) {
                const resMinutes = timeToMinutes(r.slot_id)
                for (const slot of slots) {
                    if (
                        resMinutes >= timeToMinutes(slot.start_time) &&
                        resMinutes < timeToMinutes(slot.end_time)
                    ) {
                        conflictingIds.push(r.id)
                        break
                    }
                }
            }

            if (conflictingIds.length > 0) {
                await supabase.from('reservations').delete().in('id', conflictingIds)
                return conflictingIds.length
            }
            return 0
        })
    )

    return results.reduce((sum, n) => sum + n, 0)
}

async function getOrCreateWeekConfig(weekStart, templateName, mode) {
    const existing = await weekConfigService.getWeekConfig(weekStart)

    if (existing) {
        if (mode === 'overwrite') {
            await Promise.all([
                supabase.from('week_slots').delete().eq('week_config_id', existing.id),
                supabase.from('week_hours').delete().eq('week_config_id', existing.id),
            ])
            await supabase
                .from('week_configs')
                .update({ template_name: templateName })
                .eq('id', existing.id)
            return { configId: existing.id, existingSlots: [], existingHours: [] }
        }
        return {
            configId: existing.id,
            existingSlots: existing.slots || [],
            existingHours: existing.hours || [],
        }
    }

    const { data: newConfig, error } = await supabase
        .from('week_configs')
        .insert({ week_start: weekStart, template_name: templateName })
        .select()
        .single()

    if (error) {
        console.error('Error creating week config:', error)
        return null
    }

    return { configId: newConfig.id, existingSlots: [], existingHours: [] }
}

// ==================== Service ====================

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

                const dates = buildWeekDates(weekStart)

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
        const [templateResult, templateSlots, templateHours] = await Promise.all([
            supabase.from('week_templates').select('name').eq('id', templateId).single(),
            templateService.getTemplateSlots(templateId),
            templateService.getTemplateHours(templateId),
        ])

        if (!templateResult.data) {
            return { success: false, error: 'Template not found' }
        }

        const templateName = templateResult.data.name
        let totalDeleted = 0
        let skippedSlots = 0

        for (const weekStart of weekStarts) {
            const weekConfig = await getOrCreateWeekConfig(weekStart, templateName, mode)
            if (!weekConfig) continue

            const { configId, existingSlots, existingHours } = weekConfig
            const dates = buildWeekDates(weekStart)

            // Slots & Hours (parallel - tables indépendantes)
            const slotRows = templateSlots.map((s) => templateItemToDbRow(s, configId, dates, true))
            const slotsResult = filterByMode(slotRows, mode, existingSlots)
            skippedSlots += slotsResult.skipped

            const hourRows = templateHours.map((h) =>
                templateItemToDbRow(h, configId, dates, false)
            )
            const hoursResult = filterByMode(hourRows, mode, existingHours)

            await Promise.all([
                deleteByIds('week_slots', slotsResult.toDelete),
                deleteByIds('week_hours', hoursResult.toDelete),
            ])
            await Promise.all([
                slotsResult.kept.length > 0
                    ? supabase.from('week_slots').insert(slotsResult.kept)
                    : Promise.resolve(),
                hoursResult.kept.length > 0
                    ? supabase.from('week_hours').insert(hoursResult.kept)
                    : Promise.resolve(),
            ])

            // Cleanup reservations conflicting with blocking slots
            const blockingSlots = slotsResult.kept.filter((s) => s.is_blocking)
            totalDeleted += await cleanupBlockedReservations(blockingSlots)
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
