import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import styles from './MemberSearchSelect.module.css'

export default function MemberSearchSelect({ members, value, onChange, placeholder }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const inputRef = useRef(null)
    const wrapperRef = useRef(null)

    const selectedMember = members.find((m) => m.userId === value)
    const filtered = members.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))

    useEffect(() => {
        if (open && inputRef.current) {
            inputRef.current.focus()
        }
    }, [open])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false)
                setQuery('')
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('touchstart', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('touchstart', handleClickOutside)
        }
    }, [open])

    const handleSelect = (userId) => {
        onChange(userId)
        setOpen(false)
        setQuery('')
    }

    const handleClear = (e) => {
        e.stopPropagation()
        onChange('')
        setQuery('')
    }

    return (
        <div className={styles.wrapper} ref={wrapperRef}>
            {!open ? (
                <button type="button" onClick={() => setOpen(true)} className={styles.trigger}>
                    {selectedMember ? (
                        <span className={styles.selectedName}>
                            <span className={styles.avatar}>
                                {selectedMember.name.charAt(0).toUpperCase()}
                            </span>
                            {selectedMember.name}
                        </span>
                    ) : (
                        <span className={styles.placeholder}>
                            {placeholder || '-- Choisir un membre --'}
                        </span>
                    )}
                    {selectedMember && (
                        <span onClick={handleClear} className={styles.clearBtn}>
                            <X size={14} />
                        </span>
                    )}
                </button>
            ) : (
                <div className={styles.dropdown}>
                    <div className={styles.searchRow}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className={styles.searchInput}
                            placeholder="Rechercher..."
                        />
                    </div>
                    <div className={styles.list}>
                        {filtered.length === 0 ? (
                            <div className={styles.empty}>Aucun membre</div>
                        ) : (
                            filtered.map((m) => (
                                <button
                                    key={m.userId}
                                    type="button"
                                    onClick={() => handleSelect(m.userId)}
                                    className={styles.option}
                                >
                                    <span className={styles.avatar}>
                                        {m.name.charAt(0).toUpperCase()}
                                    </span>
                                    {m.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
