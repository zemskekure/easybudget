import { fmtCZK, fmtFull } from '../lib/format'
import type { SourceItem } from '../lib/types'

interface Props {
  item: SourceItem
  isInPlan: boolean
}

export function SourceBubble({ item, isInPlan }: Props) {
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable={!isInPlan}
      onDragStart={handleDragStart}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
        transition-all duration-150 select-none
        ${isInPlan
          ? 'bg-slate-100 text-slate-400 cursor-default line-through'
          : 'bg-white border border-slate-200 text-slate-700 cursor-grab hover:border-emerald-300 hover:shadow-sm active:cursor-grabbing'
        }
      `}
      title={`${item.name}: ${fmtFull(item.amount)} Kč${item.description ? '\n' + item.description : ''}${item.owner ? '\n👤 ' + item.owner : ''}`}
    >
      <span className="truncate max-w-[180px]">{item.name}</span>
      <span className={`font-medium ${isInPlan ? 'text-slate-300' : 'text-emerald-600'}`}>
        {fmtFull(item.amount)} Kč
      </span>
    </div>
  )
}
