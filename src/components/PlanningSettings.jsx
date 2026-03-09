import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { ArrowLeft, Settings, Layers, Calendar } from 'lucide-react'
import TemplateEditor from './TemplateEditor'
import WeekSelector from './WeekSelector'
import TablesTab from './TablesTab'
import TemplatesTab from './TemplatesTab'
import styles from './PlanningSettings.module.css'

export default function PlanningSettings() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('tables')
    const [loading, setLoading] = useState(true)

    const [templates, setTemplates] = useState([])
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [showWeekSelector, setShowWeekSelector] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const loadedTemplates = await storageService.getTemplates()
        setTemplates(loadedTemplates)
        setLoading(false)
    }

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    if (editingTemplate) {
        return (
            <div className={styles.wrapper}>
                <TemplateEditor
                    template={editingTemplate}
                    onBack={() => setEditingTemplate(null)}
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

            {activeTab === 'tables' && <TablesTab />}

            {activeTab === 'templates' && (
                <TemplatesTab
                    templates={templates}
                    onRefresh={loadData}
                    onEditTemplate={setEditingTemplate}
                />
            )}

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

            {showWeekSelector && (
                <WeekSelector templates={templates} onClose={() => setShowWeekSelector(false)} />
            )}
        </div>
    )
}
