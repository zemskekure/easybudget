import { useState } from 'react'
import type { PlanItem, SourceItem } from '../lib/types'
import { PlanBubble } from './PlanBubble'
import { PlanListView } from './PlanListView'
import { fmtFull } from '../lib/format'

type ViewMode = 'bubbles' | 'list'

interface Props {
  items: PlanItem[]
  onAdd: (item: Omit<PlanItem, 'id'>) => void
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onRemove: (id: string) => void
  onReset: () => void
  onBulkUpdate: (ids: string[], updates: Partial<PlanItem>) => void
  onBulkRemove: (ids: string[]) => void
}

function PlanCategory({
  category,
  items,
  onUpdate,
  onRemove,
  onRename,
  onDelete,
  onDropInto,
  onMoveItem,
}: {
  category: string
  items: PlanItem[]
  onUpdate: (id: string, updates: Partial<PlanItem>) => void
  onRemove: (id: string) => void
  onRename: (oldName: string, newName: string) => void
  onDelete: (category: string) => void
  onDropInto: (category: string, data: string) => void
  onMoveItem: (itemId: string, toCategory: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(category)
  const [dragOver, setDragOver] = useState(false)
  const total = items.reduce((s, i) => s + i.amount, 0)

  function commitRename() {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== category) {
      onRename(category, trimmed)
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') { setEditValue(category); setEditing(false) }
  }

  return (
    <div
      className={`mb-3 group/cat rounded-lg transition-colors ${dragOver ? 'bg-emerald-50 ring-1 ring-emerald-300' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        // Internal move (plan item between categories)
        const planItemId = e.dataTransfer.getData('application/x-plan-item')
        if (planItemId) {
          onMoveItem(planItemId, category)
          return
        }
        // External drop (from source panel)
        const raw = e.dataTransfer.getData('application/json')
        if (raw) onDropInto(category, raw)
      }}
    >
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/50 text-left transition-colors"
        >
          {editing ? (
            <input
              className="font-medium text-slate-700 text-sm bg-white border border-emerald-300 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-emerald-400 w-48"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="font-medium text-slate-700 text-sm cursor-pointer hover:underline"
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(category) }}
              title="Klikni pro přejmenování"
            >
              {category}
            </span>
          )}
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{items.length} pol.</span>
            <span className="text-xs font-medium text-emerald-600">{fmtFull(total)} Kč</span>
            <span className="text-xs text-slate-300">{open ? '▲' : '▼'}</span>
          </span>
        </button>
        <button
          onClick={() => onDelete(category)}
          className="opacity-0 group-hover/cat:opacity-100 px-2 py-1 text-slate-300 hover:text-red-500 transition-all text-xs"
          title="Smazat celou kategorii"
        >
          ✕
        </button>
      </div>
      {open && (
        <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1">
          {items.map((item) => (
            <PlanBubble
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function PlanCanvas({ items, onAdd, onUpdate, onRemove, onReset, onBulkUpdate, onBulkRemove }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('bubbles')
  const [dragOver, setDragOver] = useState(false)
  const [showNewItem, setShowNewItem] = useState(false)
  const [showNewCat, setShowNewCat] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newCatName, setNewCatName] = useState('')

  const total = items.reduce((s, i) => s + i.amount, 0)

  // Group items by category
  const grouped: Record<string, PlanItem[]> = {}
  for (const item of items) {
    const cat = item.category || 'Bez kategorie'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    // Ignore internal moves that land on the canvas background
    if (e.dataTransfer.getData('application/x-plan-item')) return
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      const sources: SourceItem[] = Array.isArray(data) ? data : [data]
      for (const source of sources) {
        onAdd({
          name: source.name,
          amount: source.amount,
          note: source.description || '',
          category: source.category || 'Bez kategorie',
          sourceRef: `${source.category}::${source.name}`,
        })
      }
    } catch {
      // ignore bad data
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  // Existing categories for the dropdown
  const existingCategories = Object.keys(grouped)

  function handleAddItem() {
    if (!newName.trim()) return
    const amount = parseFloat(newAmount.replace(/\s/g, '').replace(',', '.')) || 0
    const category = newCategory.trim() || 'Bez kategorie'
    onAdd({ name: newName.trim(), amount, note: '', category })
    setNewName('')
    setNewAmount('')
    setNewCategory('')
    setShowNewItem(false)
  }

  function handleAddCategory() {
    if (!newCatName.trim()) return
    // Create an empty placeholder item so the category appears
    onAdd({ name: '(nová položka)', amount: 0, note: '', category: newCatName.trim() })
    setNewCatName('')
    setShowNewCat(false)
  }

  function handleItemKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddItem()
    if (e.key === 'Escape') setShowNewItem(false)
  }

  function handleCatKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddCategory()
    if (e.key === 'Escape') setShowNewCat(false)
  }

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-200 ${
        dragOver ? 'bg-emerald-50' : ''
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Můj plán</span>
          <span className="text-xs text-slate-400">
            {items.length} {items.length === 1 ? 'položka' : 'položek'}
          </span>
          {items.length > 0 && (
            <>
              <div className="flex bg-slate-100 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode('bubbles')}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${viewMode === 'bubbles' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                >
                  Bubliny
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${viewMode === 'list' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                >
                  Seznam
                </button>
              </div>
              <button
                onClick={onReset}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                title="Vymazat celý plán"
              >
                Vymazat vše
              </button>
            </>
          )}
        </div>
        <span className="text-sm font-semibold text-emerald-600">
          {fmtFull(total)} Kč
        </span>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 && !dragOver ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300">
            <div className="text-4xl mb-3">+</div>
            <div className="text-sm">Přetáhni položky sem</div>
            <div className="text-xs mt-1">nebo vytvoř vlastní</div>
          </div>
        ) : viewMode === 'list' ? (
          <PlanListView
            items={items}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onBulkUpdate={onBulkUpdate}
            onBulkRemove={onBulkRemove}
          />
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <PlanCategory
              key={category}
              category={category}
              items={catItems}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onRename={(oldName, newName) => {
                const ids = catItems.map(i => i.id)
                onBulkUpdate(ids, { category: newName })
              }}
              onDelete={(cat) => {
                const ids = catItems.map(i => i.id)
                onBulkRemove(ids)
              }}
              onDropInto={(targetCategory, raw) => {
                try {
                  const data = JSON.parse(raw)
                  const sources: SourceItem[] = Array.isArray(data) ? data : [data]
                  for (const source of sources) {
                    onAdd({
                      name: source.name,
                      amount: source.amount,
                      note: source.description || '',
                      category: targetCategory,
                      sourceRef: `${source.category}::${source.name}`,
                    })
                  }
                } catch { /* ignore */ }
              }}
              onMoveItem={(itemId, toCategory) => {
                onUpdate(itemId, { category: toCategory })
              }}
            />
          ))
        )}

        {dragOver && (
          <div className="mt-4 border-2 border-dashed border-emerald-300 rounded-2xl p-6 text-center text-emerald-500 text-sm">
            Pusť sem pro přidání do plánu
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="border-t border-slate-100 px-4 py-3 space-y-2">
        {showNewCat && (
          <div className="flex gap-2">
            <input
              className="flex-1 border border-slate-200 rounded-full px-3 py-1.5 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
              placeholder="Název kategorie..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={handleCatKeyDown}
              autoFocus
            />
            <button
              onClick={handleAddCategory}
              className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm hover:bg-emerald-600 transition-colors"
            >
              Přidat
            </button>
            <button
              onClick={() => setShowNewCat(false)}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
        )}
        {showNewItem && (
          <div className="flex gap-2">
            <input
              className="w-32 border border-slate-200 rounded-full px-3 py-1.5 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
              placeholder="Kategorie..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={handleItemKeyDown}
              list="plan-categories"
            />
            <datalist id="plan-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input
              className="flex-1 border border-slate-200 rounded-full px-3 py-1.5 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
              placeholder="Název položky..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleItemKeyDown}
              autoFocus
            />
            <input
              className="w-28 border border-slate-200 rounded-full px-3 py-1.5 text-sm text-right outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
              placeholder="Částka"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              onKeyDown={handleItemKeyDown}
            />
            <button
              onClick={handleAddItem}
              className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-sm hover:bg-emerald-600 transition-colors"
            >
              Přidat
            </button>
            <button
              onClick={() => setShowNewItem(false)}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          </div>
        )}
        {!showNewCat && !showNewItem && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewCat(true)}
              className="flex-1 py-2 border border-dashed border-slate-200 rounded-full text-sm text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
            >
              + Nová kategorie
            </button>
            <button
              onClick={() => setShowNewItem(true)}
              className="flex-1 py-2 border border-dashed border-slate-200 rounded-full text-sm text-slate-400 hover:border-emerald-300 hover:text-emerald-500 transition-colors"
            >
              + Nová položka
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
