import type { SavedItem } from '../api/storage'
import { createItem, deleteItem } from '../api/storage'
import type { ToolType } from '../api/chat'

interface SidebarProps {
  activeId: string | null
  items: SavedItem[]
  onSelect: (id: string) => void
  onNew: (item: SavedItem) => void
  onDelete: (id: string) => void
  model: 'sonnet' | 'opus'
  onModelChange: (m: 'sonnet' | 'opus') => void
  onShowRoadmap: () => void
}

export function Sidebar({ activeId, items, onSelect, onNew, onDelete, model, onModelChange, onShowRoadmap }: SidebarProps) {
  const offers = items.filter(i => i.type === 'offer')
  const scripts = items.filter(i => i.type === 'script')
  const vsls = items.filter(i => i.type === 'vsl')

  async function handleNew(type: ToolType) {
    const names: Record<ToolType, string> = {
      offer: `Offer ${offers.length + 1}`,
      script: `Script ${scripts.length + 1}`,
      vsl: `VSL ${vsls.length + 1}`,
    }
    const item = await createItem(type, names[type])
    onNew(item)
  }

  async function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"?`)) {
      await deleteItem(id)
      onDelete(id)
    }
  }

  function renderGroup(title: string, groupItems: SavedItem[], _type: ToolType) {
    return (
      <div>
        <p className="text-[9px] uppercase tracking-[0.15em] text-white/15 px-2 mb-1.5 font-medium">{title}</p>
        {groupItems.length === 0 && (
          <p className="px-3 text-[10px] text-white/10 italic">None yet</p>
        )}
        {groupItems.map(item => (
          <div key={item.id} className="group flex items-center mt-0.5">
            <button
              onClick={() => onSelect(item.id)}
              className={`flex-1 text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                activeId === item.id
                  ? 'text-white/80 bg-white/[0.04]'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.02]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeId === item.id ? 'bg-violet-500' : 'bg-white/10'}`} />
              <span className="truncate">{item.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(item.id, item.name)
              }}
              className="opacity-0 group-hover:opacity-100 shrink-0 w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400/70 transition-all"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <aside className="w-[220px] h-full flex flex-col border-r border-white/[0.04] bg-white/[0.01] shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="text-xs font-semibold tracking-wide text-white/60">ACQ Vantage</span>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {renderGroup('Offers', offers, 'offer')}
        {renderGroup('Scripts', scripts, 'script')}
        {renderGroup('VSLs', vsls, 'vsl')}
      </div>

      {/* New buttons */}
      <div className="px-2 py-3 border-t border-white/[0.04] space-y-1">
        <button onClick={() => handleNew('offer')} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-colors">+ New Offer</button>
        <button onClick={() => handleNew('script')} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-colors">+ New Script</button>
        <button onClick={() => handleNew('vsl')} className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-colors">+ New VSL</button>
      </div>

      {/* Roadmap link */}
      <div className="px-2 py-2 border-t border-white/[0.04]">
        <button
          onClick={onShowRoadmap}
          className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] text-white/25 hover:text-white/50 hover:bg-white/[0.02] transition-colors flex items-center gap-2"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          Product Roadmap
        </button>
      </div>

      {/* Model */}
      <div className="px-3 py-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-white/15">Model</span>
          {(['sonnet', 'opus'] as const).map(m => (
            <button
              key={m}
              onClick={() => onModelChange(m)}
              className={`text-[10px] px-2 py-0.5 rounded transition-colors capitalize ${model === m ? 'bg-violet-500/10 text-violet-400/60 border border-violet-500/10' : 'text-white/15 hover:text-white/30'}`}
            >{m}</button>
          ))}
        </div>
      </div>
    </aside>
  )
}
