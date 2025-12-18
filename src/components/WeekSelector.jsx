import React, { useState, useEffect } from 'react'
import { startOfWeek, addWeeks, addMonths, format, isSameWeek, isBefore, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { ChevronLeft, ChevronRight, Check, X, RefreshCw, Calendar, AlertTriangle, ChevronUp, ChevronDown, Layers, Plus, Trash2 } from 'lucide-react'

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

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
        const startDate = format(startOfWeek(addMonths(currentMonth, -1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const endDate = format(startOfWeek(addMonths(currentMonth, 2), { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const configs = await storageService.getConfiguredWeeks(startDate, endDate)
        setConfiguredWeeks(configs.map(c => c.week_start))
        setLoading(false)
    }

    const getWeeksInMonth = () => {
        const weeks = []
        let weekStart = startOfWeek(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), { weekStartsOn: 1 })
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

        while (isBefore(weekStart, monthEnd) || isSameWeek(weekStart, monthEnd, { weekStartsOn: 1 })) {
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
            setSelectedWeeks(prev => prev.filter(w => w !== weekStr))
        } else {
            setSelectedWeeks(prev => [...prev, weekStr])
        }
    }

    // Vérifie si des semaines configurées sont sélectionnées
    const hasConfiguredWeeksSelected = () => {
        return selectedWeeks.some(w => configuredWeeks.includes(w))
    }

    // Fonctions pour gérer la sélection multiple de templates
    const addTemplate = (templateId) => {
        if (!templateId || selectedTemplates.includes(templateId)) return
        setSelectedTemplates(prev => [...prev, templateId])
    }

    const removeTemplate = (templateId) => {
        setSelectedTemplates(prev => prev.filter(id => id !== templateId))
    }

    const moveTemplateUp = (index) => {
        if (index === 0) return
        setSelectedTemplates(prev => {
            const newList = [...prev]
            ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
            return newList
        })
    }

    const moveTemplateDown = (index) => {
        if (index === selectedTemplates.length - 1) return
        setSelectedTemplates(prev => {
            const newList = [...prev]
            ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
            return newList
        })
    }

    const getTemplateName = (templateId) => {
        const template = templates.find(t => t.id === templateId)
        return template?.name || 'Inconnu'
    }

    const getAvailableTemplates = () => {
        return templates.filter(t => !selectedTemplates.includes(t.id))
    }

    // Appelé quand on clique sur "Appliquer"
    const handleApplyClick = async () => {
        if (selectedTemplates.length === 0 || selectedWeeks.length === 0) return

        // Si des semaines sont déjà configurées, analyser les conflits et afficher le dialog
        if (hasConfiguredWeeksSelected()) {
            setAnalyzing(true)
            // Analyser les conflits avec le premier template (le plus prioritaire)
            const analysis = await storageService.analyzeTemplateConflicts(selectedTemplates[0], selectedWeeks)
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
        if ((mode === 'merge' || mode === 'merge_keep_new') && conflictAnalysis?.conflicts?.length > 0) {
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
            result = await storageService.applyTemplateToWeeks(selectedTemplates[0], selectedWeeks, mode)
        } else {
            // Plusieurs templates : utiliser la méthode multi-templates
            // Note: le mode est toujours "overwrite" pour le premier template,
            // puis "merge" pour les suivants (priorité au premier)
            result = await storageService.applyMultipleTemplatesToWeeks(selectedTemplates, selectedWeeks)
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
            alert('Erreur lors de l\'application des templates')
        }

        setApplying(false)
        setConflictAnalysis(null)
    }

    const selectAllVisible = () => {
        const weeks = getWeeksInMonth()
        const weekStrs = weeks.map(w => format(w, 'yyyy-MM-dd'))
        setSelectedWeeks(prev => {
            const newSet = new Set(prev)
            weekStrs.forEach(w => newSet.add(w))
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
        return `${dayName} ${conflict.newSlot.startTime.slice(0,5)}-${conflict.newSlot.endTime.slice(0,5)} "${conflict.newSlot.name || 'Sans nom'}"`
    }

    const weeks = getWeeksInMonth()

    return (
        <>
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Appliquer des templates</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem' }}>
                        {/* Template selection - Multi-select with priority */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                                Templates à appliquer (par ordre de priorité)
                            </label>

                            {/* Liste des templates sélectionnés avec ordre */}
                            {selectedTemplates.length > 0 && (
                                <div style={{
                                    marginBottom: '0.75rem',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden'
                                }}>
                                    {selectedTemplates.map((templateId, index) => (
                                        <div
                                            key={templateId}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                padding: '0.5rem 0.75rem',
                                                background: index === 0 ? '#EFF6FF' : 'white',
                                                borderBottom: index < selectedTemplates.length - 1 ? '1px solid #E5E7EB' : 'none'
                                            }}
                                        >
                                            {/* Priority badge */}
                                            <span style={{
                                                background: index === 0 ? 'var(--color-primary)' : '#9CA3AF',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '0.7rem',
                                                fontWeight: '600',
                                                flexShrink: 0
                                            }}>
                                                {index + 1}
                                            </span>

                                            {/* Template name */}
                                            <div style={{ flex: 1, fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: index === 0 ? '500' : '400' }}>
                                                    {getTemplateName(templateId)}
                                                </span>
                                                {index === 0 && (
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        color: 'var(--color-primary)',
                                                        fontWeight: '500'
                                                    }}>
                                                        (Priorité max)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Move buttons */}
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button
                                                    onClick={() => moveTemplateUp(index)}
                                                    disabled={index === 0}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                                                        padding: '0.25rem',
                                                        opacity: index === 0 ? 0.3 : 1,
                                                        color: 'var(--color-text-muted)'
                                                    }}
                                                    title="Monter (plus prioritaire)"
                                                >
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button
                                                    onClick={() => moveTemplateDown(index)}
                                                    disabled={index === selectedTemplates.length - 1}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: index === selectedTemplates.length - 1 ? 'not-allowed' : 'pointer',
                                                        padding: '0.25rem',
                                                        opacity: index === selectedTemplates.length - 1 ? 0.3 : 1,
                                                        color: 'var(--color-text-muted)'
                                                    }}
                                                    title="Descendre (moins prioritaire)"
                                                >
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => removeTemplate(templateId)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '0.25rem',
                                                        color: '#EF4444'
                                                    }}
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
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        id="template-select"
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid #DDD',
                                            fontSize: '0.9rem'
                                        }}
                                        defaultValue=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                addTemplate(e.target.value)
                                                e.target.value = ''
                                            }
                                        }}
                                    >
                                        <option value="">+ Ajouter un template...</option>
                                        {getAvailableTemplates().map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {selectedTemplates.length === 0 && (
                                <p style={{
                                    margin: '0.5rem 0 0 0',
                                    fontSize: '0.8rem',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    Sélectionnez un ou plusieurs templates. Le premier sera prioritaire en cas de chevauchement.
                                </p>
                            )}

                            {selectedTemplates.length > 1 && (
                                <p style={{
                                    margin: '0.5rem 0 0 0',
                                    fontSize: '0.8rem',
                                    color: '#92400E',
                                    background: '#FEF3C7',
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    En cas de chevauchement, les créneaux du template n°1 seront conservés.
                                </p>
                            )}
                        </div>

                        {/* Month navigation */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                        }}>
                            <button
                                onClick={() => setCurrentMonth(prev => addMonths(prev, -1))}
                                className="btn"
                                style={{ padding: '0.5rem', background: 'var(--color-bg)' }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                                className="btn"
                                style={{ padding: '0.5rem', background: 'var(--color-bg)' }}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        {/* Selection actions */}
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button
                                onClick={selectAllVisible}
                                className="btn"
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'var(--color-bg)' }}
                            >
                                Tout sélectionner
                            </button>
                            <button
                                onClick={clearSelection}
                                className="btn"
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', background: 'var(--color-bg)' }}
                            >
                                Effacer
                            </button>
                            {selectedWeeks.length > 0 && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginLeft: 'auto', alignSelf: 'center' }}>
                                    {selectedWeeks.length} semaine(s)
                                </span>
                            )}
                        </div>

                        {/* Weeks grid */}
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                                Chargement...
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {weeks.map(weekStart => {
                                    const weekStr = format(weekStart, 'yyyy-MM-dd')
                                    const selected = isWeekSelected(weekStart)
                                    const configured = isWeekConfigured(weekStart)
                                    const current = isCurrentWeek(weekStart)

                                    return (
                                        <button
                                            key={weekStr}
                                            onClick={() => toggleWeek(weekStart)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: selected ? '2px solid var(--color-primary)' : '1px solid #E5E7EB',
                                                background: selected ? '#EFF6FF' : 'white',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {/* Checkbox */}
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '4px',
                                                border: selected ? 'none' : '2px solid #CBD5E1',
                                                background: selected ? 'var(--color-primary)' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {selected && <Check size={14} color="white" />}
                                            </div>

                                            {/* Week info */}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                                                    {format(weekStart, 'd MMM', { locale: fr })} - {format(addWeeks(weekStart, 1), 'd MMM', { locale: fr })}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                                    Semaine {format(weekStart, 'w')}
                                                </div>
                                            </div>

                                            {/* Status badges */}
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                {current && (
                                                    <span style={{
                                                        background: '#DBEAFE',
                                                        color: '#1D4ED8',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '500'
                                                    }}>
                                                        En cours
                                                    </span>
                                                )}
                                                {configured && (
                                                    <span style={{
                                                        background: '#D1FAE5',
                                                        color: '#047857',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '500'
                                                    }}>
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
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: '#FEF3C7',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                color: '#92400E'
                            }}>
                                Certaines semaines sélectionnées sont déjà configurées. Vous pourrez choisir d'écraser ou de fusionner.
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid #E5E7EB',
                        display: 'flex',
                        gap: '0.75rem'
                    }}>
                        <button
                            onClick={onClose}
                            className="btn"
                            style={{ flex: 1, background: 'var(--color-bg)' }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleApplyClick}
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            disabled={applying || analyzing || selectedTemplates.length === 0 || selectedWeeks.length === 0}
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
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '400px',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                                Semaines déjà configurées
                            </h3>
                            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {conflictAnalysis?.configuredWeeks?.length || 0} semaine(s) sélectionnée(s) ont déjà une configuration.
                                Que voulez-vous faire ?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <button
                                    onClick={() => handleModeSelect('overwrite')}
                                    className="btn"
                                    style={{
                                        background: '#FEE2E2',
                                        color: '#991B1B',
                                        padding: '0.75rem 1rem'
                                    }}
                                >
                                    Écraser
                                </button>

                                <button
                                    onClick={() => handleModeSelect('merge')}
                                    className="btn"
                                    style={{
                                        background: '#DBEAFE',
                                        color: '#1E40AF',
                                        padding: '0.75rem 1rem',
                                        textAlign: 'left',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <div style={{ fontWeight: '600' }}>Fusionner (garder anciens)</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                        Ajoute les créneaux, garde les anciens si conflit
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeSelect('merge_keep_new')}
                                    className="btn"
                                    style={{
                                        background: '#FEF3C7',
                                        color: '#92400E',
                                        padding: '0.75rem 1rem',
                                        textAlign: 'left',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <div style={{ fontWeight: '600' }}>Fusionner (remplacer par les nouveaux créneaux)</div>
                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                                        Ajoute les créneaux, remplace par les nouveaux si conflit
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeSelect('cancel')}
                                    className="btn"
                                    style={{
                                        background: 'var(--color-bg)',
                                        padding: '0.75rem 1rem'
                                    }}
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
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    zIndex: 1100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '450px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <AlertTriangle size={24} color="#F59E0B" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                    Créneaux en conflit
                                </h3>
                            </div>

                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {selectedMode === 'merge'
                                    ? 'Les créneaux suivants ne seront pas ajoutés car ils chevauchent des créneaux existants :'
                                    : 'Les créneaux existants suivants seront remplacés par les nouveaux du template :'}
                            </p>

                            <div style={{
                                background: '#FEF3C7',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.75rem',
                                marginBottom: '1.25rem',
                                maxHeight: '200px',
                                overflow: 'auto'
                            }}>
                                {conflictAnalysis?.conflicts?.map((conflict, idx) => (
                                    <div key={idx} style={{
                                        fontSize: '0.85rem',
                                        color: '#92400E',
                                        padding: '0.25rem 0',
                                        borderBottom: idx < conflictAnalysis.conflicts.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                        • {formatConflict(conflict)}
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => setShowConflictWarning(false)}
                                    className="btn"
                                    style={{ flex: 1, background: 'var(--color-bg)' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => executeApply(selectedMode)}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
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
