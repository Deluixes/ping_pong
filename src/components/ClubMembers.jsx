import React, { useState, useEffect, useMemo } from 'react'
import { storageService } from '../services/storage'
import { Search, Users } from 'lucide-react'

export default function ClubMembers() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadMembers()
    }, [])

    const loadMembers = async () => {
        const data = await storageService.getAllApprovedMembers()
        setMembers(data)
        setLoading(false)
    }

    const filteredMembers = useMemo(() => {
        return members.filter(m =>
            m.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [members, searchTerm])

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement...</div>
    }

    return (
        <div>
            {/* Barre de recherche */}
            <div style={{
                position: 'relative',
                marginBottom: '1rem'
            }}>
                <Search
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9CA3AF'
                    }}
                />
                <input
                    type="text"
                    placeholder="Rechercher un membre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.9rem'
                    }}
                />
            </div>

            {/* Nombre de membres */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem',
                color: 'var(--color-text-muted)',
                fontSize: '0.9rem'
            }}>
                <Users size={16} />
                {filteredMembers.length} membre{filteredMembers.length > 1 ? 's' : ''}
                {searchTerm && ` trouvé${filteredMembers.length > 1 ? 's' : ''}`}
            </div>

            {/* Liste des membres */}
            {filteredMembers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <Users size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                        {searchTerm ? `Aucun membre trouvé pour "${searchTerm}"` : 'Aucun membre dans le club'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredMembers.map(member => (
                        <div
                            key={member.userId}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'white',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #E5E7EB'
                            }}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--color-primary)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                flexShrink: 0
                            }}>
                                {member.name?.charAt(0).toUpperCase() || '?'}
                            </div>

                            {/* Nom */}
                            <div style={{ flex: 1, fontWeight: '500' }}>
                                {member.name}
                            </div>

                            {/* Badge licence */}
                            {member.licenseType && (
                                <span style={{
                                    fontSize: '0.75rem',
                                    background: member.licenseType === 'C' ? '#F3E8FF' : '#DBEAFE',
                                    color: member.licenseType === 'C' ? '#7C3AED' : '#1D4ED8',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '999px',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    {member.licenseType}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
