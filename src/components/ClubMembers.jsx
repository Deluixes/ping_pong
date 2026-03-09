import React, { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { storageService } from '../services/storage'
import { useAuth } from '../contexts/AuthContext'
import { Search, Users, X } from 'lucide-react'
import styles from './ClubMembers.module.css'

export default function ClubMembers() {
    const { user } = useAuth()
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [licenseFilter, setLicenseFilter] = useState('all') // 'all', 'L', 'C'
    const [selectedMember, setSelectedMember] = useState(null)

    useEffect(() => {
        loadMembers()
    }, [user])

    const loadMembers = async () => {
        const data = await storageService.getAllApprovedMembers(user?.role === 'super_admin')
        setMembers(data)
        setLoading(false)
    }

    const filteredMembers = useMemo(() => {
        return members.filter((m) => {
            const matchesSearch = m.name?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesLicense = licenseFilter === 'all' || m.licenseType === licenseFilter
            return matchesSearch && matchesLicense
        })
    }, [members, searchTerm, licenseFilter])

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    return (
        <div>
            {/* Barre de recherche */}
            <div className={styles.searchWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    placeholder="Rechercher un membre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={clsx('form-input', styles.searchInput)}
                />
            </div>

            {/* Filtre par licence */}
            <div className={styles.filterGroup}>
                <button
                    onClick={() => setLicenseFilter('all')}
                    className={clsx(
                        styles.filterBtn,
                        licenseFilter === 'all' && styles.filterBtnAllActive
                    )}
                >
                    Tous
                </button>
                <button
                    onClick={() => setLicenseFilter('L')}
                    className={clsx(
                        styles.filterBtn,
                        licenseFilter === 'L' && styles.filterBtnLActive
                    )}
                >
                    Loisir
                </button>
                <button
                    onClick={() => setLicenseFilter('C')}
                    className={clsx(
                        styles.filterBtn,
                        licenseFilter === 'C' && styles.filterBtnCActive
                    )}
                >
                    Compétition
                </button>
            </div>

            {/* Nombre de membres */}
            <div className={styles.memberCount}>
                <Users size={16} />
                {filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''}
                {searchTerm && ` trouvé${filteredMembers.length > 1 ? 's' : ''}`}
            </div>

            {/* Liste des membres */}
            {filteredMembers.length === 0 ? (
                <div className={clsx('card', styles.emptyState)}>
                    <Users size={48} className={styles.emptyIcon} />
                    <p className={styles.emptyText}>
                        {searchTerm
                            ? `Aucun membre trouvé pour "${searchTerm}"`
                            : 'Aucun membre dans le club'}
                    </p>
                </div>
            ) : (
                <div className={styles.memberList}>
                    {filteredMembers.map((member) => (
                        <div
                            key={member.userId}
                            onClick={() => setSelectedMember(member)}
                            className={styles.memberRow}
                        >
                            {/* Avatar */}
                            <div className="avatar avatar--sm">
                                {member.profilePhotoUrl ? (
                                    <img
                                        src={member.profilePhotoUrl}
                                        alt={member.name}
                                        className="avatar__img"
                                    />
                                ) : (
                                    member.name?.charAt(0).toUpperCase() || '?'
                                )}
                            </div>

                            {/* Nom */}
                            <div className={styles.memberName}>{member.name}</div>

                            {/* Badge licence */}
                            {member.licenseType && (
                                <span
                                    className={clsx(
                                        'badge',
                                        'badge--pill',
                                        member.licenseType === 'C'
                                            ? styles.badgeCompetition
                                            : styles.badgeLoisir
                                    )}
                                >
                                    {member.licenseType}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal photo en grand */}
            {selectedMember && (
                <div
                    onClick={() => setSelectedMember(null)}
                    className={clsx('modal-overlay', 'modal-overlay--dark', styles.modalPadding)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={clsx('modal-dialog', styles.modalContent)}
                    >
                        {/* Bouton fermer */}
                        <button
                            onClick={() => setSelectedMember(null)}
                            className={clsx('icon-btn', 'icon-btn--muted', styles.closeBtn)}
                        >
                            <X size={20} />
                        </button>

                        {/* Grande photo ou initiale */}
                        <div className={clsx('avatar', 'avatar--xxl', styles.modalAvatar)}>
                            {selectedMember.profilePhotoUrl ? (
                                <img
                                    src={selectedMember.profilePhotoUrl}
                                    alt={selectedMember.name}
                                    className="avatar__img"
                                />
                            ) : (
                                <span className={styles.modalInitial}>
                                    {selectedMember.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                            )}
                        </div>

                        {/* Nom */}
                        <h3 className={styles.modalName}>{selectedMember.name}</h3>

                        {/* Badge licence */}
                        {selectedMember.licenseType && (
                            <span
                                className={clsx(
                                    'badge',
                                    'badge--pill',
                                    styles.badgeLg,
                                    selectedMember.licenseType === 'C'
                                        ? styles.badgeCompetition
                                        : styles.badgeLoisir
                                )}
                            >
                                {selectedMember.licenseType === 'C' ? 'Compétition' : 'Loisir'}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
