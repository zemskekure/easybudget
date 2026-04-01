import { useState, useRef, useEffect } from 'react'
import type { PlanItem, TrackingData } from '../lib/types'
import { MONTHS, MONTH_LABELS } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  plan: PlanItem[]
  tracking: TrackingData
  onTrackingChange: (tracking: TrackingData) => void
}

function Cell({
  value,
  onCommit,
  bold = false,
  color = 'text-slate-600',
}: {
  value: number
  onCommit?: (val: number) => void
  bold?: boolean
  color?: string
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function commit() {
    const num = parseFloat(editVal.replace(/\s/g, '').replace(',', '.'))
    if (!isNaN(num) && onCommit) onCommit(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <td className="px-1 py-1">
        <input
          ref={inputRef}
          className="w-full bg-white border border-emerald-400 rounded px-1.5 py-1 text-xs text-right outline-none"
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        />
      </td>
    )
  }

  const isEmpty = value === 0
  const formatted = isEmpty ? '' : fmtFull(value)
  const clickable = !!onCommit

  return (
    <td
      className={`px-2 py-1.5 text-right text-xs whitespace-nowrap ${bold ? 'font-semibold' : ''} ${
        isEmpty ? (clickable ? 'cursor-pointer hover:bg-slate-50' : '') : color
      } ${clickable && !isEmpty ? 'cursor-pointer hover:bg-emerald-50' : ''}`}
      onClick={clickable ? () => { setEditing(true); setEditVal(value > 0 ? String(value) : '') } : undefined}
    >
      {formatted}
    </td>
  )
}

function DiffCell({ estimate, actual }: { estimate: number; actual: number }) {
  if (actual === 0) return <td className="px-2 py-1.5 text-right text-xs"></td>
  const diff = estimate - actual
  const color = diff >= 0 ? 'text-emerald-600' : 'text-red-500'
  return (
    <td className={`px-2 py-1.5 text-right text-xs font-medium ${color}`}>
      {diff > 0 ? '+' : ''}{fmtFull(diff)}
    </td>
  )
}

export function TrackingView({ plan, tracking, onTrackingChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const grouped: Record<string, PlanItem[]> = {}
  for (const item of plan) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  function setItemMonth(itemId: string, month: string, value: number) {
    const newActuals = { ...tracking.monthlyActuals }
    newActuals[itemId] = { ...(newActuals[itemId] || {}), [month]: value }
    onTrackingChange({ ...tracking, monthlyActuals: newActuals })
  }

  function setIncome(month: string, value: number) {
    onTrackingChange({ ...tracking, monthlyIncome: { ...tracking.monthlyIncome, [month]: value } })
  }

  function getActual(itemId: string, month: string): number {
    return tracking.monthlyActuals[itemId]?.[month] ?? 0
  }

  function getItemTotal(itemId: string): number {
    const m = tracking.monthlyActuals[itemId]
    return m ? Object.values(m).reduce((s, v) => s + v, 0) : 0
  }

  const totalIncome = Object.values(tracking.monthlyIncome).reduce((s, v) => s + v, 0)
  const totalSpendEst = plan.reduce((s, i) => s + i.amount, 0)
  const totalSpendActual = plan.reduce((s, i) => s + getItemTotal(i.id), 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 min-w-[220px] sticky left-0 bg-slate-50 z-10">Položka</th>
              <th className="text-right px-3 py-3 font-semibold text-slate-500 w-24">Odhad</th>
              {MONTHS.map(m => (
                <th key={m} className="text-right px-2 py-3 font-medium text-slate-400 w-20">{MONTH_LABELS[m]}</th>
              ))}
              <th className="text-right px-3 py-3 font-semibold text-emerald-600 w-24">Celkem</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-500 w-24">Rozdíl</th>
            </tr>
          </thead>

          <tbody>
            {/* === INCOME === */}
            <tr className="bg-blue-50/60 border-b border-blue-100">
              <td className="px-4 py-2.5 font-bold text-blue-700 sticky left-0 bg-blue-50/60 z-10">Příjmy</td>
              <td className="px-3 py-2.5 text-right font-bold text-blue-700 text-xs">{fmtFull(tracking.incomeEstimate)}</td>
              {MONTHS.map(m => (
                <Cell key={m} value={tracking.monthlyIncome[m] ?? 0} onCommit={(v) => setIncome(m, v)} color="text-blue-600" />
              ))}
              <td className="px-3 py-2.5 text-right font-bold text-blue-700 text-xs">{totalIncome > 0 ? fmtFull(totalIncome) : ''}</td>
              <DiffCell estimate={tracking.incomeEstimate} actual={totalIncome} />
            </tr>

            {/* === SPEND TOTAL === */}
            <tr className="bg-slate-50 border-b border-slate-200">
              <td className="px-4 py-2.5 font-bold text-slate-700 sticky left-0 bg-slate-50 z-10">Výdaje</td>
              <td className="px-3 py-2.5 text-right font-bold text-slate-700 text-xs">{fmtFull(totalSpendEst)}</td>
              {MONTHS.map(m => {
                const v = plan.reduce((s, i) => s + getActual(i.id, m), 0)
                return <td key={m} className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500">{v > 0 ? fmtFull(v) : ''}</td>
              })}
              <td className="px-3 py-2.5 text-right font-bold text-slate-700 text-xs">{totalSpendActual > 0 ? fmtFull(totalSpendActual) : ''}</td>
              <DiffCell estimate={totalSpendEst} actual={totalSpendActual} />
            </tr>

            {/* === BALANCE === */}
            <tr className="border-b-2 border-slate-300">
              <td className="px-4 py-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10">Bilance</td>
              <td className={`px-3 py-2.5 text-right font-bold text-xs ${tracking.incomeEstimate - totalSpendEst >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {fmtFull(tracking.incomeEstimate - totalSpendEst)}
              </td>
              {MONTHS.map(m => {
                const inc = tracking.monthlyIncome[m] ?? 0
                const spend = plan.reduce((s, i) => s + getActual(i.id, m), 0)
                if (inc === 0 && spend === 0) return <td key={m} className="px-2 py-2.5"></td>
                const bal = inc - spend
                return <td key={m} className={`px-2 py-2.5 text-right text-xs font-bold ${bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtFull(bal)}</td>
              })}
              <td className={`px-3 py-2.5 text-right font-bold text-xs ${totalIncome - totalSpendActual >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {(totalIncome > 0 || totalSpendActual > 0) ? fmtFull(totalIncome - totalSpendActual) : ''}
              </td>
              <td className="px-4 py-2.5"></td>
            </tr>

            {/* === CATEGORIES === */}
            {Object.entries(grouped).map(([category, catItems]) => {
              const catEst = catItems.reduce((s, i) => s + i.amount, 0)
              const catActual = catItems.reduce((s, i) => s + getItemTotal(i.id), 0)
              const isOpen = !collapsed[category]

              return (
                <tbody key={category}>
                  <tr
                    className="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setCollapsed({ ...collapsed, [category]: isOpen })}
                  >
                    <td className="px-4 py-2 font-semibold text-slate-700 sticky left-0 bg-white z-10">
                      <span className="text-[10px] text-slate-300 mr-1.5 inline-block w-3">{isOpen ? '▼' : '▶'}</span>
                      {category}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-600 text-xs">{fmtFull(catEst)}</td>
                    {MONTHS.map(m => {
                      const v = catItems.reduce((s, i) => s + getActual(i.id, m), 0)
                      return <td key={m} className="px-2 py-2 text-right text-xs font-medium text-slate-400">{v > 0 ? fmtFull(v) : ''}</td>
                    })}
                    <td className="px-3 py-2 text-right font-semibold text-emerald-600 text-xs">{catActual > 0 ? fmtFull(catActual) : ''}</td>
                    <DiffCell estimate={catEst} actual={catActual} />
                  </tr>

                  {isOpen && catItems.map(item => {
                    const itemActual = getItemTotal(item.id)
                    return (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-1.5 pl-9 text-slate-500 sticky left-0 bg-white z-10 truncate max-w-[220px]" title={item.name}>
                          {item.name}
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-400 text-xs">{fmtFull(item.amount)}</td>
                        {MONTHS.map(m => (
                          <Cell key={m} value={getActual(item.id, m)} onCommit={(v) => setItemMonth(item.id, m, v)} />
                        ))}
                        <td className="px-3 py-1.5 text-right font-medium text-emerald-600 text-xs">{itemActual > 0 ? fmtFull(itemActual) : ''}</td>
                        <DiffCell estimate={item.amount} actual={itemActual} />
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
