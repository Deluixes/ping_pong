// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import LicenseTypeSelector from '../LicenseTypeSelector'

beforeEach(() => cleanup())

describe('LicenseTypeSelector', () => {
    it('affiche les deux boutons Loisir et Compétition', () => {
        const { container } = render(<LicenseTypeSelector value={null} onChange={vi.fn()} />)
        const buttons = container.querySelectorAll('button')
        expect(buttons).toHaveLength(2)
        expect(buttons[0].textContent).toBe('Loisir (L)')
        expect(buttons[1].textContent).toBe('Compétition (C)')
    })

    it("appelle onChange('L') au clic sur Loisir", () => {
        const onChange = vi.fn()
        const { container } = render(<LicenseTypeSelector value={null} onChange={onChange} />)
        fireEvent.click(container.querySelectorAll('button')[0])
        expect(onChange).toHaveBeenCalledWith('L')
    })

    it("appelle onChange('C') au clic sur Compétition", () => {
        const onChange = vi.fn()
        const { container } = render(<LicenseTypeSelector value={null} onChange={onChange} />)
        fireEvent.click(container.querySelectorAll('button')[1])
        expect(onChange).toHaveBeenCalledWith('C')
    })

    it('applique le style actif au bouton L quand value=L', () => {
        const { container } = render(<LicenseTypeSelector value="L" onChange={vi.fn()} />)
        const buttons = container.querySelectorAll('button')
        expect(buttons[0].className).toContain('Active')
        expect(buttons[1].className).toContain('Inactive')
    })

    it('applique le style actif au bouton C quand value=C', () => {
        const { container } = render(<LicenseTypeSelector value="C" onChange={vi.fn()} />)
        const buttons = container.querySelectorAll('button')
        expect(buttons[0].className).toContain('Inactive')
        expect(buttons[1].className).toContain('Active')
    })
})
