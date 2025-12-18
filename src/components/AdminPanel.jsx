import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageService, GROUP_NAME } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Check, X, UserCheck, UserX, Users, RefreshCw, Edit2, Award, Shield } from 'lucide-react'

export default function AdminPanel() {
    const navigate = useNavigate()
    const { user: currentUser } = useAuth()
    const [members, setMembers] = useState({ pending: [], approved: [] })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    // Modal d'édition
    const [editingMember, setEditingMember] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', licenseType: null, role: 'member' })
    const [savingEdit, setSavingEdit] = useState(false)

    // Calcule les rôles disponibles selon le rôle de l'utilisateur courant
    const getAvailableRoles = () => {
        const roles = [
            { value: 'member', label: 'Membre' },
            { value: 'admin_salles', label: 'Gestion Salle' }
        ]
        // Seul super_admin peut créer des admins
        if (currentUser?.role === 'super_admin') {
            roles.push({ value: 'admin', label: 'Admin' })
        }
        return roles
    }

    // Vérifie si l'utilisateur courant peut modifier ce membre
    const canEditMemberRole = (member) => {
        // On ne peut pas modifier son propre rôle
        if (member.userId === currentUser?.id) return false
        // super_admin peut modifier tout le monde sauf les autres super_admin
        if (currentUser?.role === 'super_admin') return member.role !== 'super_admin'
        // admin peut modifier admin_salles et member
        if (currentUser?.role === 'admin') {
            return member.role !== 'admin' && member.role !== 'super_admin'
        }
        return false
    }

    const loadData = async () => {
        const data = await storageService.getMembers()
        setMembers(data)
        setLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleRefresh = async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }

    const handleApprove = async (userId) => {
        await storageService.approveMember(userId)
        await loadData()
    }

    const handleReject = async (userId) => {
        if (window.confirm('Refuser cette demande ?')) {
            await storageService.rejectMember(userId)
            await loadData()
        }
    }

    const handleRemove = async (userId, name) => {
        if (window.confirm(`Retirer ${name} du groupe ?`)) {
            await storageService.removeMember(userId)
            await loadData()
            closeEditModal()
        }
    }

    const openEditModal = (member) => {
        setEditingMember(member)
        setEditForm({
            name: member.name,
            licenseType: member.licenseType,
            role: member.role || 'member'
        })
    }

    const closeEditModal = () => {
        setEditingMember(null)
        setEditForm({ name: '', licenseType: null, role: 'member' })
    }

    const handleSaveEdit = async () => {
        if (!editForm.name.trim()) return
        setSavingEdit(true)

        // Mettre à jour le nom si modifié
        if (editForm.name !== editingMember.name) {
            await storageService.updateMemberName(editingMember.userId, editForm.name.trim())
        }

        // Mettre à jour la licence
        await storageService.updateMemberLicense(editingMember.userId, editForm.licenseType)

        // Mettre à jour le rôle si modifié et si autorisé
        if (editForm.role !== editingMember.role && canEditMemberRole(editingMember)) {
            await storageService.updateMemberRole(editingMember.userId, editForm.role)
        }

        await loadData()
        setSavingEdit(false)
        closeEditModal()
    }

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
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
                <h1 style={{ fontSize: '1.25rem', margin: 0 }}>Gestion des membres</h1>
                <button
                    onClick={handleRefresh}
                    className="btn"
                    style={{ marginLeft: 'auto', background: 'var(--color-bg)', padding: '0.5rem' }}
                    disabled={refreshing}
                >
                    <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {/* Group Name */}
            <div style={{
                background: 'var(--color-primary)',
                color: 'white',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                textAlign: 'center'
            }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{GROUP_NAME}</h2>
            </div>

            {/* Pending Requests */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{
                    fontSize: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#F59E0B'
                }}>
                    <UserCheck size={18} />
                    Demandes en attente ({members.pending.length})
                </h2>

                {members.pending.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Aucune demande en attente
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.pending.map(member => (
                            <div
                                key={member.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: '#FEF3C7',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '500' }}>{member.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApprove(member.userId)}
                                    style={{
                                        background: '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Approuver"
                                >
                                    <Check size={18} />
                                </button>
                                <button
                                    onClick={() => handleReject(member.userId)}
                                    style={{
                                        background: '#EF4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
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
                <h2 style={{
                    fontSize: '1rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#10B981'
                }}>
                    <Users size={18} />
                    Membres approuvés ({members.approved.length})
                </h2>

                {members.approved.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Aucun membre approuvé
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.approved.map(member => (
                            <div
                                key={member.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'var(--color-bg)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {member.name}
                                        {member.licenseType && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: member.licenseType === 'C' ? '#F3E8FF' : '#DBEAFE',
                                                color: member.licenseType === 'C' ? '#7C3AED' : '#1D4ED8',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold'
                                            }}>
                                                {member.licenseType === 'C' ? 'Compétition' : 'Loisir'}
                                            </span>
                                        )}
                                        {/* Super Admin badge : visible uniquement par les super_admin */}
                                        {member.role === 'super_admin' && currentUser?.realRole === 'super_admin' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#FEF3C7',
                                                color: '#B45309',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold',
                                                border: '1px solid #F59E0B'
                                            }}>
                                                Super Admin
                                            </span>
                                        )}
                                        {/* Pour les admins non-super : les super_admin apparaissent comme "Admin" */}
                                        {member.role === 'super_admin' && currentUser?.realRole !== 'super_admin' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#DBEAFE',
                                                color: '#1E40AF',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold'
                                            }}>
                                                Admin
                                            </span>
                                        )}
                                        {member.role === 'admin' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#DBEAFE',
                                                color: '#1E40AF',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold'
                                            }}>
                                                Admin
                                            </span>
                                        )}
                                        {member.role === 'admin_salles' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#D1FAE5',
                                                color: '#065F46',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: 'bold'
                                            }}>
                                                Gestion Salle
                                            </span>
                                        )}
                                        {member.role === 'member' && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#F3F4F6',
                                                color: '#6B7280',
                                                padding: '2px 6px',
                                                borderRadius: '999px',
                                                fontWeight: '500'
                                            }}>
                                                Membre
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {member.email}
                                    </div>
                                </div>

                                <button
                                    onClick={() => openEditModal(member)}
                                    style={{
                                        background: '#F3F4F6',
                                        color: '#374151',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '0.5rem',
                                        cursor: 'pointer'
                                    }}
                                    title="Modifier"
                                >
                                    <Edit2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal d'édition */}
            {editingMember && (
                <>
                    <div
                        onClick={closeEditModal}
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
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Modifier le membre</h3>
                            <button
                                onClick={closeEditModal}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}>
                                Prénom Nom
                            </label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid #DDD',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '0.5rem',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}>
                                <Award size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                Type de licence
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, licenseType: 'L' })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${editForm.licenseType === 'L' ? 'var(--color-primary)' : '#DDD'}`,
                                        background: editForm.licenseType === 'L' ? '#EFF6FF' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: editForm.licenseType === 'L' ? '600' : '400',
                                        color: editForm.licenseType === 'L' ? 'var(--color-primary)' : 'var(--color-text)'
                                    }}
                                >
                                    Loisir (L)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditForm({ ...editForm, licenseType: 'C' })}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${editForm.licenseType === 'C' ? 'var(--color-primary)' : '#DDD'}`,
                                        background: editForm.licenseType === 'C' ? '#EFF6FF' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: editForm.licenseType === 'C' ? '600' : '400',
                                        color: editForm.licenseType === 'C' ? 'var(--color-primary)' : 'var(--color-text)'
                                    }}
                                >
                                    Compétition (C)
                                </button>
                            </div>
                        </div>

                        {/* Sélecteur de rôle - seulement si l'utilisateur peut modifier */}
                        {canEditMemberRole(editingMember) && (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: '500',
                                    fontSize: '0.9rem'
                                }}>
                                    <Shield size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                                    Rôle
                                </label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid #DDD',
                                        fontSize: '1rem',
                                        background: 'white'
                                    }}
                                >
                                    {getAvailableRoles().map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                            <button
                                onClick={closeEditModal}
                                className="btn"
                                style={{ flex: 1, background: 'var(--color-bg)' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="btn btn-primary"
                                style={{ flex: 1 }}
                                disabled={savingEdit || !editForm.name.trim()}
                            >
                                {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>

                        {/* Bouton supprimer - seulement si pas soi-même */}
                        {editingMember?.userId !== currentUser?.id && canEditMemberRole(editingMember) && (
                            <button
                                onClick={() => handleRemove(editingMember.userId, editingMember.name)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#FEE2E2',
                                    color: '#991B1B',
                                    border: 'none',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontWeight: '500'
                                }}
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
