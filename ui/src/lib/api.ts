import type { SourceData, PlanItem, TrackingData } from './types'

const STORAGE_KEY = 'easybudget-plan'
const TRACKING_KEY = 'easybudget-tracking'

function loadLocalPlan(): PlanItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalPlan(items: PlanItem[]): PlanItem[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  return items
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// Try backend first, fall back to static JSON + localStorage
async function fetchSources(): Promise<SourceData> {
  try {
    const res = await fetch('/api/sources')
    if (res.ok) return res.json()
  } catch { /* backend not available */ }
  // Static fallback (GitHub Pages)
  const res = await fetch(`${import.meta.env.BASE_URL}sources.json`)
  return res.json()
}

async function fetchPlan(): Promise<PlanItem[]> {
  try {
    const res = await fetch('/api/plan')
    if (res.ok) return res.json()
  } catch { /* backend not available */ }
  return loadLocalPlan()
}

async function postPlan(path: string, body: unknown): Promise<{ ok: boolean; items: PlanItem[] }> {
  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return res.json()
  } catch { /* backend not available */ }

  // localStorage fallback
  const plan = loadLocalPlan()

  if (path === '/plan/add') {
    const item = { ...body as Omit<PlanItem, 'id'>, id: genId() } as PlanItem
    const items = [...plan, item]
    return { ok: true, items: saveLocalPlan(items) }
  }
  if (path === '/plan/remove') {
    const { id } = body as { id: string }
    const items = plan.filter(p => p.id !== id)
    return { ok: true, items: saveLocalPlan(items) }
  }
  if (path === '/plan/update') {
    const { id, updates } = body as { id: string; updates: Partial<PlanItem> }
    const items = plan.map(p => p.id === id ? { ...p, ...updates } : p)
    return { ok: true, items: saveLocalPlan(items) }
  }
  if (path === '/plan') {
    const { items } = body as { items: PlanItem[] }
    return { ok: true, items: saveLocalPlan(items) }
  }

  return { ok: true, items: plan }
}

function loadLocalTracking(): TrackingData {
  try {
    const raw = localStorage.getItem(TRACKING_KEY)
    return raw ? JSON.parse(raw) : { incomeEstimate: 0, monthlyIncome: {}, monthlyActuals: {} }
  } catch {
    return { incomeEstimate: 0, monthlyIncome: {}, monthlyActuals: {} }
  }
}

async function fetchTracking(): Promise<TrackingData> {
  try {
    const res = await fetch('/api/tracking')
    if (res.ok) return res.json()
  } catch { /* backend not available */ }
  return loadLocalTracking()
}

async function saveTracking(data: TrackingData): Promise<void> {
  localStorage.setItem(TRACKING_KEY, JSON.stringify(data))
  try {
    await fetch('/api/tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* backend not available */ }
}

export const api = {
  sources: fetchSources,
  plan: fetchPlan,
  addToPlan: (item: Omit<PlanItem, 'id'>) =>
    postPlan('/plan/add', item),
  removeFromPlan: (id: string) =>
    postPlan('/plan/remove', { id }),
  updatePlanItem: (id: string, updates: Partial<PlanItem>) =>
    postPlan('/plan/update', { id, updates }),
  savePlan: (items: PlanItem[]) =>
    postPlan('/plan', { items }),
  tracking: fetchTracking,
  saveTracking,
}
