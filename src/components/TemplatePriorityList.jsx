import React from 'react'
import clsx from 'clsx'
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import styles from './TemplatePriorityList.module.css'

export default function TemplatePriorityList({
    templates,
    selectedTemplates,
    onAdd,
    onRemove,
    onMoveUp,
    onMoveDown,
}) {
    const getTemplateName = (templateId) => {
        const template = templates.find((t) => t.id === templateId)
        return template?.name || 'Inconnu'
    }

    const availableTemplates = templates.filter((t) => !selectedTemplates.includes(t.id))

    return (
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
                                index === 0 ? styles.templateItemFirst : styles.templateItemOther,
                                index < selectedTemplates.length - 1 && styles.templateItemBorder
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
                                    <span className={styles.priorityLabel}>(Priorité max)</span>
                                )}
                            </div>

                            {/* Move buttons */}
                            <div className={styles.actionButtons}>
                                <button
                                    onClick={() => onMoveUp(index)}
                                    disabled={index === 0}
                                    className={clsx(
                                        styles.moveBtn,
                                        index === 0 ? styles.moveBtnDisabled : styles.moveBtnEnabled
                                    )}
                                    title="Monter (plus prioritaire)"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    onClick={() => onMoveDown(index)}
                                    disabled={index === selectedTemplates.length - 1}
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
                                    onClick={() => onRemove(templateId)}
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
            {availableTemplates.length > 0 && (
                <div className={styles.addTemplateRow}>
                    <select
                        id="template-select"
                        className={styles.templateSelect}
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) {
                                onAdd(e.target.value)
                                e.target.value = ''
                            }
                        }}
                    >
                        <option value="">+ Ajouter un template...</option>
                        {availableTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedTemplates.length === 0 && (
                <p className={styles.templateHint}>
                    Sélectionnez un ou plusieurs templates. Le premier sera prioritaire en cas de
                    chevauchement.
                </p>
            )}

            {selectedTemplates.length > 1 && (
                <p className={styles.templateOverlapWarning}>
                    En cas de chevauchement, les créneaux du template le plus prioritaire seront
                    conservés.
                </p>
            )}
        </div>
    )
}
