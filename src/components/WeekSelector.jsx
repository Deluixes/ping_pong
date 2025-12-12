import React, { useState, useEffect } from 'react'
import { startOfWeek, addWeeks, addMonths, format, isSameWeek, isBefore, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import { storageService } from '../services/storage'
import { ChevronLeft, ChevronRight, Check, X, RefreshCw, Calendar } from 'lucide-react'

export default function WeekSelector({ templates, onClose }) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedWeeks, setSelectedWeeks] = useState([])
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [configuredWeeks, setConfiguredWeeks] = useState([])
    const [loading, setLoading] = useState(true)
    const [applying, setApplying] = useState(false)

    const today = startOfDay(new Date())
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })

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

    const handleApply = async () => {
        if (!selectedTemplate || selectedWeeks.length === 0) return

        setApplying(true)
        const result = await storageService.applyTemplateToWeeks(selectedTemplate, selectedWeeks)

        if (result.success) {
            let message = `Template appliqué à ${selectedWeeks.length} semaine(s)`
            if (result.deletedReservations > 0) {
                message += `\n${result.deletedReservations} réservation(s) supprimée(s) (conflit avec créneaux bloquants)`
            }
            alert(message)
            await loadConfiguredWeeks()
            setSelectedWeeks([])
        } else {
            alert('Erreur lors de l\'application du template')
        }

        setApplying(false)
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

    const weeks = getWeeksInMonth()

    return (
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
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Appliquer un template</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {/* Template selection */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>
                            Template à appliquer
                        </label>
                        <select
                            value={selectedTemplate || ''}
                            onChange={(e) => setSelectedTemplate(e.target.value || null)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #DDD',
                                fontSize: '1rem'
                            }}
                        >
                            <option value="">Sélectionner un template...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
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
                                const weekEnd = addWeeks(weekStart, 1)

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

                    {/* Warning */}
                    {selectedWeeks.some(w => configuredWeeks.includes(w)) && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: '#FEF3C7',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            color: '#92400E'
                        }}>
                            Certaines semaines sélectionnées sont déjà configurées. Leur configuration sera remplacée.
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
                        onClick={handleApply}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        disabled={applying || !selectedTemplate || selectedWeeks.length === 0}
                    >
                        {applying ? (
                            <>
                                <RefreshCw size={18} className="spin" />
                                Application...
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
    )
}
