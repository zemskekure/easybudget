import { useState, useRef, useEffect } from 'react'
import type { PlanItem, TrackingData, MonthlyActuals, MonthlyIncome } from '../lib/types'
import { MONTHS, MONTH_LABELS } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  plan: PlanItem[]
  tracking: TrackingData
  onTrackingChange: (tracking: TrackingData) => void
}

function EditableAmount({
  value,
  onCommit,
  placeholder = '—',
}: {
  value: number
  onCommit: (val: number) => void
  placeholder?: string
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
    if (!isNaN(num)) onCommit(num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-20 bg-white border border-emerald-300 rounded px-1 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-emerald-400"
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  return (
    <span
      className={`cursor-pointer hover:underline text-xs ${value > 0 ? 'text-slate-700' : 'text-slate-300'}`}
      onClick={() => { setEditing(true); setEditVal(value > 0 ? String(value) : '') }}
      title="Klikni pro úpravu"
    >
      {value > 0 ? fmtFull(value) : placeholder}
    </span>
  )
}

export function TrackingView({ plan, tracking, onTrackingChange }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Group plan items by category
  const grouped: Record<string, PlanItem[]> = {}
  for (const item of plan) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  function setItemMonth(itemId: string, month: string, value: number) {
    const newActuals: MonthlyActuals = { ...tracking.monthlyActuals }
    newActuals[itemId] = { ...(newActuals[itemId] || {}), [month]: value }
    onTrackingChange({ ...tracking, monthlyActuals: newActuals })
  }

  function setIncome(month: string, value: number) {
    const newIncome: MonthlyIncome = { ...tracking.monthlyIncome, [month]: value }
    onTrackingChange({ ...tracking, monthlyIncome: newIncome })
  }

  function getItemMonthActual(itemId: string, month: string): number {
    return tracking.monthlyActuals[itemId]?.[month] ?? 0
  }

  function getItemTotalActual(itemId: string): number {
    const months = tracking.monthlyActuals[itemId]
    if (!months) return 0
    return Object.values(months).reduce((s, v) => s + v, 0)
  }

  const totalIncome = Object.values(tracking.monthlyIncome).reduce((s, v) => s + v, 0)
  const totalEstimate = tracking.incomeEstimate
  const totalSpendEstimate = plan.reduce((s, i) => s + i.amount, 0)
  const totalSpendActual = plan.reduce((s, i) => s + getItemTotalActual(i.id), 0)

  function toggleCategory(cat: string) {
    setCollapsed({ ...collapsed, [cat]: !collapsed[cat] })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead className="sticky top-0 bg-white z-10">
          <tr className="border-b border-slate-200">
            <th className="text-left px-3 py-2 font-medium text-slate-500 min-w-[200px] sticky left-0 bg-white">Položka</th>
            <th className="text-right px-2 py-2 font-medium text-slate-500 min-w-[90px]">Odhad</th>
            {MONTHS.map(m => (
              <th key={m} className="text-right px-2 py-2 font-medium text-slate-400 min-w-[80px]">{MONTH_LABELS[m]}</th>
            ))}
            <th className="text-right px-2 py-2 font-medium text-emerald-600 min-w-[90px]">Skutečnost</th>
            <th className="text-right px-3 py-2 font-medium text-slate-500 min-w-[90px]">Rozdíl</th>
          </tr>
        </thead>
        <tbody>
          {/* Income row */}
          <tr className="bg-blue-50 border-b border-blue-100">
            <td className="px-3 py-2 font-semibold text-blue-700 sticky left-0 bg-blue-50">Příjmy</td>
            <td className="px-2 py-2 text-right font-semibold text-blue-700">{fmtFull(totalEstimate)}</td>
            {MONTHS.map(m => (
              <td key={m} className="px-2 py-2 text-right">
                <EditableAmount
                  value={tracking.monthlyIncome[m] ?? 0}
                  onCommit={(v) => setIncome(m, v)}
                />
              </td>
            ))}
            <td className="px-2 py-2 text-right font-semibold text-blue-700">{fmtFull(totalIncome)}</td>
            <td className={`px-3 py-2 text-right font-semibold ${totalIncome - totalEstimate >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmtFull(totalIncome - totalEstimate)}
            </td>
          </tr>

          {/* Spend total row */}
          <tr className="bg-slate-50 border-b border-slate-200">
            <td className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-slate-50">Výdaje celkem</td>
            <td className="px-2 py-2 text-right font-semibold text-slate-700">{fmtFull(totalSpendEstimate)}</td>
            {MONTHS.map(m => {
              const monthTotal = plan.reduce((s, i) => s + getItemMonthActual(i.id, m), 0)
              return <td key={m} className="px-2 py-2 text-right font-medium text-slate-500">{monthTotal > 0 ? fmtFull(monthTotal) : '—'}</td>
            })}
            <td className="px-2 py-2 text-right font-semibold text-slate-700">{fmtFull(totalSpendActual)}</td>
            <td className={`px-3 py-2 text-right font-semibold ${totalSpendEstimate - totalSpendActual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmtFull(totalSpendEstimate - totalSpendActual)}
            </td>
          </tr>

          {/* Balance row */}
          <tr className="border-b-2 border-slate-300">
            <td className="px-3 py-2 font-bold text-slate-900 sticky left-0 bg-white">Bilance</td>
            <td className="px-2 py-2 text-right font-bold text-slate-900">{fmtFull(totalEstimate - totalSpendEstimate)}</td>
            {MONTHS.map(m => {
              const inc = tracking.monthlyIncome[m] ?? 0
              const spend = plan.reduce((s, i) => s + getItemMonthActual(i.id, m), 0)
              const bal = inc - spend
              return <td key={m} className={`px-2 py-2 text-right font-medium ${bal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {(inc > 0 || spend > 0) ? fmtFull(bal) : '—'}
              </td>
            })}
            <td className={`px-2 py-2 text-right font-bold ${totalIncome - totalSpendActual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmtFull(totalIncome - totalSpendActual)}
            </td>
            <td className="px-3 py-2"></td>
          </tr>

          {/* Category groups */}
          {Object.entries(grouped).map(([category, catItems]) => {
            const catEstimate = catItems.reduce((s, i) => s + i.amount, 0)
            const catActual = catItems.reduce((s, i) => s + getItemTotalActual(i.id), 0)
            const isCollapsed = collapsed[category]

            return (
              <tbody key={category}>
                {/* Category header */}
                <tr
                  className="bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                  onClick={() => toggleCategory(category)}
                >
                  <td className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-slate-50">
                    <span className="text-slate-300 mr-1">{isCollapsed ? '▶' : '▼'}</span>
                    {category}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-600">{fmtFull(catEstimate)}</td>
                  {MONTHS.map(m => {
                    const monthCat = catItems.reduce((s, i) => s + getItemMonthActual(i.id, m), 0)
                    return <td key={m} className="px-2 py-2 text-right text-slate-500">{monthCat > 0 ? fmtFull(monthCat) : ''}</td>
                  })}
                  <td className="px-2 py-2 text-right font-semibold text-emerald-600">{catActual > 0 ? fmtFull(catActual) : '—'}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${catEstimate - catActual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmtFull(catEstimate - catActual)}
                  </td>
                </tr>

                {/* Item rows */}
                {!isCollapsed && catItems.map(item => {
                  const itemActual = getItemTotalActual(item.id)
                  const diff = item.amount - itemActual
                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-emerald-50/20">
                      <td className="px-3 py-1.5 pl-8 text-slate-600 sticky left-0 bg-white">{item.name}</td>
                      <td className="px-2 py-1.5 text-right text-slate-500">{fmtFull(item.amount)}</td>
                      {MONTHS.map(m => (
                        <td key={m} className="px-2 py-1.5 text-right">
                          <EditableAmount
                            value={getItemMonthActual(item.id, m)}
                            onCommit={(v) => setItemMonth(item.id, m, v)}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right font-medium text-emerald-600">
                        {itemActual > 0 ? fmtFull(itemActual) : '—'}
                      </td>
                      <td className={`px-3 py-1.5 text-right ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {itemActual > 0 ? fmtFull(diff) : '—'}
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
  )
}
