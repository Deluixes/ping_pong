import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { DEFAULT_TOTAL_TABLES } from '../constants'
import {
    ArrowLeft,
    Check,
    RefreshCw,
    Settings,
    Calendar,
    Layers,
    Plus,
    Edit2,
    Trash2,
    X,
} from 'lucide-react'
import TemplateEditor from './TemplateEditor'
import WeekSelector from './WeekSelector'
import styles from './PlanningSettings.module.css'

export default function PlanningSettings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('tables') // 'tables' | 'templates' | 'weeks'
    const [loading, setLoading] = useState(true)

    // Settings state
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    // Templates state
    const [templates, setTemplates] = useState([])
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)

    // Edit template name state
    const [showEditNameModal, setShowEditNameModal] = useState(false)
    const [templateToRename, setTemplateToRename] = useState(null)
    const [editedTemplateName, setEditedTemplateName] = useState('')

    // Week selector state
    const [showWeekSelector, setShowWeekSelector] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [tables, loadedTemplates] = await Promise.all([
            storageService.getSetting('total_tables'),
            storageService.getTemplates(),
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
        setTemplates((prev) => prev.filter((t) => t.id !== template.id))
    }

    const handleOpenRenameModal = (template) => {
        setTemplateToRename(template)
        setEditedTemplateName(template.name)
        setShowEditNameModal(true)
    }

    const handleSaveTemplateName = async () => {
        if (!editedTemplateName.trim() || !templateToRename) return
        setSavingTemplate(true)

        const result = await storageService.updateTemplate(
            templateToRename.id,
            editedTemplateName.trim()
        )
        if (result.success) {
            await loadData()
            setShowEditNameModal(false)
            setTemplateToRename(null)
            setEditedTemplateName('')
        }

        setSavingTemplate(false)
    }

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    // Si on édite un template, afficher l'éditeur
    if (editingTemplate) {
        return (
            <div className={styles.wrapper}>
                <TemplateEditor
                    template={editingTemplate}
                    onBack={() => setEditingTemplate(null)}
                    onUpdate={loadData}
                />
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            {/* Header */}
            <div className="page-header">
                <button onClick={() => navigate('/')} className="btn btn-back">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="page-title">Gestion du planning</h1>
            </div>

            {/* Tabs */}
            <div className="tab-bar">
                <button
                    onClick={() => setActiveTab('tables')}
                    className={clsx('tab-btn', activeTab === 'tables' && 'tab-btn--active')}
                >
                    <Settings size={16} />
                    Tables
                </button>
                <button
                    onClick={() => setActiveTab('templates')}
                    className={clsx('tab-btn', activeTab === 'templates' && 'tab-btn--active')}
                >
                    <Layers size={16} />
                    Templates
                </button>
                <button
                    onClick={() => setActiveTab('weeks')}
                    className={clsx('tab-btn', activeTab === 'weeks' && 'tab-btn--active')}
                >
                    <Calendar size={16} />
                    Semaines
                </button>
            </div>

            {/* Onglet Tables */}
            {activeTab === 'tables' && (
                <div className="card">
                    <h2 className={styles.sectionTitle}>
                        <Settings size={18} />
                        Configuration des tables
                    </h2>

                    <div className={styles.formGroup}>
                        <label className="form-label">Nombre de tables</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={totalTables}
                            onChange={(e) =>
                                setTotalTables(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="form-input"
                        />
                        <p className={styles.helpText}>
                            Capacité max par créneau : <strong>{totalTables * 2} personnes</strong>
                        </p>
                    </div>

                    <button
                        onClick={handleSaveSettings}
                        className="btn btn-primary btn-full"
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
                    <div className={styles.sectionHeader}>
                        <h2 className={clsx(styles.sectionTitle, styles.sectionTitleNoMargin)}>
                            <Layers size={18} />
                            Templates de semaine
                        </h2>
                        <button
                            onClick={() => setShowNewTemplateModal(true)}
                            className={clsx('btn', 'btn-primary', styles.addBtn)}
                        >
                            <Plus size={18} />
                            Nouveau
                        </button>
                    </div>

                    <p className={styles.descText}>
                        Les templates sont des modèles de semaine réutilisables. Créez un template
                        puis appliquez-le aux semaines de votre choix.
                    </p>

                    {templates.length === 0 ? (
                        <div className={clsx('card', styles.emptyCard)}>
                            <p className={styles.emptyText}>
                                Aucun template créé.
                                <br />
                                <span className={styles.emptySubtext}>
                                    Créez votre premier template pour commencer.
                                </span>
                            </p>
                        </div>
                    ) : (
                        <div className={styles.templateList}>
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    className={clsx('card', styles.templateCard)}
                                    onClick={() => setEditingTemplate(template)}
                                >
                                    <Layers size={24} className={styles.templateIcon} />
                                    <div className={styles.templateInfo}>
                                        <div className={styles.templateName}>{template.name}</div>
                                        <div className={styles.templateHint}>
                                            Cliquez pour éditer les créneaux
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleOpenRenameModal(template)
                                        }}
                                        className={clsx('icon-btn', styles.renameBtn)}
                                        title="Renommer"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleDeleteTemplate(template)
                                        }}
                                        className={clsx('icon-btn', styles.deleteBtn)}
                                        title="Supprimer"
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
                    <div className={styles.sectionHeader}>
                        <h2 className={clsx(styles.sectionTitle, styles.sectionTitleNoMargin)}>
                            <Calendar size={18} />
                            Configuration des semaines
                        </h2>
                    </div>

                    <p className={clsx(styles.descText, styles.descTextLargeMargin)}>
                        Appliquez vos templates aux semaines de votre choix. Les semaines non
                        configurées utilisent les horaires par défaut (8h-23h).
                    </p>

                    <button
                        onClick={() => setShowWeekSelector(true)}
                        className="btn btn-primary btn-full"
                        disabled={templates.length === 0}
                    >
                        <Calendar size={20} />
                        Appliquer des templates aux semaines
                    </button>

                    {templates.length === 0 && (
                        <p className={styles.weeksNoTemplate}>
                            Créez d'abord un template dans l'onglet "Templates"
                        </p>
                    )}
                </div>
            )}

            {/* Modal nouveau template */}
            {showNewTemplateModal && (
                <div className="modal-overlay" onClick={() => setShowNewTemplateModal(false)}>
                    <div
                        className="modal-dialog modal-dialog--centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className={styles.modalTitle}>Nouveau template</h3>
                            <button
                                onClick={() => setShowNewTemplateModal(false)}
                                className="icon-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.formGroup}>
                            <label className="form-label">Nom du template</label>
                            <input
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                placeholder="Ex: Semaine normale, Vacances..."
                                className="form-input"
                                autoFocus
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setShowNewTemplateModal(false)}
                                className={clsx('btn', styles.cancelBtn)}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleCreateTemplate}
                                className={clsx('btn', 'btn-primary', styles.submitBtn)}
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
                </div>
            )}

            {/* Modal édition nom template */}
            {showEditNameModal && (
                <div className="modal-overlay" onClick={() => setShowEditNameModal(false)}>
                    <div
                        className="modal-dialog modal-dialog--centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3 className={styles.modalTitle}>Renommer le template</h3>
                            <button
                                onClick={() => setShowEditNameModal(false)}
                                className="icon-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.formGroup}>
                            <label className="form-label">Nom du template</label>
                            <input
                                type="text"
                                value={editedTemplateName}
                                onChange={(e) => setEditedTemplateName(e.target.value)}
                                placeholder="Ex: Semaine normale, Vacances..."
                                className="form-input"
                                autoFocus
                            />
                        </div>

                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setShowEditNameModal(false)}
                                className={clsx('btn', styles.cancelBtn)}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveTemplateName}
                                className={clsx('btn', 'btn-primary', styles.submitBtn)}
                                disabled={savingTemplate || !editedTemplateName.trim()}
                            >
                                {savingTemplate ? (
                                    <RefreshCw size={18} className="spin" />
                                ) : (
                                    'Enregistrer'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Week Selector Modal */}
            {showWeekSelector && (
                <WeekSelector templates={templates} onClose={() => setShowWeekSelector(false)} />
            )}
        </div>
    )
}
