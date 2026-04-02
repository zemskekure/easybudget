import { useState, useRef, useEffect } from 'react'
import type { PlanItem, TrackingData } from '../lib/types'
import { MONTHS, MONTH_LABELS } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  plan: PlanItem[]
  tracking: TrackingData
  onTrackingChange: (tracking: TrackingData) => void
}

function Editable({ value, onCommit, className = '' }: {
  value: number
  onCommit: (v: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  function commit() {
    const n = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(n)) onCommit(n)
    setEditing(false)
  }

  if (editing) return (
    <input ref={ref} autoFocus
      className="w-32 bg-white border-2 border-emerald-400 rounded-lg px-3 py-1.5 text-sm text-right outline-none"
      value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
    />
  )

  return (
    <span
      className={`cursor-pointer hover:bg-slate-100 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors ${className}`}
      onClick={() => { setEditing(true); setVal(value > 0 ? String(value) : '') }}
    >
      {value > 0 ? fmtFull(value) : '—'}
    </span>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  if (max <= 0) return null
  const pct = Math.min((value / max) * 100, 120)
  const over = value > max
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-400' : 'bg-emerald-400'}`}
        style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function Diff({ estimate, actual }: { estimate: number; actual: number }) {
  if (actual === 0) return <span className="text-slate-300 text-sm">—</span>
  const d = estimate - actual
  const color = d >= 0 ? 'text-emerald-600' : 'text-red-500'
  return <span className={`text-sm font-semibold ${color}`}>{d > 0 ? '+' : ''}{fmtFull(d)}</span>
}

export function TrackingView({ plan, tracking, onTrackingChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [selectedMonth, setSelectedMonth] = useState<string | 'all'>('all')

  const grouped: Record<string, PlanItem[]> = {}
  for (const item of plan) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  // Get actual for an item — either for selected month or total
  function getItemActual(id: string) {
    const m = tracking.monthlyActuals[id]
    if (!m) return 0
    if (selectedMonth === 'all') return Object.values(m).reduce((s, v) => s + v, 0)
    return m[selectedMonth] ?? 0
  }

  // Get total across ALL months (for the progress bar even when viewing a single month)
  function getItemTotalActual(id: string) {
    const m = tracking.monthlyActuals[id]
    return m ? Object.values(m).reduce((s, v) => s + v, 0) : 0
  }

  function setItemActual(id: string, value: number) {
    const month = selectedMonth === 'all' ? 'total' : selectedMonth
    const a = { ...tracking.monthlyActuals }
    a[id] = { ...(a[id] || {}), [month]: value }
    onTrackingChange({ ...tracking, monthlyActuals: a })
  }

  function getIncomeActual() {
    if (selectedMonth === 'all') return Object.values(tracking.monthlyIncome).reduce((s, v) => s + v, 0)
    return tracking.monthlyIncome[selectedMonth] ?? 0
  }

  function setIncomeActual(value: number) {
    const month = selectedMonth === 'all' ? 'total' : selectedMonth
    onTrackingChange({ ...tracking, monthlyIncome: { ...tracking.monthlyIncome, [month]: value } })
  }

  // Check which months have any data
  function monthHasData(m: string) {
    if ((tracking.monthlyIncome[m] ?? 0) > 0) return true
    return plan.some(i => (tracking.monthlyActuals[i.id]?.[m] ?? 0) > 0)
  }

  const incomeEstimate = tracking.incomeEstimate
  const incomeActual = getIncomeActual()
  const spendEstimate = plan.reduce((s, i) => s + i.amount, 0)
  const spendActual = plan.reduce((s, i) => s + getItemActual(i.id), 0)
  const realitaLabel = selectedMonth === 'all' ? 'Realita celkem' : `Realita ${MONTH_LABELS[selectedMonth]}`

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* === MONTH SELECTOR === */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedMonth === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            Celkem
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          {MONTHS.map(m => {
            const hasData = monthHasData(m)
            return (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  m === selectedMonth
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : hasData
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                }`}
              >
                {MONTH_LABELS[m]}
              </button>
            )
          })}
        </div>
      </div>

      {/* === TOP: INCOME === */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-[1fr_160px_160px_120px] gap-4 items-center">
          <div>
            <div className="text-lg font-bold text-slate-800">Příjmy</div>
            <div className="text-xs text-slate-400 mt-0.5">celkový rozpočet k dispozici</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Odhad</div>
            <div className="text-lg font-bold text-slate-700">{fmtFull(incomeEstimate)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">{realitaLabel}</div>
            <div className="text-lg font-bold text-blue-600">
              <Editable value={incomeActual} onCommit={setIncomeActual} className="text-lg font-bold text-blue-600" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Rozdíl</div>
            <Diff estimate={incomeEstimate} actual={incomeActual} />
          </div>
        </div>
        <div className="mt-4">
          <Bar value={incomeActual} max={incomeEstimate} />
        </div>
      </div>

      {/* === SPEND SUMMARY === */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-[1fr_160px_160px_120px] gap-4 items-center">
          <div>
            <div className="text-lg font-bold text-slate-800">Výdaje celkem</div>
            <div className="text-xs text-slate-400 mt-0.5">součet všech položek</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Odhad</div>
            <div className="text-lg font-bold text-slate-700">{fmtFull(spendEstimate)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">{realitaLabel}</div>
            <div className="text-lg font-bold text-emerald-600">{spendActual > 0 ? fmtFull(spendActual) : '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 mb-1">Rozdíl</div>
            <Diff estimate={spendEstimate} actual={spendActual} />
          </div>
        </div>
        <div className="mt-4">
          <Bar value={spendActual} max={spendEstimate} />
        </div>
      </div>

      {/* === ITEMS BY CATEGORY === */}
      {Object.entries(grouped).map(([category, catItems]) => {
        const catEst = catItems.reduce((s, i) => s + i.amount, 0)
        const catActual = catItems.reduce((s, i) => s + getItemActual(i.id), 0)
        const catTotalActual = catItems.reduce((s, i) => s + getItemTotalActual(i.id), 0)
        const isOpen = !collapsed[category]

        return (
          <div key={category} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Category header */}
            <div
              className="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setCollapsed({ ...collapsed, [category]: isOpen })}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300">{isOpen ? '▼' : '▶'}</span>
                  <span className="text-base font-bold text-slate-800">{category}</span>
                  <span className="text-xs text-slate-400">{catItems.length} pol.</span>
                </div>
                <div className="mt-2 ml-6">
                  <Bar value={catTotalActual} max={catEst} />
                </div>
              </div>
              <div className="grid grid-cols-[160px_160px_120px] gap-4 text-right shrink-0">
                <div className="text-sm font-semibold text-slate-600">{fmtFull(catEst)}</div>
                <div className="text-sm font-semibold text-emerald-600">{catActual > 0 ? fmtFull(catActual) : '—'}</div>
                <div><Diff estimate={catEst} actual={catActual} /></div>
              </div>
            </div>

            {/* Items */}
            {isOpen && (
              <div className="border-t border-slate-100">
                {/* Column labels */}
                <div className="grid grid-cols-[1fr_160px_160px_120px] gap-4 px-6 py-2 bg-slate-50/50">
                  <div className="text-xs text-slate-400 pl-6">Položka</div>
                  <div className="text-xs text-slate-400 text-right">Odhad</div>
                  <div className="text-xs text-slate-400 text-right">{realitaLabel}</div>
                  <div className="text-xs text-slate-400 text-right">Rozdíl</div>
                </div>

                {catItems.map(item => {
                  const itemActual = getItemActual(item.id)
                  return (
                    <div key={item.id}
                      className="grid grid-cols-[1fr_160px_160px_120px] gap-4 px-6 py-3 border-t border-slate-50 hover:bg-emerald-50/20 transition-colors items-center"
                    >
                      <div className="text-sm text-slate-600 pl-6 truncate" title={item.name}>{item.name}</div>
                      <div className="text-sm text-slate-500 text-right">{fmtFull(item.amount)}</div>
                      <div className="text-right">
                        <Editable value={itemActual} onCommit={v => setItemActual(item.id, v)} className="text-sm text-emerald-600 font-medium" />
                      </div>
                      <div className="text-right">
                        <Diff estimate={item.amount} actual={itemActual} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
