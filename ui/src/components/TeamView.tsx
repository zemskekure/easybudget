import { useState, useRef, useEffect } from 'react'
import type { PlanItem, TrackingData } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  items: PlanItem[]
  tracking: TrackingData
  onUpdateItem: (id: string, updates: Partial<PlanItem>) => void
}

interface PersonData {
  name: string
  items: PlanItem[]
  budget: number
  spent: number
  pct: number
  color: string
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#e11d48', '#a855f7', '#eab308', '#22d3ee',
]

function buildPeople(items: readonly PlanItem[], tracking: TrackingData): PersonData[] {
  const map: Record<string, { items: PlanItem[]; budget: number; spent: number }> = {}

  for (const item of items) {
    const person = item.assignedTo || 'Nepřiřazeno'
    if (!map[person]) map[person] = { items: [], budget: 0, spent: 0 }
    map[person].items.push(item)
    map[person].budget += item.amount
    const actuals = tracking.monthlyActuals[item.id]
    if (actuals) {
      map[person].spent += Object.values(actuals).reduce((s, v) => s + v, 0)
    }
  }

  const total = items.reduce((s, i) => s + i.amount, 0)
  return Object.entries(map)
    .sort(([, a], [, b]) => b.budget - a.budget)
    .map(([name, d], i) => ({
      name,
      items: d.items,
      budget: d.budget,
      spent: d.spent,
      pct: total > 0 ? (d.budget / total) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }))
}

function uniquePeople(items: readonly PlanItem[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (item.assignedTo) set.add(item.assignedTo)
  }
  return [...set].sort()
}

function uniqueCategories(items: readonly PlanItem[]): string[] {
  const set = new Set<string>()
  for (const item of items) {
    if (item.category) set.add(item.category)
  }
  return [...set].sort()
}

export function TeamView({ items, tracking, onUpdateItem }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [hoveredPerson, setHoveredPerson] = useState<string | null>(null)
  const [view, setView] = useState<'overview' | 'assign'>('overview')

  const people = buildPeople(items, tracking)
  const allPeople = uniquePeople(items)
  const totalBudget = people.reduce((s, p) => s + p.budget, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300">
        <div className="text-sm">Nejdřív si sestav rozpočet v záložce „Stavba rozpočtu"</div>
      </div>
    )
  }

  function toggle(name: string) {
    setExpanded({ ...expanded, [name]: !expanded[name] })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Tým & rozpočty</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {allPeople.length} lidí, {items.length} položek, celkem {fmtFull(totalBudget)} Kč
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'overview' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Přehled
          </button>
          <button
            onClick={() => setView('assign')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'assign' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Přiřazení
          </button>
        </div>
      </div>

      {view === 'assign' ? (
        <AssignView items={items} allPeople={allPeople} onUpdateItem={onUpdateItem} />
      ) : (
        <>
          {/* Pie chart + legend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-8">
              <PieChart
                people={people}
                total={totalBudget}
                hoveredPerson={hoveredPerson}
                onHover={setHoveredPerson}
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                {people.map(p => (
                  <div
                    key={p.name}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      hoveredPerson === p.name ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                    }`}
                    onMouseEnter={() => setHoveredPerson(p.name)}
                    onMouseLeave={() => setHoveredPerson(null)}
                    onClick={() => toggle(p.name)}
                  >
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-sm text-slate-700 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">{p.pct.toFixed(1)} %</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums shrink-0">
                      {fmtFull(p.budget)} Kč
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Person sections — collapsible */}
          {people.map(p => {
            const isOpen = !!expanded[p.name]
            return (
              <div key={p.name} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Header — click to expand */}
                <button
                  onClick={() => toggle(p.name)}
                  onMouseEnter={() => setHoveredPerson(p.name)}
                  onMouseLeave={() => setHoveredPerson(null)}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400">{p.items.length} položek</span>
                      <span className="text-xs text-slate-400">{p.pct.toFixed(1)} %</span>
                    </div>
                    {/* Mini budget bar */}
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-md">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.pct}%`, background: p.color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">
                    {fmtFull(p.budget)} Kč
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Expanded items */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/60">
                          <th className="text-left px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Položka</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategorie</th>
                          <th className="text-right px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Rozpočet</th>
                          <th className="text-right px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Čerpáno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items
                          .sort((a, b) => b.amount - a.amount)
                          .map(item => {
                            const actual = tracking.monthlyActuals[item.id]
                              ? Object.values(tracking.monthlyActuals[item.id]).reduce((s, v) => s + v, 0)
                              : 0
                            return (
                              <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-2.5 text-slate-700">{item.name}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-400">{item.category}</td>
                                <td className="px-6 py-2.5 text-right tabular-nums font-medium text-slate-800">{fmtFull(item.amount)}</td>
                                <td className="px-6 py-2.5 text-right tabular-nums text-violet-600">
                                  {actual > 0 ? fmtFull(actual) : '—'}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-100" style={{ background: `${p.color}08` }}>
                          <td colSpan={2} className="px-6 py-2.5 text-sm font-bold" style={{ color: p.color }}>Celkem</td>
                          <td className="px-6 py-2.5 text-right text-sm font-bold tabular-nums" style={{ color: p.color }}>
                            {fmtFull(p.budget)}
                          </td>
                          <td className="px-6 py-2.5 text-right text-sm font-bold text-violet-700 tabular-nums">
                            {p.spent > 0 ? fmtFull(p.spent) : '—'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

/* ─── Pie Chart (SVG) ─── */

function PieChart({ people, total, hoveredPerson, onHover }: {
  people: readonly PersonData[]
  total: number
  hoveredPerson: string | null
  onHover: (name: string | null) => void
}) {
  const size = 200
  const strokeWidth = 32
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const arcs = people.reduce<{ person: PersonData; dashLen: number; dashOffset: number }[]>(
    (acc, person) => {
      const pct = total > 0 ? person.budget / total : 0
      const dashLen = pct * circumference
      const prevOffset = acc.length > 0 ? acc[acc.length - 1].dashOffset + acc[acc.length - 1].dashLen : 0
      return [...acc, { person, dashLen, dashOffset: prevOffset }]
    },
    [],
  )

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {arcs.map(({ person, dashLen, dashOffset }) => {
          const isHovered = hoveredPerson === person.name
          return (
            <circle
              key={person.name}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={person.color}
              strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="butt"
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: hoveredPerson && !isHovered ? 0.3 : 1 }}
              onMouseEnter={() => onHover(person.name)}
              onMouseLeave={() => onHover(null)}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hoveredPerson ? (
          <>
            <div className="text-xs text-slate-400 truncate max-w-[100px] text-center">{hoveredPerson}</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">
              {fmtFull(people.find(p => p.name === hoveredPerson)?.budget ?? 0)}
            </div>
            <div className="text-[10px] text-slate-400">
              {people.find(p => p.name === hoveredPerson)?.pct.toFixed(1)} %
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-400">Celkem</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{fmtFull(total)}</div>
            <div className="text-[10px] text-slate-400">Kč</div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Assign View ─── */

function AssignView({ items, allPeople, onUpdateItem }: {
  items: readonly PlanItem[]
  allPeople: string[]
  onUpdateItem: (id: string, updates: Partial<PlanItem>) => void
}) {
  const [newPerson, setNewPerson] = useState('')
  const [peopleList, setPeopleList] = useState(allPeople)
  const categories = uniqueCategories(items)

  function getCategoryPerson(category: string): string {
    const catItems = items.filter(i => i.category === category)
    return catItems.find(i => i.assignedTo)?.assignedTo || ''
  }

  function assignCategory(category: string, person: string) {
    const catItems = items.filter(i => i.category === category)
    for (const item of catItems) {
      onUpdateItem(item.id, { assignedTo: person || undefined })
    }
  }

  function addPerson() {
    const name = newPerson.trim()
    if (name && !peopleList.includes(name)) {
      setPeopleList([...peopleList, name].sort())
      setNewPerson('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Add person */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Lidé v týmu</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {peopleList.map((p, i) => (
            <span key={p} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {p}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Přidat nového člena..."
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPerson() }}
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-emerald-400 focus:bg-white transition-colors"
          />
          <button
            onClick={addPerson}
            disabled={!newPerson.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            Přidat
          </button>
        </div>
      </div>

      {/* Category assignment table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Přiřazení kategorií</h3>
          <p className="text-xs text-slate-400 mt-0.5">Přiřaďte zodpovědnou osobu ke každé kategorii</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategorie</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Položek</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Rozpočet</th>
              <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-56">Zodpovědná osoba</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat)
              const catBudget = catItems.reduce((s, i) => s + i.amount, 0)
              const currentPerson = getCategoryPerson(cat)
              return (
                <tr key={cat} className="border-t border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-3 text-slate-700 font-medium">{cat}</td>
                  <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{catItems.length}</td>
                  <td className="px-4 py-3 text-right text-slate-800 tabular-nums font-medium">{fmtFull(catBudget)} Kč</td>
                  <td className="px-6 py-3">
                    <PersonSelect
                      value={currentPerson}
                      people={peopleList}
                      onChange={person => assignCategory(cat, person)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Person Select Dropdown ─── */

function PersonSelect({ value, people, onChange }: {
  value: string
  people: readonly string[]
  onChange: (person: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropUp(window.innerHeight - rect.bottom < 260)
    }
    setOpen(!open)
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-colors ${
          value
            ? 'border-slate-200 bg-white hover:bg-slate-50'
            : 'border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-slate-400'
        }`}
      >
        <span className={value ? 'font-medium text-slate-700' : ''}>
          {value || 'Vybrat osobu...'}
        </span>
        <svg className="w-4 h-4 text-slate-400 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className={`absolute left-0 right-0 bg-white rounded-xl border border-slate-200 shadow-lg z-30 py-1 max-h-60 overflow-auto ${
          dropUp ? 'bottom-full mb-1' : 'top-full mt-1'
        }`}>
          <button
            onClick={() => { onChange(''); setOpen(false) }}
            className="w-full px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50 transition-colors"
          >
            — Nepřiřazeno —
          </button>
          {people.map((p, i) => (
            <button
              key={p}
              onClick={() => { onChange(p); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                p === value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
