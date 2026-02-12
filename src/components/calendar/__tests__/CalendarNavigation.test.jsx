// @vitest-environment jsdom
import { vi, describe, it, expect, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { addDays, startOfWeek } from 'date-fns'
import CalendarNavigation from '../CalendarNavigation'

afterEach(() => cleanup())

const weekStart = startOfWeek(new Date(2025, 2, 10), { weekStartsOn: 1 }) // lundi 10 mars 2025
const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

const defaultProps = {
    weekStart,
    selectedDate: weekStart,
    weekDays,
    viewMode: 'normal',
    isWeekConfigured: true,
    isCurrentWeek: false,
    viewOptions: [
        { value: 'normal', label: 'Normal' },
        { value: 'edit', label: 'Modifier' },
    ],
    getDayParticipantCount: () => 0,
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onSelectDate: vi.fn(),
    onSetViewMode: vi.fn(),
}

describe('CalendarNavigation', () => {
    it("affiche le mois et l'année", () => {
        const { container } = render(<CalendarNavigation {...defaultProps} />)
        expect(container.textContent).toContain('mars 2025')
    })

    it('affiche les 7 jours de la semaine', () => {
        const { container } = render(<CalendarNavigation {...defaultProps} />)
        const dayBtns = container.querySelectorAll('[class*="dayBtn"]')
        expect(dayBtns.length).toBe(7)
    })

    it('appelle onPrevWeek au clic sur le bouton gauche', () => {
        const onPrevWeek = vi.fn()
        const { container } = render(
            <CalendarNavigation {...defaultProps} onPrevWeek={onPrevWeek} />
        )
        const navBtns = container.querySelectorAll('[class*="weekNavBtn"]')
        fireEvent.click(navBtns[0])
        expect(onPrevWeek).toHaveBeenCalledTimes(1)
    })

    it('appelle onNextWeek au clic sur le bouton droit', () => {
        const onNextWeek = vi.fn()
        const { container } = render(
            <CalendarNavigation {...defaultProps} onNextWeek={onNextWeek} />
        )
        const navBtns = container.querySelectorAll('[class*="weekNavBtn"]')
        fireEvent.click(navBtns[1])
        expect(onNextWeek).toHaveBeenCalledTimes(1)
    })

    it('appelle onSelectDate au clic sur un jour', () => {
        const onSelectDate = vi.fn()
        const { container } = render(
            <CalendarNavigation {...defaultProps} onSelectDate={onSelectDate} />
        )
        const dayBtns = container.querySelectorAll('[class*="dayBtn"]')
        fireEvent.click(dayBtns[2]) // mercredi
        expect(onSelectDate).toHaveBeenCalledWith(weekDays[2])
    })

    it('affiche le badge participant si count > 0', () => {
        const getDayParticipantCount = (day) => (day === weekDays[0] ? 5 : 0)
        const { container } = render(
            <CalendarNavigation {...defaultProps} getDayParticipantCount={getDayParticipantCount} />
        )
        const badges = container.querySelectorAll('[class*="participantBadge"]')
        expect(badges.length).toBe(1)
        expect(badges[0].textContent).toBe('5')
    })

    it('affiche le warning si semaine non configurée et pas courante', () => {
        const { container } = render(
            <CalendarNavigation {...defaultProps} isWeekConfigured={false} isCurrentWeek={false} />
        )
        expect(container.textContent).toContain('pas encore configurée')
    })

    it("n'affiche pas le warning si semaine configurée", () => {
        const { container } = render(
            <CalendarNavigation {...defaultProps} isWeekConfigured={true} />
        )
        expect(container.textContent).not.toContain('pas encore configurée')
    })

    it('affiche le sélecteur de mode de vue', () => {
        const { container } = render(<CalendarNavigation {...defaultProps} />)
        const select = container.querySelector('select')
        expect(select).toBeTruthy()
        expect(select.value).toBe('normal')
    })

    it('appelle onSetViewMode au changement du mode de vue', () => {
        const onSetViewMode = vi.fn()
        const { container } = render(
            <CalendarNavigation {...defaultProps} onSetViewMode={onSetViewMode} />
        )
        const select = container.querySelector('select')
        fireEvent.change(select, { target: { value: 'edit' } })
        expect(onSetViewMode).toHaveBeenCalledWith('edit')
    })
})
