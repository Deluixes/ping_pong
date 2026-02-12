import React, { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useNavigate } from 'react-router-dom'
import { storageService } from '../services/storage'
import { GROUP_NAME } from '../constants'
import {
    getAvailableRoles as getAvailableRolesUtil,
    canEditMemberRole as canEditMemberRoleUtil,
} from '../utils/permissions'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import {
    ArrowLeft,
    Check,
    X,
    UserCheck,
    UserX,
    Users,
    RefreshCw,
    Edit2,
    Award,
    Shield,
    Search,
} from 'lucide-react'
import LicenseTypeSelector from './LicenseTypeSelector'
import styles from './AdminPanel.module.css'

export default function AdminPanel() {
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()
    const { addToast } = useToast()
    const confirm = useConfirm()
    const [members, setMembers] = useState({ pending: [], approved: [] })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Modal d'édition
    const [editingMember, setEditingMember] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', licenseType: null, role: 'member' })
    const [savingEdit, setSavingEdit] = useState(false)

    const getAvailableRoles = () => getAvailableRolesUtil(currentUser?.role)

    const canEditMemberRole = (member) =>
        canEditMemberRoleUtil(currentUser?.role, currentUser?.id, member.role, member.userId)

    const loadData = async () => {
        const data = await storageService.getMembers(currentUser?.role === 'super_admin')
        setMembers(data)
        setLoading(false)
    }

    useEffect(() => {
        loadData()

        // S'abonner aux changements de la table members (real-time)
        const subscription = storageService.subscribeToMembers(() => {
            loadData()
        })

        return () => {
            storageService.unsubscribe(subscription)
        }
    }, [])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    const handleApprove = async (userId) => {
        try {
            const result = await storageService.approveMember(userId)
            if (!result.success) {
                addToast("Erreur lors de l'approbation du membre.", 'error')
                return
            }
            await loadData()
        } catch {
            addToast("Erreur lors de l'approbation du membre.", 'error')
        }
    }

    const handleReject = async (userId) => {
        const confirmed = await confirm({
            title: 'Refuser',
            message: 'Refuser cette demande ?',
            confirmLabel: 'Refuser',
        })
        if (!confirmed) return
        try {
            const result = await storageService.rejectMember(userId)
            if (!result.success) {
                addToast('Erreur lors du refus.', 'error')
                return
            }
            await loadData()
        } catch {
            addToast('Erreur lors du refus.', 'error')
        }
    }

    const handleRemove = async (userId, name) => {
        const confirmed = await confirm({
            title: 'Retirer du groupe',
            message: `Retirer ${name} du groupe ?`,
            confirmLabel: 'Retirer',
        })
        if (!confirmed) return
        try {
            const result = await storageService.removeMember(userId)
            if (!result.success) {
                addToast('Erreur lors de la suppression du membre.', 'error')
                return
            }
            await loadData()
            closeEditModal()
        } catch {
            addToast('Erreur lors de la suppression du membre.', 'error')
        }
    }

    const openEditModal = (member) => {
        setEditingMember(member)
        setEditForm({
            name: member.name,
            licenseType: member.licenseType,
            role: member.role || 'member',
        })
    }

    const closeEditModal = () => {
        setEditingMember(null)
        setEditForm({ name: '', licenseType: null, role: 'member' })
    }

    const handleSaveEdit = async () => {
        if (!editForm.name.trim()) return
        setSavingEdit(true)

        try {
            const updates = [
                storageService.updateMemberLicense(editingMember.userId, editForm.licenseType),
            ]

            if (editForm.name !== editingMember.name) {
                updates.push(storageService.renameUser(editingMember.userId, editForm.name.trim()))
            }

            if (editForm.role !== editingMember.role && canEditMemberRole(editingMember)) {
                updates.push(storageService.updateMemberRole(editingMember.userId, editForm.role))
            }

            const results = await Promise.all(updates)
            if (results.some((r) => r && !r.success)) {
                addToast('Erreur lors de la sauvegarde.', 'error')
                setSavingEdit(false)
                return
            }
            await loadData()
            closeEditModal()
        } catch {
            addToast('Erreur lors de la sauvegarde.', 'error')
        }
        setSavingEdit(false)
    }

    // Filtre et regroupe les membres par catégorie
    const groupedMembers = useMemo(() => {
        const filtered = members.approved.filter(
            (m) =>
                m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )

        return {
            admins: filtered.filter((m) => m.role === 'super_admin' || m.role === 'admin'),
            gestionnaires: filtered.filter((m) => m.role === 'admin_salles'),
            membres: filtered.filter((m) => m.role === 'member' || !m.role),
        }
    }, [members.approved, searchTerm])

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    // Composant pour afficher un membre dans la liste
    const MemberRow = ({ member }) => (
        <div className={styles.memberRow}>
            <div className={styles.memberInfo}>
                <div className={styles.memberName}>
                    {member.name}
                    {member.licenseType && (
                        <span
                            className={clsx(
                                styles.licenseBadge,
                                member.licenseType === 'C'
                                    ? styles.licenseBadgeC
                                    : styles.licenseBadgeL
                            )}
                        >
                            {member.licenseType === 'C' ? 'Compétition' : 'Loisir'}
                        </span>
                    )}
                </div>
                <div className={styles.memberEmail}>{member.email}</div>
            </div>

            <button
                onClick={() => openEditModal(member)}
                className={styles.editBtn}
                title="Modifier"
            >
                <Edit2 size={18} />
            </button>
        </div>
    )

    // Composant pour afficher une section de groupe
    const GroupSection = ({ title, members, titleClass, icon }) => {
        if (members.length === 0) return null
        return (
            <div className={styles.groupSection}>
                <h3 className={clsx(styles.groupSectionTitle, titleClass)}>
                    {icon}
                    {title} ({members.length})
                </h3>
                <div className={styles.memberList}>
                    {members.map((member) => (
                        <MemberRow key={member.userId} member={member} />
                    ))}
                </div>
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
                <h1 className="page-title">Gestion des membres</h1>
                <button
                    onClick={handleRefresh}
                    className={clsx('btn btn-back', styles.refreshBtn)}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {/* Group Name */}
            <div className={styles.groupBanner}>
                <h2 className={styles.groupBannerTitle}>{GROUP_NAME}</h2>
            </div>

            {/* Pending Requests */}
            <div className={clsx('card', styles.pendingCard)}>
                <h2 className={clsx(styles.sectionTitle, styles.sectionTitleWarning)}>
                    <UserCheck size={18} />
                    Demandes en attente ({members.pending.length})
                </h2>

                {members.pending.length === 0 ? (
                    <p className={styles.emptyText}>Aucune demande en attente</p>
                ) : (
                    <div className={styles.memberList}>
                        {members.pending.map((member) => (
                            <div key={member.userId} className={styles.pendingRow}>
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberName}>{member.name}</div>
                                    <div className={styles.memberEmail}>{member.email}</div>
                                </div>
                                <button
                                    onClick={() => handleApprove(member.userId)}
                                    className={styles.approveBtn}
                                    title="Approuver"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={() => handleReject(member.userId)}
                                    className={styles.rejectBtn}
                                    title="Refuser"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approved Members */}
            <div className="card">
                <h2 className={clsx(styles.sectionTitle, styles.sectionTitleSuccess)}>
                    <Users size={18} />
                    Membres approuvés ({members.approved.length})
                </h2>

                {/* Barre de recherche */}
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Rechercher un membre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                {members.approved.length === 0 ? (
                    <p className={styles.emptyText}>Aucun membre approuvé</p>
                ) : (
                    <div>
                        <GroupSection
                            title="Administrateurs"
                            members={groupedMembers.admins}
                            titleClass={styles.groupSectionTitleAdmin}
                            icon={<Shield size={16} />}
                        />
                        <GroupSection
                            title="Gestionnaires salle"
                            members={groupedMembers.gestionnaires}
                            titleClass={styles.groupSectionTitleManager}
                            icon={<Users size={16} />}
                        />
                        <GroupSection
                            title="Membres"
                            members={groupedMembers.membres}
                            titleClass={styles.groupSectionTitleMember}
                            icon={<Users size={16} />}
                        />
                        {searchTerm &&
                            groupedMembers.admins.length === 0 &&
                            groupedMembers.gestionnaires.length === 0 &&
                            groupedMembers.membres.length === 0 && (
                                <p className={styles.noResults}>
                                    Aucun membre trouvé pour "{searchTerm}"
                                </p>
                            )}
                    </div>
                )}
            </div>

            {/* Modal d'édition */}
            {editingMember && (
                <>
                    <div onClick={closeEditModal} className="modal-overlay" />
                    <div className="modal-dialog modal-dialog--centered">
                        <div className="modal-header">
                            <h3 className={styles.modalTitle}>Modifier le membre</h3>
                            <button onClick={closeEditModal} className="icon-btn">
                                <X size={20} />
                            </button>
                        </div>

                        <div className={styles.formGroup}>
                            <label className="form-label">Prénom Nom</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className="form-label">
                                <Award size={14} className="label-icon" />
                                Type de licence
                            </label>
                            <LicenseTypeSelector
                                value={editForm.licenseType}
                                onChange={(type) => setEditForm({ ...editForm, licenseType: type })}
                            />
                        </div>

                        {/* Sélecteur de rôle - seulement si l'utilisateur peut modifier */}
                        {canEditMemberRole(editingMember) && (
                            <div className={styles.formGroupLg}>
                                <label className="form-label">
                                    <Shield size={14} className="label-icon" />
                                    Rôle
                                </label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, role: e.target.value })
                                    }
                                    className="form-input"
                                >
                                    {getAvailableRoles().map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.modalActions}>
                            <button
                                onClick={closeEditModal}
                                className={clsx('btn', styles.cancelBtn)}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className={clsx('btn btn-primary', styles.saveBtn)}
                                disabled={savingEdit || !editForm.name.trim()}
                            >
                                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>

                        {/* Bouton supprimer - seulement si pas soi-même */}
                        {editingMember?.userId !== currentUser?.id &&
                            canEditMemberRole(editingMember) && (
                                <button
                                    onClick={() =>
                                        handleRemove(editingMember.userId, editingMember.name)
                                    }
                                    className={styles.removeBtn}
                                >
                                    <UserX size={16} />
                                    Supprimer du groupe
                                </button>
                            )}
                    </div>
                </>
            )}
        </div>
    )
}
