export interface SourceItem {
  name: string
  amount: number
  category: string
  source: string
  description: string
  owner: string
}

export interface PlanItem {
  id: string
  name: string
  amount: number
  note: string
  category: string     // grouping on the right side
  sourceRef?: string   // "category::name" if dragged from source
}

export interface SourceData {
  budget_categories: Record<string, SourceItem[]>
  oak_categories: Record<string, SourceItem[]>
  budget_total: number
  oak_total: number
  overall_total: number
}

// Phase 2 — Tracking

export const MONTHS = [
  '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09',
  '2026-10', '2026-11', '2026-12',
  '2027-01', '2027-02', '2027-03',
] as const

export const MONTH_LABELS: Record<string, string> = {
  '2026-04': 'Dub 26', '2026-05': 'Kvě 26', '2026-06': 'Čvn 26',
  '2026-07': 'Čvc 26', '2026-08': 'Srp 26', '2026-09': 'Zář 26',
  '2026-10': 'Říj 26', '2026-11': 'Lis 26', '2026-12': 'Pro 26',
  '2027-01': 'Led 27', '2027-02': 'Úno 27', '2027-03': 'Bře 27',
}

/** Monthly actual spend per plan item: { itemId: { "2026-04": 50000, ... } } */
export type MonthlyActuals = Record<string, Record<string, number>>

/** Monthly income: { "2026-04": 4200000, ... } */
export type MonthlyIncome = Record<string, number>

export interface TrackingData {
  incomeEstimate: number          // the overall budget (50M) as income estimate
  monthlyIncome: MonthlyIncome    // actual income per month
  monthlyActuals: MonthlyActuals  // actual spend per item per month
}
