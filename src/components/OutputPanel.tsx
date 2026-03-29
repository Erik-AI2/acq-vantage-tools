import { useState } from 'react'
import { getOutputSections } from '../api/storage'
import { runAudit } from '../api/chat'
import type { ToolType } from '../api/chat'

interface OutputPanelProps {
  type: ToolType
  output: Record<string, string>
  onOutputChange: (output: Record<string, string>) => void
  model: 'haiku' | 'sonnet' | 'opus'
  width: number
}

export function OutputPanel({ type, output, onOutputChange, model, width }: OutputPanelProps) {
  const sections = getOutputSections(type)
  const [audit, setAudit] = useState<string | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)

  function handleChange(section: string, value: string) {
    onOutputChange({ ...output, [section]: value })
  }

  function handleCopyAll() {
    const text = sections
      .filter(s => output[s])
      .map(s => `${s.toUpperCase()}\n${output[s]}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
  }

  async function handleAudit() {
    setIsAuditing(true)
    try {
      const content = sections
        .filter(s => output[s])
        .map(s => `${s.toUpperCase()}\n${output[s]}`)
        .join('\n\n')
      const result = await runAudit(type, content, model)
      setAudit(result)
    } catch (err: any) {
      setAudit(`Error: ${err.message}`)
    }
    setIsAuditing(false)
  }

  const filledCount = sections.filter(s => output[s]?.trim()).length

  return (
    <aside
      style={{ width: `${width}px` }}
      className="h-full border-l border-white/10 bg-[#0e0e18] flex flex-col shrink-0"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <span className="text-xs uppercase tracking-wider text-white/80 font-semibold">
          {type === 'offer' ? 'Offer' : type === 'script' ? 'Script' : 'VSL'} Draft
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{filledCount}/{sections.length}</span>
          <button
            onClick={handleCopyAll}
            className="text-xs px-3 py-1 rounded border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Copy all
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {sections.map(section => {
          const isFilled = !!output[section]?.trim()
          return (
            <div
              key={section}
              className={`py-3 border-b border-white/[0.06] rounded transition-colors hover:bg-white/[0.03] ${
                !isFilled ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] uppercase tracking-wider font-semibold ${isFilled ? 'text-white/80' : 'text-white/40'}`}>
                  {section}
                </span>
                {isFilled && <span className="text-[11px] text-green-400 font-medium">filled</span>}
              </div>
              <textarea
                value={output[section] || ''}
                onChange={e => handleChange(section, e.target.value)}
                placeholder={`Paste ${section.toLowerCase()} from chat...`}
                rows={isFilled ? Math.min(Math.max(output[section].split('\n').length, 2), 10) : 2}
                className="w-full bg-transparent border-none text-sm text-white leading-relaxed resize-none outline-none placeholder-white/30 placeholder:italic"
              />
            </div>
          )
        })}
      </div>

      {/* Audit + actions */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0 space-y-3">
        {audit && (
          <div className="max-h-52 overflow-y-auto text-sm text-white/80 leading-relaxed whitespace-pre-wrap border border-white/10 rounded-lg p-4 bg-white/[0.04] mb-2">
            {audit}
          </div>
        )}

        <button
          onClick={handleAudit}
          disabled={isAuditing || filledCount < 3}
          className="w-full rounded-lg px-4 py-3 border border-violet-500/30 bg-violet-500/15 text-sm font-medium text-violet-200 hover:text-white hover:bg-violet-500/25 transition-colors disabled:opacity-30"
        >
          {isAuditing ? 'Auditing...' : 'Run Audit on Draft'}
        </button>

        <div className="flex gap-2">
          <button className="flex-1 text-xs text-white/40 px-3 py-2 rounded border border-white/10 hover:text-white/70 hover:bg-white/[0.04] transition-colors font-medium">
            → Script
          </button>
          <button className="flex-1 text-xs text-white/40 px-3 py-2 rounded border border-white/10 hover:text-white/70 hover:bg-white/[0.04] transition-colors font-medium">
            → VSL
          </button>
        </div>
      </div>
    </aside>
  )
}
