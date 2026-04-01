import { fmtFull } from '../lib/format'

interface Props {
  overall: number
  planTotal: number
}

export function TotalBar({ overall, planTotal }: Props) {
  const remaining = overall - planTotal
  const pctPlan = Math.min((planTotal / overall) * 100, 100)

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-5">
      <div className="flex items-baseline gap-3 mb-3">
        <span className={`text-3xl font-bold ${remaining >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
          {fmtFull(remaining)} Kč
        </span>
        <span className="text-sm text-slate-400">
          zbývá ({fmtFull(overall)} Kč celkem)
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex mb-3">
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${pctPlan}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Můj plán — {fmtFull(planTotal)} Kč
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block" />
          Zbývá — {fmtFull(remaining)} Kč
        </span>
      </div>
    </div>
  )
}
