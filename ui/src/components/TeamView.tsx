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
}

// Avatar color palettes
const PALETTES = [
  { skin: '#FDDCB5', hair: '#5C3317', shirt: '#10b981', bg: '#d1fae5' },
  { skin: '#F5C6A1', hair: '#2C1810', shirt: '#3b82f6', bg: '#dbeafe' },
  { skin: '#FDDCB5', hair: '#8B4513', shirt: '#f59e0b', bg: '#fef3c7' },
  { skin: '#E8B890', hair: '#1a1a2e', shirt: '#ef4444', bg: '#fee2e2' },
  { skin: '#FDDCB5', hair: '#D4A574', shirt: '#8b5cf6', bg: '#ede9fe' },
  { skin: '#F5C6A1', hair: '#C0392B', shirt: '#ec4899', bg: '#fce7f3' },
  { skin: '#FDDCB5', hair: '#2C3E50', shirt: '#14b8a6', bg: '#ccfbf1' },
  { skin: '#E8B890', hair: '#6B3FA0', shirt: '#f97316', bg: '#ffedd5' },
  { skin: '#FDDCB5', hair: '#1B2631', shirt: '#6366f1', bg: '#e0e7ff' },
  { skin: '#F5C6A1', hair: '#784212', shirt: '#84cc16', bg: '#ecfccb' },
]

function getLevel(budget: number): { level: number; title: string } {
  if (budget >= 20_000_000) return { level: 5, title: 'Ředitel' }
  if (budget >= 5_000_000) return { level: 4, title: 'Šéf' }
  if (budget >= 1_000_000) return { level: 3, title: 'Senior' }
  if (budget >= 500_000) return { level: 2, title: 'Specialista' }
  return { level: 1, title: 'Junior' }
}

function getRank(index: number): { label: string; color: string } {
  if (index === 0) return { label: 'MVP', color: '#f59e0b' }
  if (index === 1) return { label: '#2', color: '#94a3b8' }
  if (index === 2) return { label: '#3', color: '#cd7f32' }
  return { label: `#${index + 1}`, color: '#cbd5e1' }
}

function buildPeople(items: readonly PlanItem[], tracking: TrackingData): PersonData[] {
  const map: Record<string, PersonData> = {}

  for (const item of items) {
    const person = item.assignedTo || 'Nepřiřazeno'
    if (!map[person]) {
      map[person] = { name: person, items: [], budget: 0, spent: 0 }
    }
    map[person].items.push(item)
    map[person].budget += item.amount
    const actuals = tracking.monthlyActuals[item.id]
    if (actuals) {
      map[person].spent += Object.values(actuals).reduce((s, v) => s + v, 0)
    }
  }

  return Object.values(map).sort((a, b) => b.budget - a.budget)
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
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [view, setView] = useState<'cards' | 'assign'>('cards')

  const people = buildPeople(items, tracking)
  const allPeople = uniquePeople(items)
  const maxBudget = people[0]?.budget ?? 1
  const totalBudget = people.reduce((s, p) => s + p.budget, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300">
        <div className="text-sm">Nejdřív si sestav rozpočet v záložce „Stavba rozpočtu"</div>
      </div>
    )
  }

  const selected = selectedPerson ? people.find(p => p.name === selectedPerson) : null

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Tým & rozpočty</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {allPeople.length} lidí spravuje {items.length} položek za {fmtFull(totalBudget)} Kč
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              view === 'cards' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
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
          {/* Leaderboard cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((person, i) => {
              const palette = PALETTES[i % PALETTES.length]
              const rank = getRank(i)
              const level = getLevel(person.budget)
              const spentPct = person.budget > 0 ? (person.spent / person.budget) * 100 : 0
              const budgetPct = maxBudget > 0 ? (person.budget / maxBudget) * 100 : 0
              const isSelected = selectedPerson === person.name
              const isUnassigned = person.name === 'Nepřiřazeno'

              return (
                <div
                  key={person.name}
                  onClick={() => setSelectedPerson(isSelected ? null : person.name)}
                  className={`relative bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    isSelected ? 'border-emerald-400 shadow-lg shadow-emerald-100'
                      : isUnassigned ? 'border-dashed border-slate-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Rank badge */}
                  {!isUnassigned && (
                    <div
                      className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                      style={{ background: rank.color }}
                    >
                      {rank.label}
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div
                      className="shrink-0 rounded-2xl p-2"
                      style={{ background: isUnassigned ? '#f1f5f9' : palette.bg }}
                    >
                      {isUnassigned ? (
                        <div className="w-16 h-16 flex items-center justify-center text-slate-300">
                          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                          </svg>
                        </div>
                      ) : (
                        <PixarAvatar palette={palette} size={64} seed={i} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold truncate ${isUnassigned ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                        {person.name}
                      </div>
                      {!isUnassigned && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-full"
                            style={{ background: palette.shirt }}>
                            LVL {level.level}
                          </span>
                          <span className="text-[10px] text-slate-400">{level.title}</span>
                        </div>
                      )}

                      {/* Budget bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>{fmtFull(person.budget)} Kč</span>
                          <span>{person.items.length} položek</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${budgetPct}%`,
                              background: isUnassigned ? '#cbd5e1' : palette.shirt,
                              opacity: 0.3,
                            }}
                          />
                        </div>
                        {person.spent > 0 && (
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-violet-400 transition-all duration-700"
                              style={{ width: `${Math.min(spentPct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* XP bar */}
                  {!isUnassigned && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">
                          XP: {fmtFull(person.budget / 1000)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {((person.budget / totalBudget) * 100).toFixed(1)} % celku
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected person detail */}
          {selected && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-700">
                  Položky — {selected.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selected.items.length} položek, celkem {fmtFull(selected.budget)} Kč
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Položka</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategorie</th>
                    <th className="text-right px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Rozpočet</th>
                    <th className="text-right px-6 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Čerpáno</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.items
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
                  <tr className="bg-emerald-50/60 border-t border-emerald-100">
                    <td colSpan={2} className="px-6 py-2.5 text-sm font-bold text-emerald-800">Celkem</td>
                    <td className="px-6 py-2.5 text-right text-sm font-bold text-emerald-800 tabular-nums">{fmtFull(selected.budget)}</td>
                    <td className="px-6 py-2.5 text-right text-sm font-bold text-violet-700 tabular-nums">
                      {selected.spent > 0 ? fmtFull(selected.spent) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ─── Assign View — Admin panel for assigning people to categories ─── */

function AssignView({ items, allPeople, onUpdateItem }: {
  items: readonly PlanItem[]
  allPeople: string[]
  onUpdateItem: (id: string, updates: Partial<PlanItem>) => void
}) {
  const [newPerson, setNewPerson] = useState('')
  const [peopleList, setPeopleList] = useState(allPeople)
  const categories = uniqueCategories(items)

  // Get unique assignment for a category (all items in same category share person)
  function getCategoryPerson(category: string): string {
    const catItems = items.filter(i => i.category === category)
    const assigned = catItems.find(i => i.assignedTo)?.assignedTo
    return assigned || ''
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
            <span
              key={p}
              className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ background: PALETTES[i % PALETTES.length].shirt }}
            >
              <PixarAvatar palette={PALETTES[i % PALETTES.length]} size={20} seed={i} />
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

      {/* Category → Person assignment table */}
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
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 260)
    }
    setOpen(!open)
  }

  const idx = people.indexOf(value)
  const palette = idx >= 0 ? PALETTES[idx % PALETTES.length] : null

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
        {value && palette ? (
          <>
            <PixarAvatar palette={palette} size={20} seed={idx} />
            <span className="font-medium text-slate-700">{value}</span>
          </>
        ) : (
          <span>Vybrat osobu...</span>
        )}
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
              <PixarAvatar palette={PALETTES[i % PALETTES.length]} size={20} seed={i} />
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Pixar-style SVG Avatar ─── */

function PixarAvatar({ palette, size, seed }: {
  palette: { skin: string; hair: string; shirt: string }
  size: number
  seed: number
}) {
  const isLongHair = seed % 3 === 0
  const hasGlasses = seed % 4 === 1
  const hasBeard = seed % 5 === 2
  const eyeStyle = seed % 3
  const mouthStyle = seed % 4

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="shrink-0">
      {/* Head */}
      <ellipse cx="50" cy="48" rx="32" ry="36" fill={palette.skin} />

      {/* Ears */}
      <ellipse cx="19" cy="52" rx="6" ry="8" fill={palette.skin} />
      <ellipse cx="81" cy="52" rx="6" ry="8" fill={palette.skin} />

      {/* Hair */}
      {isLongHair ? (
        <>
          <ellipse cx="50" cy="28" rx="34" ry="22" fill={palette.hair} />
          <ellipse cx="24" cy="48" rx="10" ry="28" fill={palette.hair} />
          <ellipse cx="76" cy="48" rx="10" ry="28" fill={palette.hair} />
        </>
      ) : (
        <>
          <ellipse cx="50" cy="26" rx="33" ry="20" fill={palette.hair} />
          <rect x="17" y="20" width="66" height="16" rx="8" fill={palette.hair} />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="38" cy="48" rx={eyeStyle === 0 ? 8 : 7} ry={eyeStyle === 0 ? 9 : 8} fill="white" />
      <ellipse cx="62" cy="48" rx={eyeStyle === 0 ? 8 : 7} ry={eyeStyle === 0 ? 9 : 8} fill="white" />
      <circle cx="39" cy="49" r="5" fill="#4A3520" />
      <circle cx="63" cy="49" r="5" fill="#4A3520" />
      <circle cx="40" cy="48" r="2.5" fill="#1a1a1a" />
      <circle cx="64" cy="48" r="2.5" fill="#1a1a1a" />
      <circle cx="41" cy="46" r="1.5" fill="white" opacity="0.9" />
      <circle cx="65" cy="46" r="1.5" fill="white" opacity="0.9" />

      {/* Glasses */}
      {hasGlasses && (
        <g stroke="#555" strokeWidth="1.5" fill="none">
          <rect x="29" y="40" width="18" height="16" rx="5" />
          <rect x="53" y="40" width="18" height="16" rx="5" />
          <line x1="47" y1="48" x2="53" y2="48" />
        </g>
      )}

      {/* Eyebrows */}
      <path d={`M30 ${38 - seed % 2} Q38 ${34 - seed % 3} 46 ${37 - seed % 2}`} stroke={palette.hair} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d={`M54 ${37 - seed % 2} Q62 ${34 - seed % 3} 70 ${38 - seed % 2}`} stroke={palette.hair} strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <ellipse cx="50" cy="58" rx="4" ry="3" fill={palette.skin} opacity="0.6" />

      {/* Mouth */}
      {mouthStyle === 0 && (
        <path d="M40 67 Q50 75 60 67" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" fill="#e74c3c" fillOpacity="0.3" />
      )}
      {mouthStyle === 1 && (
        <path d="M42 68 Q50 73 58 68" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" fill="none" />
      )}
      {mouthStyle === 2 && (
        <>
          <path d="M40 67 Q50 76 60 67" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" fill="#e74c3c" fillOpacity="0.2" />
          <path d="M43 67 L57 67" stroke="white" strokeWidth="1.5" />
        </>
      )}
      {mouthStyle === 3 && (
        <ellipse cx="50" cy="69" rx="5" ry="3" fill="#c0392b" opacity="0.6" />
      )}

      {/* Beard */}
      {hasBeard && (
        <path d="M34 64 Q38 80 50 82 Q62 80 66 64" fill={palette.hair} opacity="0.5" />
      )}

      {/* Cheeks */}
      <circle cx="30" cy="60" r="5" fill="#ff9999" opacity="0.2" />
      <circle cx="70" cy="60" r="5" fill="#ff9999" opacity="0.2" />

      {/* Shirt */}
      <path d="M26 82 Q30 76 50 78 Q70 76 74 82 L80 100 L20 100 Z" fill={palette.shirt} />
      <path d="M42 78 L50 86 L58 78" fill="white" opacity="0.3" />
    </svg>
  )
}
