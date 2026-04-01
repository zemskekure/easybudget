import { useEffect, useState, useCallback } from 'react'
import { api } from './lib/api'
import type { SourceData, PlanItem } from './lib/types'
import { TotalBar } from './components/TotalBar'
import { SourcePanel } from './components/SourcePanel'
import { PlanCanvas } from './components/PlanCanvas'

export default function App() {
  const [sources, setSources] = useState<SourceData | null>(null)
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.sources(), api.plan()]).then(([s, p]) => {
      setSources(s)
      setPlan(p)
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

      {/* Two panels */}
      <div className="flex-1 flex min-h-0">
        {/* Left — Source data */}
        <div className="w-1/2 border-r border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-600">Importovaný rozpočet</span>
            <span className="text-xs text-slate-400 ml-2">z Excel souborů</span>
          </div>
          <div className="h-[calc(100%-48px)] overflow-y-auto">
            <SourcePanel
              budgetCategories={sources.budget_categories}
              oakCategories={sources.oak_categories}
              oakTotal={sources.oak_total}
              planItems={plan}
            />
          </div>
        </div>

        {/* Right — Plan canvas */}
        <div className="w-1/2 bg-slate-50 overflow-hidden">
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
      </div>
    </div>
  )
}
