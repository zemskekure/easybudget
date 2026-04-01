import { useState, useRef, useEffect } from 'react'
import type { PlanItem, TrackingData } from '../lib/types'
import { MONTHS, MONTH_LABELS } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  plan: PlanItem[]
  tracking: TrackingData
  onTrackingChange: (tracking: TrackingData) => void
}

function InlineEdit({ value, onCommit, className = '' }: {
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
    <input ref={ref} autoFocus className="w-24 bg-white border border-emerald-400 rounded-lg px-2 py-1 text-sm text-right outline-none"
      value={val} onChange={e => setVal(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
    />
  )

  return (
    <span className={`cursor-pointer hover:bg-slate-100 rounded px-1 -mx-1 ${className}`}
      onClick={() => { setEditing(true); setVal(value > 0 ? String(value) : '') }}
    >
      {value > 0 ? fmtFull(value) : '—'}
    </span>
  )
}

function ProgressBar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = value > max
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-red-400' : color}`}
        style={{ width: `${over ? 100 : pct}%` }} />
    </div>
  )
}

export function TrackingView({ plan, tracking, onTrackingChange }: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[0])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const grouped: Record<string, PlanItem[]> = {}
  for (const item of plan) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  function getActual(id: string, m: string) { return tracking.monthlyActuals[id]?.[m] ?? 0 }
  function getItemTotal(id: string) {
    const m = tracking.monthlyActuals[id]
    return m ? Object.values(m).reduce((s, v) => s + v, 0) : 0
  }

  function setItemMonth(id: string, month: string, value: number) {
    const a = { ...tracking.monthlyActuals }
    a[id] = { ...(a[id] || {}), [month]: value }
    onTrackingChange({ ...tracking, monthlyActuals: a })
  }

  function setIncome(month: string, value: number) {
    onTrackingChange({ ...tracking, monthlyIncome: { ...tracking.monthlyIncome, [month]: value } })
  }

  const totalIncome = Object.values(tracking.monthlyIncome).reduce((s, v) => s + v, 0)
  const totalSpendEst = plan.reduce((s, i) => s + i.amount, 0)
  const totalSpendActual = plan.reduce((s, i) => s + getItemTotal(i.id), 0)
  const monthIncome = tracking.monthlyIncome[selectedMonth] ?? 0
  const monthSpend = plan.reduce((s, i) => s + getActual(i.id, selectedMonth), 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* === SUMMARY CARDS === */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 mb-1">Příjmy</div>
          <div className="text-2xl font-bold text-blue-700">{fmtFull(totalIncome)} <span className="text-sm font-normal text-slate-400">/ {fmtFull(tracking.incomeEstimate)}</span></div>
          <ProgressBar value={totalIncome} max={tracking.incomeEstimate} color="bg-blue-500" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 mb-1">Výdaje</div>
          <div className="text-2xl font-bold text-slate-800">{fmtFull(totalSpendActual)} <span className="text-sm font-normal text-slate-400">/ {fmtFull(totalSpendEst)}</span></div>
          <ProgressBar value={totalSpendActual} max={totalSpendEst} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs text-slate-400 mb-1">Bilance</div>
          <div className={`text-2xl font-bold ${totalIncome - totalSpendActual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {totalIncome - totalSpendActual > 0 ? '+' : ''}{fmtFull(totalIncome - totalSpendActual)}
          </div>
          <div className="text-xs text-slate-400 mt-1">odhad: {fmtFull(tracking.incomeEstimate - totalSpendEst)}</div>
        </div>
      </div>

      {/* === MONTH SELECTOR + INCOME === */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-slate-700">Měsíční přehled</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Příjem:</span>
            <InlineEdit value={monthIncome} onCommit={v => setIncome(selectedMonth, v)} className="text-sm font-semibold text-blue-600" />
            <span className="text-xs text-slate-300 mx-2">|</span>
            <span className="text-xs text-slate-400">Výdaje:</span>
            <span className="text-sm font-semibold text-slate-600">{monthSpend > 0 ? fmtFull(monthSpend) : '—'}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {MONTHS.map(m => {
            const inc = tracking.monthlyIncome[m] ?? 0
            const spend = plan.reduce((s, i) => s + getActual(i.id, m), 0)
            const hasData = inc > 0 || spend > 0
            return (
              <button key={m} onClick={() => setSelectedMonth(m)}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                  m === selectedMonth
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : hasData
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'text-slate-300 hover:bg-slate-50'
                }`}
              >
                {MONTH_LABELS[m]}
              </button>
            )
          })}
        </div>
      </div>

      {/* === ITEM TABLE === */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Položka</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 w-28">Odhad</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-600 w-28">{MONTH_LABELS[selectedMonth]}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 w-28">Celkem</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 w-28">Zbývá</th>
              <th className="px-4 py-3 w-36"></th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([category, catItems]) => {
              const catEst = catItems.reduce((s, i) => s + i.amount, 0)
              const catActual = catItems.reduce((s, i) => s + getItemTotal(i.id), 0)
              const catMonth = catItems.reduce((s, i) => s + getActual(i.id, selectedMonth), 0)
              const catRemaining = catEst - catActual
              const isOpen = !collapsed[category]

              return (
                <tbody key={category}>
                  {/* Category row */}
                  <tr className="border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setCollapsed({ ...collapsed, [category]: isOpen })}
                  >
                    <td className="px-5 py-3">
                      <span className="text-[10px] text-slate-300 mr-2">{isOpen ? '▼' : '▶'}</span>
                      <span className="text-sm font-semibold text-slate-800">{category}</span>
                      <span className="text-xs text-slate-400 ml-2">{catItems.length} pol.</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{fmtFull(catEst)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">{catMonth > 0 ? fmtFull(catMonth) : ''}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-slate-600">{catActual > 0 ? fmtFull(catActual) : ''}</td>
                    <td className={`px-5 py-3 text-right text-sm font-semibold ${catRemaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {catActual > 0 ? fmtFull(catRemaining) : ''}
                    </td>
                    <td className="px-4 py-3">
                      {catEst > 0 && <ProgressBar value={catActual} max={catEst} />}
                    </td>
                  </tr>

                  {/* Items */}
                  {isOpen && catItems.map(item => {
                    const itemActual = getItemTotal(item.id)
                    const itemRemaining = item.amount - itemActual
                    return (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-emerald-50/20 transition-colors">
                        <td className="px-5 py-2 pl-10 text-sm text-slate-500">{item.name}</td>
                        <td className="px-4 py-2 text-right text-sm text-slate-400">{fmtFull(item.amount)}</td>
                        <td className="px-4 py-2 text-right">
                          <InlineEdit value={getActual(item.id, selectedMonth)}
                            onCommit={v => setItemMonth(item.id, selectedMonth, v)}
                            className="text-sm text-emerald-600" />
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-slate-500">{itemActual > 0 ? fmtFull(itemActual) : ''}</td>
                        <td className={`px-5 py-2 text-right text-sm ${itemRemaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {itemActual > 0 ? fmtFull(itemRemaining) : ''}
                        </td>
                        <td className="px-4 py-2">
                          {item.amount > 0 && <ProgressBar value={itemActual} max={item.amount} />}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
