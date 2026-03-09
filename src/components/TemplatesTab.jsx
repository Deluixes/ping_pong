import React, { useState } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { Layers, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react'
import styles from './TemplatesTab.module.css'

export default function TemplatesTab({ templates, onRefresh, onEditTemplate }) {
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
    const [newTemplateName, setNewTemplateName] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [showEditNameModal, setShowEditNameModal] = useState(false)
    const [templateToRename, setTemplateToRename] = useState(null)
    const [editedTemplateName, setEditedTemplateName] = useState('')

    const handleCreateTemplate = async () => {
        if (!newTemplateName.trim()) return
        setSavingTemplate(true)

        try {
            const result = await storageService.createTemplate(newTemplateName.trim())
            if (result.success) {
                await onRefresh()
                setNewTemplateName('')
                setShowNewTemplateModal(false)
            } else {
                addToast('Erreur lors de la création du template.', 'error')
            }
        } catch {
            addToast('Erreur lors de la création du template.', 'error')
        }

        setSavingTemplate(false)
    }

    const handleDeleteTemplate = async (template) => {
        const confirmed = await confirm({
            title: 'Supprimer',
            message: `Supprimer le template "${template.name}" ?`,
            confirmLabel: 'Supprimer',
        })
        if (!confirmed) return
        try {
            await storageService.deleteTemplate(template.id)
            await onRefresh()
        } catch {
            addToast('Erreur lors de la suppression du template.', 'error')
        }
    }

    const handleOpenRenameModal = (template) => {
        setTemplateToRename(template)
        setEditedTemplateName(template.name)
        setShowEditNameModal(true)
    }

    const handleSaveTemplateName = async () => {
        if (!editedTemplateName.trim() || !templateToRename) return
        setSavingTemplate(true)

        try {
            const result = await storageService.updateTemplate(
                templateToRename.id,
                editedTemplateName.trim()
            )
            if (result.success) {
                await onRefresh()
                setShowEditNameModal(false)
                setTemplateToRename(null)
                setEditedTemplateName('')
            } else {
                addToast('Erreur lors du renommage du template.', 'error')
            }
        } catch {
            addToast('Erreur lors du renommage du template.', 'error')
        }

        setSavingTemplate(false)
    }

    return (
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
                Les templates sont des modèles de semaine réutilisables. Créez un template puis
                appliquez-le aux semaines de votre choix.
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
                            onClick={() => onEditTemplate(template)}
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
        </div>
    )
}
