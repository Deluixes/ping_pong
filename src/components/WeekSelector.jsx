import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { startOfWeek, addWeeks, addMonths, format, isSameWeek, isBefore } from 'date-fns'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { X, RefreshCw, Calendar } from 'lucide-react'
import TemplatePriorityList from './TemplatePriorityList'
import WeekCalendarGrid from './WeekCalendarGrid'
import ModeChoiceDialog from './ModeChoiceDialog'
import ConflictWarningDialog from './ConflictWarningDialog'
import styles from './WeekSelector.module.css'

export default function WeekSelector({ templates, onClose }) {
    const { addToast } = useToast()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedWeeks, setSelectedWeeks] = useState([])
    // Multi-template selection: array of template IDs in priority order (first = highest priority)
    const [selectedTemplates, setSelectedTemplates] = useState([])
    const [configuredWeeks, setConfiguredWeeks] = useState([])
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)

    // Dialog de confirmation
    const [showModeDialog, setShowModeDialog] = useState(false)
    const [conflictAnalysis, setConflictAnalysis] = useState(null)
    const [showConflictWarning, setShowConflictWarning] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [selectedMode, setSelectedMode] = useState(null)

    useEffect(() => {
        loadConfiguredWeeks()
    }, [currentMonth])

    const loadConfiguredWeeks = async () => {
        setLoading(true)
        const startDate = format(
            startOfWeek(addMonths(currentMonth, -1), { weekStartsOn: 1 }),
            'yyyy-MM-dd'
        )
        const endDate = format(
            startOfWeek(addMonths(currentMonth, 2), { weekStartsOn: 1 }),
            'yyyy-MM-dd'
        )
        const configs = await storageService.getConfiguredWeeks(startDate, endDate)
        setConfiguredWeeks(configs.map((c) => c.week_start))
        setLoading(false)
    }

    const getWeeksInMonth = () => {
        const weeks = []
        let weekStart = startOfWeek(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            { weekStartsOn: 1 }
        )
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        while (
            isBefore(weekStart, monthEnd) ||
            isSameWeek(weekStart, monthEnd, { weekStartsOn: 1 })
        ) {
            weeks.push(weekStart)
            weekStart = addWeeks(weekStart, 1)
        }

        return weeks
    }

    const toggleWeek = (weekStart) => {
        const weekStr = format(weekStart, 'yyyy-MM-dd')
        if (selectedWeeks.includes(weekStr)) {
            setSelectedWeeks((prev) => prev.filter((w) => w !== weekStr))
        } else {
            setSelectedWeeks((prev) => [...prev, weekStr])
        }
    }

    // Vérifie si des semaines configurées sont sélectionnées
    const hasConfiguredWeeksSelected = () => {
        return selectedWeeks.some((w) => configuredWeeks.includes(w))
    }

    // Fonctions pour gérer la sélection multiple de templates
    const addTemplate = (templateId) => {
        if (!templateId || selectedTemplates.includes(templateId)) return
        setSelectedTemplates((prev) => [...prev, templateId])
    }

    const removeTemplate = (templateId) => {
        setSelectedTemplates((prev) => prev.filter((id) => id !== templateId))
    }

    const moveTemplateUp = (index) => {
        if (index === 0) return
        setSelectedTemplates((prev) => {
            const newList = [...prev]
            ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
            return newList
        })
    }

    const moveTemplateDown = (index) => {
        if (index === selectedTemplates.length - 1) return
        setSelectedTemplates((prev) => {
            const newList = [...prev]
            ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
            return newList
        })
    }

    // Appelé quand on clique sur "Appliquer"
    const handleApplyClick = async () => {
        if (selectedTemplates.length === 0 || selectedWeeks.length === 0) return

        // Si des semaines sont déjà configurées, analyser les conflits et afficher le dialog
        if (hasConfiguredWeeksSelected()) {
            setAnalyzing(true)
            const analysis = await storageService.analyzeTemplateConflicts(
                selectedTemplates[0],
                selectedWeeks
            )
            setConflictAnalysis(analysis)
            setAnalyzing(false)
            setShowModeDialog(true)
        } else {
            // Pas de semaines configurées, appliquer directement
            await executeApply('overwrite')
        }
    }

    // Appelé depuis le dialog de mode
    const handleModeSelect = async (mode) => {
        setShowModeDialog(false)

        if (mode === 'cancel') {
            return
        }

        // Si mode merge ou merge_keep_new et des conflits existent, afficher le warning
        if (
            (mode === 'merge' || mode === 'merge_keep_new') &&
            conflictAnalysis?.conflicts?.length > 0
        ) {
            setSelectedMode(mode)
            setShowConflictWarning(true)
        } else {
            await executeApply(mode)
        }
    }

    // Exécute l'application avec le mode choisi
    const executeApply = async (mode) => {
        setShowConflictWarning(false)
        setApplying(true)

        let result
        if (selectedTemplates.length === 1) {
            result = await storageService.applyTemplateToWeeks(
                selectedTemplates[0],
                selectedWeeks,
                mode
            )
        } else {
            result = await storageService.applyMultipleTemplatesToWeeks(
                selectedTemplates,
                selectedWeeks
            )
        }

        if (result.success) {
            let message = `${selectedTemplates.length} template(s) appliqué(s) à ${selectedWeeks.length} semaine(s)`
            if (result.deletedReservations > 0) {
                message += `\n${result.deletedReservations} réservation(s) supprimée(s) (conflit avec créneaux bloquants)`
            }
            if (result.skippedSlots > 0) {
                message += `\n${result.skippedSlots} créneau(x) ignoré(s) (chevauchement entre templates)`
            }
            addToast(message, 'success')
            await loadConfiguredWeeks()
            setSelectedWeeks([])
            setSelectedTemplates([])
        } else {
            addToast("Erreur lors de l'application des templates", 'error')
        }

        setApplying(false)
        setConflictAnalysis(null)
    }

    const selectAllVisible = () => {
        const weeks = getWeeksInMonth()
        const weekStrs = weeks.map((w) => format(w, 'yyyy-MM-dd'))
        setSelectedWeeks((prev) => {
            const newSet = new Set(prev)
            weekStrs.forEach((w) => newSet.add(w))
            return Array.from(newSet)
        })
    }

    const clearSelection = () => {
        setSelectedWeeks([])
    }

    const weeks = getWeeksInMonth()

    return (
        <>
            <div className={clsx('modal-overlay', styles.overlay)}>
                <div className={styles.dialog}>
                    {/* Header */}
                    <div className={styles.header}>
                        <h3 className={styles.headerTitle}>Appliquer des templates</h3>
                        <button onClick={onClose} className={styles.closeBtn}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className={styles.body}>
                        <TemplatePriorityList
                            templates={templates}
                            selectedTemplates={selectedTemplates}
                            onAdd={addTemplate}
                            onRemove={removeTemplate}
                            onMoveUp={moveTemplateUp}
                            onMoveDown={moveTemplateDown}
                        />

                        <WeekCalendarGrid
                            currentMonth={currentMonth}
                            weeks={weeks}
                            configuredWeeks={configuredWeeks}
                            selectedWeeks={selectedWeeks}
                            loading={loading}
                            onPrevMonth={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                            onNextMonth={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                            onToggleWeek={toggleWeek}
                            onSelectAll={selectAllVisible}
                            onClearSelection={clearSelection}
                        />

                        {/* Info warning */}
                        {hasConfiguredWeeksSelected() && (
                            <div className={styles.configWarning}>
                                Certaines semaines sélectionnées sont déjà configurées. Vous pourrez
                                choisir d'écraser ou de fusionner.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={styles.footer}>
                        <button onClick={onClose} className={clsx('btn', styles.footerBtnCancel)}>
                            Annuler
                        </button>
                        <button
                            onClick={handleApplyClick}
                            className={clsx('btn', 'btn-primary', styles.footerBtnApply)}
                            disabled={
                                applying ||
                                analyzing ||
                                selectedTemplates.length === 0 ||
                                selectedWeeks.length === 0
                            }
                        >
                            {applying ? (
                                <>
                                    <RefreshCw size={18} className="spin" />
                                    Application...
                                </>
                            ) : analyzing ? (
                                <>
                                    <RefreshCw size={18} className="spin" />
                                    Analyse...
                                </>
                            ) : (
                                <>
                                    <Calendar size={18} />
                                    Appliquer
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <ModeChoiceDialog
                visible={showModeDialog}
                conflictAnalysis={conflictAnalysis}
                onSelect={handleModeSelect}
            />

            <ConflictWarningDialog
                visible={showConflictWarning}
                conflicts={conflictAnalysis?.conflicts}
                selectedMode={selectedMode}
                onCancel={() => setShowConflictWarning(false)}
                onContinue={() => executeApply(selectedMode)}
            />
        </>
    )
}
