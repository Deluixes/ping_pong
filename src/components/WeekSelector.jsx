import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import {
    startOfWeek,
    addWeeks,
    addMonths,
    format,
    isSameWeek,
    isBefore,
    startOfDay,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import {
    ChevronLeft,
    ChevronRight,
    Check,
    X,
    RefreshCw,
    Calendar,
    AlertTriangle,
    ChevronUp,
    ChevronDown,
    Layers,
    Plus,
    Trash2,
} from 'lucide-react'
import { DAYS_FR } from '../constants'
import styles from './WeekSelector.module.css'

export default function WeekSelector({ templates, onClose }) {
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

    const today = startOfDay(new Date())

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

    const isWeekSelected = (weekStart) => {
        const weekStr = format(weekStart, 'yyyy-MM-dd')
        return selectedWeeks.includes(weekStr)
    }

    const isWeekConfigured = (weekStart) => {
        const weekStr = format(weekStart, 'yyyy-MM-dd')
        return configuredWeeks.includes(weekStr)
    }

    const isCurrentWeek = (weekStart) => {
        return isSameWeek(weekStart, today, { weekStartsOn: 1 })
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

    const getTemplateName = (templateId) => {
        const template = templates.find((t) => t.id === templateId)
        return template?.name || 'Inconnu'
    }

    const getAvailableTemplates = () => {
        return templates.filter((t) => !selectedTemplates.includes(t.id))
    }

    // Appelé quand on clique sur "Appliquer"
    const handleApplyClick = async () => {
        if (selectedTemplates.length === 0 || selectedWeeks.length === 0) return

        // Si des semaines sont déjà configurées, analyser les conflits et afficher le dialog
        if (hasConfiguredWeeksSelected()) {
            setAnalyzing(true)
            // Analyser les conflits avec le premier template (le plus prioritaire)
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
            // Un seul template : utiliser la méthode classique
            result = await storageService.applyTemplateToWeeks(
                selectedTemplates[0],
                selectedWeeks,
                mode
            )
        } else {
            // Plusieurs templates : utiliser la méthode multi-templates
            // Note: le mode est toujours "overwrite" pour le premier template,
            // puis "merge" pour les suivants (priorité au premier)
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
            alert(message)
            await loadConfiguredWeeks()
            setSelectedWeeks([])
            setSelectedTemplates([])
        } else {
            alert("Erreur lors de l'application des templates")
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

    // Formater un conflit pour l'affichage
    const formatConflict = (conflict) => {
        // Utiliser format de date-fns pour éviter les problèmes de fuseau horaire
        const [year, month, day] = conflict.newSlot.date.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const dayName = DAYS_FR[date.getDay()]
        return `${dayName} ${conflict.newSlot.startTime.slice(0, 5)}-${conflict.newSlot.endTime.slice(0, 5)} "${conflict.newSlot.name || 'Sans nom'}"`
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
                        {/* Template selection - Multi-select with priority */}
                        <div className={styles.templateSection}>
                            <label className={styles.templateLabel}>
                                Templates à appliquer (par ordre de priorité)
                            </label>

                            {/* Liste des templates sélectionnés avec ordre */}
                            {selectedTemplates.length > 0 && (
                                <div className={styles.templateList}>
                                    {selectedTemplates.map((templateId, index) => (
                                        <div
                                            key={templateId}
                                            className={clsx(
                                                styles.templateItem,
                                                index === 0
                                                    ? styles.templateItemFirst
                                                    : styles.templateItemOther,
                                                index < selectedTemplates.length - 1 &&
                                                    styles.templateItemBorder
                                            )}
                                        >
                                            {/* Priority badge */}
                                            <span
                                                className={clsx(
                                                    styles.priorityBadge,
                                                    index === 0
                                                        ? styles.priorityBadgeFirst
                                                        : styles.priorityBadgeOther
                                                )}
                                            >
                                                {index + 1}
                                            </span>

                                            {/* Template name */}
                                            <div className={styles.templateName}>
                                                <span
                                                    className={
                                                        index === 0
                                                            ? styles.templateNameTextFirst
                                                            : styles.templateNameTextOther
                                                    }
                                                >
                                                    {getTemplateName(templateId)}
                                                </span>
                                                {index === 0 && (
                                                    <span className={styles.priorityLabel}>
                                                        (Priorité max)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Move buttons */}
                                            <div className={styles.actionButtons}>
                                                <button
                                                    onClick={() => moveTemplateUp(index)}
                                                    disabled={index === 0}
                                                    className={clsx(
                                                        styles.moveBtn,
                                                        index === 0
                                                            ? styles.moveBtnDisabled
                                                            : styles.moveBtnEnabled
                                                    )}
                                                    title="Monter (plus prioritaire)"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => moveTemplateDown(index)}
                                                    disabled={
                                                        index === selectedTemplates.length - 1
                                                    }
                                                    className={clsx(
                                                        styles.moveBtn,
                                                        index === selectedTemplates.length - 1
                                                            ? styles.moveBtnDisabled
                                                            : styles.moveBtnEnabled
                                                    )}
                                                    title="Descendre (moins prioritaire)"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => removeTemplate(templateId)}
                                                    className={styles.removeBtn}
                                                    title="Retirer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add template dropdown */}
                            {getAvailableTemplates().length > 0 && (
                                <div className={styles.addTemplateRow}>
                                    <select
                                        id="template-select"
                                        className={styles.templateSelect}
                                        defaultValue=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addTemplate(e.target.value)
                                                e.target.value = ''
                                            }
                                        }}
                                    >
                                        <option value="">+ Ajouter un template...</option>
                                        {getAvailableTemplates().map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedTemplates.length === 0 && (
                                <p className={styles.templateHint}>
                                    Sélectionnez un ou plusieurs templates. Le premier sera
                                    prioritaire en cas de chevauchement.
                                </p>
                            )}

                            {selectedTemplates.length > 1 && (
                                <p className={styles.templateOverlapWarning}>
                                    En cas de chevauchement, les créneaux du template le plus
                                    prioritaire seront conservés.
                                </p>
                            )}
                        </div>

                        {/* Month navigation */}
                        <div className={styles.monthNav}>
                            <button
                                onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                                className={clsx('btn', styles.monthNavBtn)}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className={styles.monthLabel}>
                                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                            </span>
                            <button
                                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                                className={clsx('btn', styles.monthNavBtn)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Selection actions */}
                        <div className={styles.selectionActions}>
                            <button
                                onClick={selectAllVisible}
                                className={clsx('btn', styles.selectionBtn)}
                            >
                                Tout sélectionner
                            </button>
                            <button
                                onClick={clearSelection}
                                className={clsx('btn', styles.selectionBtn)}
                            >
                                Effacer
                            </button>
                            {selectedWeeks.length > 0 && (
                                <span className={styles.selectionCount}>
                                    {selectedWeeks.length} semaine(s)
                                </span>
                            )}
                        </div>

                        {/* Weeks grid */}
                        {loading ? (
                            <div className={styles.loading}>Chargement...</div>
                        ) : (
                            <div className={styles.weeksGrid}>
                                {weeks.map((weekStart) => {
                                    const weekStr = format(weekStart, 'yyyy-MM-dd')
                                    const selected = isWeekSelected(weekStart)
                                    const configured = isWeekConfigured(weekStart)
                                    const current = isCurrentWeek(weekStart)

                                    return (
                                        <button
                                            key={weekStr}
                                            onClick={() => toggleWeek(weekStart)}
                                            className={clsx(
                                                styles.weekBtn,
                                                selected
                                                    ? styles.weekBtnSelected
                                                    : styles.weekBtnUnselected
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div
                                                className={clsx(
                                                    styles.checkbox,
                                                    selected
                                                        ? styles.checkboxChecked
                                                        : styles.checkboxUnchecked
                                                )}
                                            >
                                                {selected && <Check size={14} color="white" />}
                                            </div>

                                            {/* Week info */}
                                            <div className={styles.weekInfo}>
                                                <div className={styles.weekDateRange}>
                                                    {format(weekStart, 'd MMM', { locale: fr })} -{' '}
                                                    {format(addWeeks(weekStart, 1), 'd MMM', {
                                                        locale: fr,
                                                    })}
                                                </div>
                                                <div className={styles.weekNumber}>
                                                    Semaine {format(weekStart, 'w')}
                                                </div>
                                            </div>

                                            {/* Status badges */}
                                            <div className={styles.statusBadges}>
                                                {current && (
                                                    <span className={styles.badgeCurrent}>
                                                        En cours
                                                    </span>
                                                )}
                                                {configured && (
                                                    <span className={styles.badgeConfigured}>
                                                        Configurée
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

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

            {/* Dialog de choix du mode */}
            {showModeDialog && (
                <div className={clsx('modal-overlay', 'modal-overlay--above', styles.modeOverlay)}>
                    <div className={styles.modeDialog}>
                        <div className={styles.modeDialogBody}>
                            <h3 className={styles.modeDialogTitle}>Semaines déjà configurées</h3>
                            <p className={styles.modeDialogDescription}>
                                {conflictAnalysis?.configuredWeeks?.length || 0} semaine(s)
                                sélectionnée(s) ont déjà une configuration. Que voulez-vous faire ?
                            </p>

                            <div className={styles.modeButtonsColumn}>
                                <button
                                    onClick={() => handleModeSelect('overwrite')}
                                    className={clsx('btn', styles.modeBtnOverwrite)}
                                >
                                    Écraser
                                </button>

                                <button
                                    onClick={() => handleModeSelect('merge')}
                                    className={clsx('btn', styles.modeBtnMerge)}
                                >
                                    <div className={styles.modeBtnTitle}>
                                        Fusionner (garder anciens)
                                    </div>
                                    <div className={styles.modeBtnSubtitle}>
                                        Ajoute les créneaux, garde les anciens si conflit
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeSelect('merge_keep_new')}
                                    className={clsx('btn', styles.modeBtnMergeNew)}
                                >
                                    <div className={styles.modeBtnTitle}>
                                        Fusionner (remplacer par les nouveaux créneaux)
                                    </div>
                                    <div className={styles.modeBtnSubtitle}>
                                        Ajoute les créneaux, remplace par les nouveaux si conflit
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeSelect('cancel')}
                                    className={clsx('btn', styles.modeBtnCancel)}
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialog de warning des conflits */}
            {showConflictWarning && (
                <div
                    className={clsx(
                        'modal-overlay',
                        'modal-overlay--above',
                        styles.conflictOverlay
                    )}
                >
                    <div className={styles.conflictDialog}>
                        <div className={styles.conflictDialogBody}>
                            <div className={styles.conflictHeader}>
                                <AlertTriangle size={24} color="#F59E0B" />
                                <h3 className={styles.conflictTitle}>Créneaux en conflit</h3>
                            </div>

                            <p className={styles.conflictDescription}>
                                {selectedMode === 'merge'
                                    ? 'Les créneaux suivants ne seront pas ajoutés car ils chevauchent des créneaux existants :'
                                    : 'Les créneaux existants suivants seront remplacés par les nouveaux du template :'}
                            </p>

                            <div className={styles.conflictList}>
                                {conflictAnalysis?.conflicts?.map((conflict, idx) => (
                                    <div
                                        key={idx}
                                        className={clsx(
                                            styles.conflictItem,
                                            idx < conflictAnalysis.conflicts.length - 1 &&
                                                styles.conflictItemBorder
                                        )}
                                    >
                                        • {formatConflict(conflict)}
                                    </div>
                                ))}
                            </div>

                            <div className={styles.conflictFooter}>
                                <button
                                    onClick={() => setShowConflictWarning(false)}
                                    className={clsx('btn', styles.conflictBtnCancel)}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => executeApply(selectedMode)}
                                    className={clsx(
                                        'btn',
                                        'btn-primary',
                                        styles.conflictBtnContinue
                                    )}
                                >
                                    Continuer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
