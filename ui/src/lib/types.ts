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
