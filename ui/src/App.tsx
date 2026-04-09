import { useEffect, useState, useCallback } from 'react'
import { api } from './lib/api'
import type { SourceData, PlanItem, TrackingData } from './lib/types'
import { TotalBar } from './components/TotalBar'
import { SourcePanel } from './components/SourcePanel'
import { PlanCanvas } from './components/PlanCanvas'
import { TrackingView } from './components/TrackingView'
import { DashboardView } from './components/DashboardView'
import { TeamView } from './components/TeamView'

type Tab = 'dashboard' | 'builder' | 'tracking' | 'team'

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'builder', label: 'Stavba', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
  { id: 'tracking', label: 'Sledování', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'team', label: 'Tým', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showLeft, setShowLeft] = useState(true)
  const [showRight, setShowRight] = useState(true)
  const [sources, setSources] = useState<SourceData | null>(null)
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [tracking, setTracking] = useState<TrackingData>({
    incomeEstimate: 0,
    monthlyIncome: {},
    monthlyActuals: {},
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.sources(), api.plan(), api.tracking()]).then(([s, p, t]) => {
      setSources(s)
      setPlan(p)
      setTracking({ ...t, incomeEstimate: s.overall_total })
      setLoading(false)
    })
  }, [])

  const handleAdd = useCallback(async (item: Omit<PlanItem, 'id'>) => {
    const res = await api.addToPlan(item)
    setPlan(res.items)
  }, [])

  const handleUpdate = useCallback(async (id: string, updates: Partial<PlanItem>) => {
    const res = await api.updatePlanItem(id, updates)
    setPlan(res.items)
  }, [])

  const handleRemove = useCallback(async (id: string) => {
    const res = await api.removeFromPlan(id)
    setPlan(res.items)
  }, [])

  const handleReset = useCallback(async () => {
    await api.savePlan([])
    setPlan([])
  }, [])

  const handleBulkUpdate = useCallback(async (ids: string[], updates: Partial<PlanItem>) => {
    const newPlan = plan.map(p => ids.includes(p.id) ? { ...p, ...updates } : p)
    await api.savePlan(newPlan)
    setPlan(newPlan)
  }, [plan])

  const handleBulkRemove = useCallback(async (ids: string[]) => {
    const idSet = new Set(ids)
    const newPlan = plan.filter(p => !idSet.has(p.id))
    await api.savePlan(newPlan)
    setPlan(newPlan)
  }, [plan])

  const handleTrackingChange = useCallback(async (newTracking: TrackingData) => {
    setTracking(newTracking)
    await api.saveTracking(newTracking)
  }, [])

  if (loading || !sources) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-400 text-sm">Načítám rozpočet...</div>
      </div>
    )
  }

  const planTotal = plan.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="h-screen flex bg-slate-50">

      {/* ── Sidebar ── */}
      <nav className="w-16 hover:w-44 group/nav flex flex-col bg-slate-900 text-white shrink-0 transition-all duration-300 overflow-hidden">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-sm font-black shrink-0">
              E
            </div>
            <span className="text-sm font-bold whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300">
              EasyBudget
            </span>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-3 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const active = tab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/nav:opacity-100 transition-opacity duration-300">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <TotalBar
          overall={sources.overall_total}
          planTotal={planTotal}
        />

        {/* Content */}
        {tab === 'builder' ? (
          <div className="flex-1 flex min-h-0 relative">
            {/* Column toggles */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex bg-white rounded-full shadow-sm border border-slate-200 p-0.5 gap-0.5">
              <button
                onClick={() => setShowLeft(!showLeft)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${showLeft ? 'bg-slate-100 text-slate-600' : 'text-slate-300 hover:text-slate-500'}`}
              >
                Import
              </button>
              <button
                onClick={() => setShowRight(!showRight)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${showRight ? 'bg-slate-100 text-slate-600' : 'text-slate-300 hover:text-slate-500'}`}
              >
                Plán
              </button>
            </div>

            {/* Left — Source data */}
            {showLeft && (
              <div className={`${showRight ? 'w-1/2' : 'w-full'} border-r border-slate-200 bg-white overflow-hidden`}>
                <div className="px-4 py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-600">Importovaný rozpočet</span>
                  <span className="text-xs text-slate-400 ml-2">z Excel souborů</span>
                </div>
                <div className="h-[calc(100%-48px)] overflow-y-auto">
                  <SourcePanel
                    budgetCategories={sources.budget_categories}
                    oakCategories={sources.oak_categories}
                    oakTotal={sources.oak_total}
                    oakFee={sources.oak_fee}
                    planItems={plan}
                  />
                </div>
              </div>
            )}

            {/* Right — Plan canvas */}
            {showRight && (
              <div className={`${showLeft ? 'w-1/2' : 'w-full'} bg-slate-50 overflow-hidden`}>
                <PlanCanvas
                  items={plan}
                  onAdd={handleAdd}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  onReset={handleReset}
                  onBulkUpdate={handleBulkUpdate}
                  onBulkRemove={handleBulkRemove}
                />
              </div>
            )}
          </div>
        ) : tab === 'tracking' ? (
          <div className="flex-1 overflow-auto p-6">
            {plan.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <div className="text-sm">Nejdřív si sestav rozpočet v záložce „Stavba rozpočtu"</div>
              </div>
            ) : (
              <TrackingView
                plan={plan}
                tracking={tracking}
                onTrackingChange={handleTrackingChange}
              />
            )}
          </div>
        ) : tab === 'dashboard' ? (
          <div className="flex-1 overflow-auto p-6">
            <DashboardView
              items={plan}
              sources={sources}
              tracking={tracking}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6">
            <TeamView
              items={plan}
              tracking={tracking}
              onUpdateItem={handleUpdate}
            />
          </div>
        )}
      </div>
    </div>
  )
}
