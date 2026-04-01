import { useState, useRef, useEffect } from 'react'
import type { PlanItem } from '../lib/types'
import { fmtFull } from '../lib/format'

interface Props {
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onRemove: (id: string) => void
  onBulkUpdate: (ids: string[], updates: Partial<PlanItem>) => void
  onBulkRemove: (ids: string[]) => void
}

function EditableCell({
  value,
  displayValue,
  onCommit,
  align = 'left',
  className = '',
}: {
  value: string
  displayValue?: string
  onCommit: (val: string) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function commit() {
    if (editVal.trim() !== value) onCommit(editVal.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`bg-white border border-emerald-300 rounded px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-emerald-400 w-full ${align === 'right' ? 'text-right' : ''}`}
        value={editVal}
        onChange={(e) => setEditVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
      />
    )
  }

  return (
    <span
      className={`cursor-pointer hover:underline ${className}`}
      onClick={() => { setEditing(true); setEditVal(value) }}
    >
      {displayValue ?? value}
    </span>
  )
}

function ListCategory({
  category,
  items,
  onUpdate,
  onRemove,
  onBulkUpdate,
  onBulkRemove,
}: {
  category: string
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onRemove: (id: string) => void
  onBulkUpdate: (ids: string[], updates: Partial<PlanItem>) => void
  onBulkRemove: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const catTotal = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center group/cat">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg hover:bg-slate-100 text-left transition-colors"
        >
          <EditableCell
            value={category}
            onCommit={(newName) => {
              onBulkUpdate(items.map(i => i.id), { category: newName })
            }}
            className="font-semibold text-slate-700 text-sm"
          />
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{items.length} pol.</span>
            <span className="text-sm font-medium text-emerald-600">{fmtFull(catTotal)} Kč</span>
            <span className="text-xs text-slate-300">{open ? '▲' : '▼'}</span>
          </span>
        </button>
        <button
          onClick={() => onBulkRemove(items.map(i => i.id))}
          className="opacity-0 group-hover/cat:opacity-100 px-2 py-1 ml-1 text-slate-300 hover:text-red-500 text-xs transition-all"
        >
          ✕
        </button>
      </div>

      {/* Item rows */}
      {open && (
        <table className="w-full text-sm">
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="group/row border-b border-slate-100 hover:bg-emerald-50/30">
                <td className="px-3 py-1.5 w-full">
                  <EditableCell
                    value={item.name}
                    onCommit={(val) => onUpdate(item.id, { name: val })}
                    className="text-slate-700"
                  />
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  <EditableCell
                    value={String(item.amount)}
                    displayValue={fmtFull(item.amount)}
                    onCommit={(val) => {
                      const num = parseFloat(val.replace(/\s/g, '').replace(',', '.'))
                      if (!isNaN(num)) onUpdate(item.id, { amount: num })
                    }}
                    align="right"
                    className="text-emerald-600 font-medium"
                  />
                  <span className="text-slate-400 ml-1">Kč</span>
                </td>
                <td className="px-1 py-1.5 w-8">
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-500 text-xs transition-all"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function PlanListView({ items, onUpdate, onRemove, onBulkUpdate, onBulkRemove }: Props) {
  const grouped: Record<string, PlanItem[]> = {}
  for (const item of items) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, catItems]) => (
        <ListCategory
          key={category}
          category={category}
          items={catItems}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onBulkUpdate={onBulkUpdate}
          onBulkRemove={onBulkRemove}
        />
      ))}
    </div>
  )
}
