import { useState } from 'react'
import type { SourceItem, PlanItem } from '../lib/types'
import { SourceBubble } from './SourceBubble'
import { fmtFull } from '../lib/format'

interface Props {
  budgetCategories: Record<string, SourceItem[]>
  oakCategories: Record<string, SourceItem[]>
  oakTotal: number
  planItems: PlanItem[]
}

function CategorySection({
  name,
  items,
  planRefs,
  defaultOpen = false,
}: {
  name: string
  items: SourceItem[]
  planRefs: Set<string>
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const total = items.reduce((s, i) => s + i.amount, 0)

  function handleDragStart(e: React.DragEvent) {
    // Drag all items in the category
    e.dataTransfer.setData('application/json', JSON.stringify(items))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="mb-3">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
        >
          <span className="font-medium text-slate-700 text-sm">{name}</span>
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{items.length} pol.</span>
            <span className="text-xs font-medium text-slate-500">{fmtFull(total)} Kč</span>
            <span className="text-xs text-slate-300">{open ? '▲' : '▼'}</span>
          </span>
        </button>
        <div
          draggable
          onDragStart={handleDragStart}
          className="px-2 py-1 ml-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 transition-colors"
          title={`Přetáhni celou kategorii "${name}"`}
        >
          ⠿
        </div>
      </div>
      {open && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
          {items.map((item, i) => (
            <SourceBubble
              key={`${item.category}-${item.name}-${i}`}
              item={item}
              isInPlan={planRefs.has(`${item.category}::${item.name}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function SourcePanel({ budgetCategories, oakCategories, oakTotal, planItems }: Props) {
  const planRefs = new Set(
    planItems.filter(p => p.sourceRef).map(p => p.sourceRef!)
  )

  function handleOakDragStart(e: React.DragEvent) {
    // Drag only the main OaK items (not Aktivity which are "to discuss")
    const mainOakItems = oakCategories['OaK'] ?? []
    e.dataTransfer.setData('application/json', JSON.stringify(mainOakItems))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* OaK section */}
      <div className="mb-4">
        <div
          draggable
          onDragStart={handleOakDragStart}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg mb-2 cursor-grab active:cursor-grabbing hover:bg-slate-200 transition-colors"
          title="Přetáhni celé OaK do plánu"
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            OaK — Obsah a komunikace
          </span>
          <span className="text-sm font-semibold text-slate-600 ml-auto">{fmtFull(oakTotal)} Kč</span>
          <span className="text-slate-300 hover:text-emerald-500">⠿</span>
        </div>
        {Object.entries(oakCategories).map(([cat, items]) => (
          <CategorySection
            key={cat}
            name={cat}
            items={items}
            planRefs={planRefs}
          />
        ))}
      </div>

      {/* Budget categories */}
      <div>
        <div className="px-3 py-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Rozvojový rozpočet
          </span>
          <span className="text-xs text-slate-400 ml-2">přetáhni do plánu →</span>
        </div>
        {Object.entries(budgetCategories).map(([cat, items]) => (
          <CategorySection
            key={cat}
            name={cat}
            items={items}
            planRefs={planRefs}
            defaultOpen
          />
        ))}
      </div>
    </div>
  )
}
