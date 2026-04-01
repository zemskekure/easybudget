import { useState, useRef, useEffect } from 'react'
import { fmtCZK, fmtFull } from '../lib/format'
import type { PlanItem } from '../lib/types'

interface Props {
  item: PlanItem
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onRemove: (id: string) => void
}

export function PlanBubble({ item, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState<'name' | 'amount' | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function startEdit(field: 'name' | 'amount') {
    setEditing(field)
    setEditValue(field === 'amount' ? String(item.amount) : item.name)
  }

  function commitEdit() {
    if (!editing) return
    if (editing === 'name' && editValue.trim()) {
      onUpdate(item.id, { name: editValue.trim() })
    } else if (editing === 'amount') {
      const num = parseFloat(editValue.replace(/\s/g, '').replace(',', '.'))
      if (!isNaN(num) && num >= 0) {
        onUpdate(item.id, { amount: num })
      }
    }
    setEditing(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditing(null)
  }

  return (
    <div className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-sm transition-all duration-150 hover:shadow-sm">
      {/* Name */}
      {editing === 'name' ? (
        <input
          ref={inputRef}
          className="bg-white border border-emerald-300 rounded-md px-2 py-0.5 text-sm w-40 outline-none focus:ring-1 focus:ring-emerald-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className="cursor-pointer hover:underline text-slate-800 truncate max-w-[200px]"
          onClick={() => startEdit('name')}
          title={`${item.name}\nKlikni pro úpravu`}
        >
          {item.name}
        </span>
      )}

      {/* Amount */}
      {editing === 'amount' ? (
        <input
          ref={inputRef}
          className="bg-white border border-emerald-300 rounded-md px-2 py-0.5 text-sm w-24 text-right outline-none focus:ring-1 focus:ring-emerald-400"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className="font-semibold text-emerald-700 cursor-pointer hover:underline"
          onClick={() => startEdit('amount')}
          title={`${fmtFull(item.amount)} Kč\nKlikni pro úpravu`}
        >
          {fmtFull(item.amount)} Kč
        </span>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity ml-1 text-xs"
        title="Odebrat"
      >
        ✕
      </button>
    </div>
  )
}
