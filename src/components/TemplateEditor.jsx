import React, { useState, useEffect } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import SlotTab from './SlotTab'
import HourTab from './HourTab'
import styles from './TemplateEditor.module.css'

export default function TemplateEditor({ template, onBack }) {
    const [loading, setLoading] = useState(true)
    const [slots, setSlots] = useState([])
    const [hours, setHours] = useState([])
    const [activeTab, setActiveTab] = useState('slots')

    useEffect(() => {
        loadData()
    }, [template.id])

    const loadData = async () => {
        setLoading(true)
        const [loadedSlots, loadedHours] = await Promise.all([
            storageService.getTemplateSlots(template.id),
            storageService.getTemplateHours(template.id),
        ])
        setSlots(loadedSlots)
        setHours(loadedHours)
        setLoading(false)
    }

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    return (
        <div>
            {/* Header */}
            <div className={styles.header}>
                <button onClick={onBack} className={clsx('btn', styles.backBtn)}>
                    <ArrowLeft size={20} />
                </button>
                <h2 className={styles.title}>{template.name}</h2>
            </div>

            {/* Sub-tabs */}
            <div className="tab-bar">
                <button
                    onClick={() => setActiveTab('slots')}
                    className={clsx(
                        'tab-btn',
                        styles.tabBtn,
                        activeTab === 'slots' && 'tab-btn--active'
                    )}
                >
                    <Calendar size={16} />
                    Créneaux
                </button>
                <button
                    onClick={() => setActiveTab('hours')}
                    className={clsx(
                        'tab-btn',
                        styles.tabBtn,
                        activeTab === 'hours' && 'tab-btn--active'
                    )}
                >
                    <Clock size={16} />
                    Horaires
                </button>
            </div>

            {activeTab === 'slots' && (
                <SlotTab template={template} slots={slots} onRefresh={loadData} />
            )}

            {activeTab === 'hours' && (
                <HourTab template={template} hours={hours} onRefresh={loadData} />
            )}
        </div>
    )
}
