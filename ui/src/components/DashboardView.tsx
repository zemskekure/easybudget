import { useState } from 'react'
import type { PlanItem, SourceData, TrackingData } from '../lib/types'
import { MONTHS, MONTH_LABELS } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  items: PlanItem[]
  sources: SourceData
  tracking: TrackingData
}

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#e11d48', '#a855f7', '#eab308', '#22d3ee',
]

interface CategoryStat {
  name: string
  amount: number
  count: number
  pct: number
  color: string
  actualTotal: number
}

function groupStats(
  items: readonly PlanItem[],
  tracking: TrackingData,
): CategoryStat[] {
  const map: Record<string, { amount: number; count: number; actualTotal: number }> = {}
  for (const item of items) {
    const cat = item.category || 'Bez kategorie'
    if (!map[cat]) map[cat] = { amount: 0, count: 0, actualTotal: 0 }
    map[cat].amount += item.amount
    map[cat].count += 1
    const actuals = tracking.monthlyActuals[item.id]
    if (actuals) {
      map[cat].actualTotal += Object.values(actuals).reduce((s, v) => s + v, 0)
    }
  }
  const total = items.reduce((s, i) => s + i.amount, 0)
  return Object.entries(map)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .map(([name, { amount, count, actualTotal }], i) => ({
      name,
      amount,
      count,
      pct: total > 0 ? (amount / total) * 100 : 0,
      color: COLORS[i % COLORS.length],
      actualTotal,
    }))
}

function getMonthlySpend(items: readonly PlanItem[], tracking: TrackingData) {
  return MONTHS.map(m => {
    const spend = items.reduce((s, item) => {
      return s + (tracking.monthlyActuals[item.id]?.[m] ?? 0)
    }, 0)
    return { month: m, label: MONTH_LABELS[m], spend }
  })
}

export function DashboardView({ items, sources, tracking }: Props) {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-300">
        <div className="text-sm">Nejdřív si sestav rozpočet v záložce „Stavba rozpočtu"</div>
      </div>
    )
  }

  const planTotal = items.reduce((s, i) => s + i.amount, 0)
  const budget = sources.overall_total
  const remaining = budget - planTotal
  const usedPct = budget > 0 ? (planTotal / budget) * 100 : 0
  const categories = groupStats(items, tracking)
  const totalActual = items.reduce((s, item) => {
    const a = tracking.monthlyActuals[item.id]
    return s + (a ? Object.values(a).reduce((ss, v) => ss + v, 0) : 0)
  }, 0)
  const totalIncome = Object.values(tracking.monthlyIncome).reduce((s, v) => s + v, 0)
  const monthly = getMonthlySpend(items, tracking)
  const avgItem = items.length > 0 ? planTotal / items.length : 0
  const largestCat = categories[0]
  const topItems = [...items].sort((a, b) => b.amount - a.amount).slice(0, 8)
  const maxTopItem = topItems[0]?.amount ?? 1

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* === ROW 1: KPI CARDS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Celkový rozpočet"
          value={fmtFull(budget)}
          unit="Kč"
          accent="slate"
        />
        <KpiCard
          label="Naplánováno"
          value={fmtFull(planTotal)}
          unit="Kč"
          sub={`${usedPct.toFixed(1)} % rozpočtu`}
          accent="emerald"
        />
        <KpiCard
          label="Zbývající"
          value={fmtFull(remaining)}
          unit="Kč"
          sub={remaining < 0 ? 'PŘEKROČENO' : undefined}
          accent={remaining < 0 ? 'red' : 'blue'}
        />
        <KpiCard
          label="Skutečné výdaje"
          value={totalActual > 0 ? fmtFull(totalActual) : '—'}
          unit={totalActual > 0 ? 'Kč' : ''}
          sub={totalActual > 0 ? `${((totalActual / planTotal) * 100).toFixed(1)} % plánu` : 'zatím bez dat'}
          accent="violet"
        />
      </div>

      {/* === ROW 2: Mini stats === */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <MiniStat label="Položek" value={String(items.length)} />
        <MiniStat label="Kategorií" value={String(categories.length)} />
        <MiniStat label="Průměr / položka" value={`${fmtFull(avgItem)} Kč`} />
        <MiniStat label="Největší kat." value={largestCat?.name ?? '—'} />
        <MiniStat label="Celkový příjem" value={totalIncome > 0 ? `${fmtFull(totalIncome)} Kč` : '—'} />
        <MiniStat label="Stav" value={remaining >= 0 ? 'V limitu' : 'Překročen'} highlight={remaining < 0} />
      </div>

      {/* === ROW 3: BUDGET USAGE BAR === */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700">Využití rozpočtu</span>
          <span className="text-xs text-slate-400">{fmtFull(planTotal)} / {fmtFull(budget)} Kč</span>
        </div>
        <BudgetBar categories={categories} total={budget} />
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
          {categories.map(cat => (
            <div key={cat.name} className="flex items-center gap-1.5 text-xs text-slate-500">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
              <span className="truncate max-w-[140px]">{cat.name}</span>
              <span className="text-slate-400 tabular-nums">{cat.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* === ROW 4: DONUT + HORIZONTAL BAR === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Donut chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Rozložení podle kategorií</h3>
          <div className="flex items-center gap-6">
            <DonutChart
              categories={categories}
              total={planTotal}
              hoveredCat={hoveredCat}
              onHover={setHoveredCat}
            />
            <div className="flex-1 space-y-2 min-w-0">
              {categories.map(cat => (
                <div
                  key={cat.name}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-default ${
                    hoveredCat === cat.name ? 'bg-slate-50' : ''
                  }`}
                  onMouseEnter={() => setHoveredCat(cat.name)}
                  onMouseLeave={() => setHoveredCat(null)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs text-slate-600 truncate flex-1">{cat.name}</span>
                  <span className="text-xs font-semibold text-slate-800 tabular-nums shrink-0">
                    {fmtFull(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Horizontal bar — Estimate vs Actual */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Odhad vs realita podle kategorií</h3>
          <div className="space-y-3">
            {categories.map(cat => {
              const maxVal = Math.max(cat.amount, cat.actualTotal, 1)
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600 truncate max-w-[200px]">{cat.name}</span>
                    <div className="flex gap-3 text-[10px] tabular-nums">
                      <span className="text-slate-400">Plán: {fmtFull(cat.amount)}</span>
                      <span className="text-emerald-600 font-medium">
                        Realita: {cat.actualTotal > 0 ? fmtFull(cat.actualTotal) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(cat.amount / maxVal) * 100}%`, background: cat.color, opacity: 0.35 }}
                      />
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(cat.actualTotal / maxVal) * 100}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* === ROW 5: MONTHLY SPEND CHART + TOP ITEMS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Monthly spend bar chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Měsíční výdaje</h3>
          <MonthlyBarChart data={monthly} />
        </div>

        {/* Top items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Největší položky</h3>
          <div className="space-y-2.5">
            {topItems.map((item, i) => {
              const pct = (item.amount / maxTopItem) * 100
              const catStat = categories.find(c => c.name === item.category)
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-300 w-4 shrink-0">{i + 1}</span>
                      <span className="text-xs text-slate-600 truncate">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-800 tabular-nums shrink-0 ml-2">
                      {fmtFull(item.amount)} Kč
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden ml-6">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: catStat?.color ?? '#94a3b8' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* === ROW 6: FULL TABLE === */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Všechny položky</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Položka</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategorie</th>
              <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Plán</th>
              <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Realita</th>
              <th className="text-right px-6 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-28">Stav</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              const catItems = items.filter(i => (i.category || 'Bez kategorie') === cat.name)
              return catItems.map(item => {
                const actual = tracking.monthlyActuals[item.id]
                  ? Object.values(tracking.monthlyActuals[item.id]).reduce((s, v) => s + v, 0)
                  : 0
                const diff = item.amount - actual
                return (
                  <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-2.5 text-slate-700">{item.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        {cat.name}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-right tabular-nums font-medium text-slate-800">
                      {fmtFull(item.amount)}
                    </td>
                    <td className="px-6 py-2.5 text-right tabular-nums text-slate-500">
                      {actual > 0 ? fmtFull(actual) : '—'}
                    </td>
                    <td className="px-6 py-2.5 text-right">
                      {actual > 0 ? (
                        <span className={`text-xs font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {diff > 0 ? '+' : ''}{fmtFull(diff)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50/80 border-t border-emerald-100">
              <td colSpan={2} className="px-6 py-3 text-sm font-bold text-emerald-800">Celkem</td>
              <td className="px-6 py-3 text-right text-sm font-bold text-emerald-800 tabular-nums">{fmtFull(planTotal)}</td>
              <td className="px-6 py-3 text-right text-sm font-bold text-emerald-700 tabular-nums">
                {totalActual > 0 ? fmtFull(totalActual) : '—'}
              </td>
              <td className="px-6 py-3 text-right">
                {totalActual > 0 ? (
                  <span className={`text-sm font-bold tabular-nums ${planTotal - totalActual >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {planTotal - totalActual > 0 ? '+' : ''}{fmtFull(planTotal - totalActual)}
                  </span>
                ) : (
                  <span className="text-sm text-slate-300">—</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

/* ─── KPI Card ─── */

function KpiCard({ label, value, unit, sub, accent }: {
  label: string
  value: string
  unit: string
  sub?: string
  accent: 'emerald' | 'blue' | 'red' | 'violet' | 'slate'
}) {
  const ring = {
    emerald: 'ring-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
    blue: 'ring-blue-200 bg-gradient-to-br from-blue-50 to-white',
    red: 'ring-red-200 bg-gradient-to-br from-red-50 to-white',
    violet: 'ring-violet-200 bg-gradient-to-br from-violet-50 to-white',
    slate: 'ring-slate-200 bg-gradient-to-br from-slate-50 to-white',
  }[accent]

  const text = {
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    red: 'text-red-600',
    violet: 'text-violet-700',
    slate: 'text-slate-800',
  }[accent]

  return (
    <div className={`rounded-2xl ring-1 p-5 ${ring}`}>
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-2 tabular-nums ${text}`}>
        {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
      </div>
      {sub && (
        <div className={`text-xs mt-1 ${sub === 'PŘEKROČENO' ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ─── Mini Stat ─── */

function MiniStat({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold mt-1 truncate ${highlight ? 'text-red-500' : 'text-slate-700'}`}>
        {value}
      </div>
    </div>
  )
}

/* ─── Stacked Budget Bar ─── */

function BudgetBar({ categories, total }: { categories: readonly CategoryStat[]; total: number }) {
  if (total <= 0) return null
  return (
    <div className="h-5 bg-slate-100 rounded-full overflow-hidden flex">
      {categories.map(cat => (
        <div
          key={cat.name}
          className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full"
          style={{ width: `${(cat.amount / total) * 100}%`, background: cat.color }}
          title={`${cat.name}: ${fmtFull(cat.amount)} Kč (${cat.pct.toFixed(1)}%)`}
        />
      ))}
    </div>
  )
}

/* ─── Donut Chart (SVG) ─── */

function DonutChart({ categories, total, hoveredCat, onHover }: {
  categories: readonly CategoryStat[]
  total: number
  hoveredCat: string | null
  onHover: (name: string | null) => void
}) {
  const size = 180
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth}
        />
        {/* Category arcs */}
        {categories.map(cat => {
          const pct = total > 0 ? cat.amount / total : 0
          const dashLen = pct * circumference
          const dashOffset = -offset
          offset += dashLen
          const isHovered = hoveredCat === cat.name
          return (
            <circle
              key={cat.name}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={cat.color}
              strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: hoveredCat && !isHovered ? 0.35 : 1 }}
              onMouseEnter={() => onHover(cat.name)}
              onMouseLeave={() => onHover(null)}
            />
          )
        })}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hoveredCat ? (
          <>
            <div className="text-xs text-slate-400 truncate max-w-[90px] text-center">{hoveredCat}</div>
            <div className="text-base font-bold text-slate-800 tabular-nums">
              {fmtFull(categories.find(c => c.name === hoveredCat)?.amount ?? 0)}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-400">Celkem</div>
            <div className="text-base font-bold text-slate-800 tabular-nums">{fmtFull(total)}</div>
            <div className="text-[10px] text-slate-400">Kč</div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─── Monthly Bar Chart (SVG) ─── */

function MonthlyBarChart({ data }: {
  data: readonly { month: string; label: string; spend: number }[]
}) {
  const maxSpend = Math.max(...data.map(d => d.spend), 1)
  const hasAnyData = data.some(d => d.spend > 0)
  const barWidth = 36
  const chartH = 160
  const gap = 6
  const totalW = data.length * (barWidth + gap) - gap

  if (!hasAnyData) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-300 text-xs">
        Zatím žádná data o měsíčních výdajích
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <svg width={totalW + 20} height={chartH + 40} className="mx-auto block">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = chartH - pct * chartH + 10
          return (
            <g key={pct}>
              <line x1={0} x2={totalW + 20} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              {pct > 0 && (
                <text x={totalW + 18} y={y - 2} fill="#cbd5e1" fontSize={8} textAnchor="end">
                  {fmtFull(maxSpend * pct)}
                </text>
              )}
            </g>
          )
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const barH = d.spend > 0 ? (d.spend / maxSpend) * chartH : 0
          const x = i * (barWidth + gap) + 10
          const y = chartH - barH + 10
          return (
            <g key={d.month}>
              <rect
                x={x} y={y} width={barWidth} height={barH}
                rx={4} fill="#10b981"
                className="transition-all duration-500"
                opacity={d.spend > 0 ? 0.8 : 0.1}
              />
              {d.spend > 0 && (
                <text
                  x={x + barWidth / 2} y={y - 4}
                  fill="#64748b" fontSize={8} textAnchor="middle"
                  className="tabular-nums"
                >
                  {fmtFull(d.spend)}
                </text>
              )}
              <text
                x={x + barWidth / 2} y={chartH + 26}
                fill="#94a3b8" fontSize={9} textAnchor="middle"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
