import { useEffect, useState, useCallback } from 'react'
import { api } from './lib/api'
import type { SourceData, PlanItem, TrackingData } from './lib/types'
import { TotalBar } from './components/TotalBar'
import { SourcePanel } from './components/SourcePanel'
import { PlanCanvas } from './components/PlanCanvas'
import { TrackingView } from './components/TrackingView'

type Tab = 'builder' | 'tracking'

export default function App() {
  const [tab, setTab] = useState<Tab>('builder')
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
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top bar */}
      <TotalBar
        overall={sources.overall_total}
        planTotal={planTotal}
      />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('builder')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'builder'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Stavba rozpočtu
          </button>
          <button
            onClick={() => setTab('tracking')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'tracking'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Sledování
          </button>
        </div>
      </div>

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
      ) : (
        <div className="flex-1 overflow-auto p-6">
          {plan.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <div className="text-sm">Nejdřív si sestav rozpočet v záložce "Stavba rozpočtu"</div>
            </div>
          ) : (
            <TrackingView
              plan={plan}
              tracking={tracking}
              onTrackingChange={handleTrackingChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
