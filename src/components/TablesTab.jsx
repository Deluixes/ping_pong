import React, { useState, useEffect } from 'react'
import { storageService } from '../services/storage'
import { useToast } from '../contexts/ToastContext'
import { DEFAULT_TOTAL_TABLES } from '../constants'
import { Check, RefreshCw, Settings } from 'lucide-react'
import styles from './TablesTab.module.css'

export default function TablesTab() {
    const { addToast } = useToast()
    const [totalTables, setTotalTables] = useState(DEFAULT_TOTAL_TABLES)
    const [savingSettings, setSavingSettings] = useState(false)
    const [settingsSaved, setSettingsSaved] = useState(false)

    useEffect(() => {
        const loadSettings = async () => {
            const tables = await storageService.getSetting('total_tables')
            if (tables) setTotalTables(parseInt(tables))
        }
        loadSettings()
    }, [])

    const handleSaveSettings = async () => {
        setSavingSettings(true)
        setSettingsSaved(false)
        try {
            await storageService.updateSetting('total_tables', totalTables.toString())
            setSettingsSaved(true)
            setTimeout(() => setSettingsSaved(false), 2000)
        } catch {
            addToast('Erreur lors de la sauvegarde des paramètres.', 'error')
        }
        setSavingSettings(false)
    }

    return (
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
                    onChange={(e) => setTotalTables(Math.max(1, parseInt(e.target.value) || 1))}
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
    )
}
