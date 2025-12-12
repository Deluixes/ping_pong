import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService } from '../services/storage'
import { ArrowLeft, Check, RefreshCw, Settings, Calendar, Layers, Plus, Edit2, Trash2, X } from 'lucide-react'
import TemplateEditor from './TemplateEditor'
import WeekSelector from './WeekSelector'

export default function PlanningSettings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('tables') // 'tables' | 'templates' | 'weeks'
    const [loading, setLoading] = useState(true)

    // Settings state
    const [totalTables, setTotalTables] = useState(8)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    // Templates state
    const [templates, setTemplates] = useState([])
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Week selector state
    const [showWeekSelector, setShowWeekSelector] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [tables, loadedTemplates] = await Promise.all([
            storageService.getSetting('total_tables'),
            storageService.getTemplates()
        ])
        if (tables) setTotalTables(parseInt(tables))
        setTemplates(loadedTemplates)
        setLoading(false)
    }

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        setSettingsSaved(false)
        await storageService.updateSetting('total_tables', totalTables.toString())
        setSavingSettings(false)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
    }

    // Template handlers
    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return
        setSavingTemplate(true)

        const result = await storageService.createTemplate(newTemplateName.trim())
        if (result.success) {
            await loadData()
            setNewTemplateName('')
            setShowNewTemplateModal(false)
        }

        setSavingTemplate(false)
    }

    const handleDeleteTemplate = async (template) => {
        if (!window.confirm(`Supprimer le template "${template.name}" ?`)) return
        await storageService.deleteTemplate(template.id)
        setTemplates(prev => prev.filter(t => t.id !== template.id))
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    // Si on édite un template, afficher l'éditeur
    if (editingTemplate) {
        return (
            <div style={{ paddingBottom: '2rem' }}>
                <TemplateEditor
                    template={editingTemplate}
                    onBack={() => setEditingTemplate(null)}
                    onUpdate={loadData}
                />
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                marginTop: '1rem'
            }}>
                <button
                    onClick={() => navigate('/')}
                    className="btn"
                    style={{ background: 'var(--color-bg)', padding: '0.5rem' }}
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Gestion du planning</h1>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                marginBottom: '1.5rem',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                padding: '4px'
            }}>
                <button
                    onClick={() => setActiveTab('tables')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'tables' ? 'white' : 'transparent',
                        color: activeTab === 'tables' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'tables' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'tables' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Settings size={16} />
                    Tables
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'templates' ? 'white' : 'transparent',
                        color: activeTab === 'templates' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'templates' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'templates' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Layers size={16} />
                    Templates
                </button>
                <button
                    onClick={() => setActiveTab('weeks')}
                    style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'weeks' ? 'white' : 'transparent',
                        color: activeTab === 'weeks' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: activeTab === 'weeks' ? '600' : '400',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'weeks' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    <Calendar size={16} />
                    Semaines
                </button>
            </div>

            {/* Onglet Tables */}
            {activeTab === 'tables' && (
                <div className="card">
                    <h2 style={{
                        fontSize: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--color-primary)'
                    }}>
                        <Settings size={18} />
                        Configuration des tables
                    </h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontWeight: '500',
                            fontSize: '0.9rem'
                        }}>
                            Nombre de tables
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={totalTables}
                            onChange={(e) => setTotalTables(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #DDD',
                                fontSize: '1rem'
                            }}
                        />
                        <p style={{
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                            margin: '0.5rem 0 0 0'
                        }}>
                            Capacité max par créneau : <strong>{totalTables * 2} personnes</strong>
                        </p>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        disabled={savingSettings}
                    >
                        {savingSettings ? (
                            <>
                                <RefreshCw size={18} className="spin" />
                                Enregistrement...
                            </>
                        ) : settingsSaved ? (
                            <>
                                <Check size={18} />
                                Enregistré !
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Onglet Templates */}
            {activeTab === 'templates' && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-primary)'
                        }}>
                            <Layers size={18} />
                            Templates de semaine
                        </h2>
                        <button
                            onClick={() => setShowNewTemplateModal(true)}
                            className="btn btn-primary"
                            style={{
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Plus size={18} />
                            Nouveau
                        </button>
                    </div>

                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                    }}>
                        Les templates sont des modèles de semaine réutilisables. Créez un template puis appliquez-le aux semaines de votre choix.
                    </p>

                    {templates.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Aucun template créé.<br />
                                <span style={{ fontSize: '0.85rem' }}>Créez votre premier template pour commencer.</span>
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className="card"
                                    style={{
                                        padding: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setEditingTemplate(template)}
                                >
                                    <Layers size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '500' }}>{template.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Cliquez pour éditer
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteTemplate(template)
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#EF4444',
                                            cursor: 'pointer',
                                            padding: '0.5rem'
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Onglet Semaines */}
            {activeTab === 'weeks' && (
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                    }}>
                        <h2 style={{
                            fontSize: '1rem',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--color-primary)'
                        }}>
                            <Calendar size={18} />
                            Configuration des semaines
                        </h2>
                    </div>

                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.85rem',
                        marginBottom: '1.5rem'
                    }}>
                        Appliquez vos templates aux semaines de votre choix. Les semaines non configurées utilisent les horaires par défaut (8h-23h).
                    </p>

                    <button
                        onClick={() => setShowWeekSelector(true)}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                        disabled={templates.length === 0}
                    >
                        <Calendar size={20} />
                        Appliquer un template aux semaines
                    </button>

                    {templates.length === 0 && (
                        <p style={{
                            textAlign: 'center',
                            color: 'var(--color-text-muted)',
                            fontSize: '0.85rem',
                            marginTop: '1rem'
                        }}>
                            Créez d'abord un template dans l'onglet "Templates"
                        </p>
                    )}
                </div>
            )}

            {/* Modal nouveau template */}
            {showNewTemplateModal && (
                <>
                    <div
                        onClick={() => setShowNewTemplateModal(false)}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 1000
                        }}
                    />
                    <div style={{
                        position: 'fixed',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '400px',
                        zIndex: 1001,
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1.5rem'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Nouveau template</h3>
                            <button
                                onClick={() => setShowNewTemplateModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}>
                                Nom du template
                            </label>
                            <input
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="Ex: Semaine normale, Vacances..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid #DDD',
                                    fontSize: '1rem'
                                }}
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowNewTemplateModal(false)}
                                className="btn"
                                style={{ flex: 1, background: 'var(--color-bg)' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateTemplate}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={savingTemplate || !newTemplateName.trim()}
                            >
                                {savingTemplate ? (
                                    <RefreshCw size={18} className="spin" />
                                ) : (
                                    'Créer'
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Week Selector Modal */}
            {showWeekSelector && (
                <WeekSelector
                    templates={templates}
                    onClose={() => setShowWeekSelector(false)}
                />
            )}
        </div>
    )
}
