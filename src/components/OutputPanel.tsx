import { useState, useEffect } from 'react'
import { getOutputSections, getAudits, addAudit } from '../api/storage'
import { runAudit } from '../api/chat'
import type { ToolType } from '../api/chat'

interface AuditData {
  overall: number
  verdict: string
  scores: { name: string; score: number; reason: string; framework?: string }[]
  strengths: string[]
  gaps: { dimension: string; score: number; framework?: string; problem: string; fix: string }[]
  violations: string[]
  oneThing: string
}

interface OutputPanelProps {
  type: ToolType
  output: Record<string, string>
  onOutputChange: (output: Record<string, string>) => void
  model: 'sonnet' | 'opus'
  width: number
  itemId: string | null
  onBridge: (targetType: 'script' | 'vsl') => void
}

function parseAudit(raw: string): AuditData | null {
  try {
    let parsed: any = null

    // Try direct parse first
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) parsed = JSON.parse(trimmed)

    // Strip markdown code fences
    if (!parsed) {
      const fenceStrip = trimmed.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
      if (fenceStrip.startsWith('{')) parsed = JSON.parse(fenceStrip)
    }

    // Extract JSON from anywhere in the text
    if (!parsed) {
      const jsonMatch = raw.match(/\{[\s\S]*"overall"[\s\S]*"scores"[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    }

    // Validate required fields exist
    if (!parsed || typeof parsed.overall !== 'number' || !Array.isArray(parsed.scores)) return null

    // Ensure safe defaults for optional arrays
    parsed.strengths = parsed.strengths || []
    parsed.gaps = parsed.gaps || []
    parsed.violations = parsed.violations || []
    parsed.oneThing = parsed.oneThing || ''

    return parsed as AuditData
  } catch {
    return null
  }
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 6) return 'text-yellow-400'
  return 'text-red-400'
}

function barColor(score: number): string {
  if (score >= 8) return 'bg-green-500'
  if (score >= 6) return 'bg-yellow-500'
  return 'bg-red-500'
}

function verdictColor(verdict: string): string {
  if (verdict === 'PASS') return 'text-green-400 border-green-500/30 bg-green-500/10'
  if (verdict === 'FAIL') return 'text-red-400 border-red-500/30 bg-red-500/10'
  return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
}

function Scorecard({ data }: { data: AuditData }) {
  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className={`text-center py-3 rounded-lg border ${verdictColor(data.verdict)}`}>
        <p className="text-2xl font-bold">{data.overall.toFixed(1)}<span className="text-sm font-normal opacity-60">/10</span></p>
        <p className="text-xs font-semibold uppercase tracking-wider mt-0.5">{data.verdict}</p>
      </div>

      {/* Dimension scores */}
      <div className="space-y-2">
        {data.scores.map((s) => (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-white/60">{s.name}</span>
              <span className={`text-[11px] font-semibold ${scoreColor(s.score)}`}>{s.score}</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(s.score)}`}
                style={{ width: `${s.score * 10}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-0.5 leading-tight">{s.reason}</p>
          </div>
        ))}
      </div>

      {/* Strengths */}
      {data.strengths.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-green-400/60 font-semibold mb-1.5">Strengths</p>
          {data.strengths.map((s, i) => (
            <p key={i} className="text-xs text-white/60 leading-relaxed mb-1 flex gap-1.5">
              <span className="text-green-400/60 shrink-0">+</span>
              <span>{s}</span>
            </p>
          ))}
        </div>
      )}

      {/* Gaps to fix */}
      {data.gaps.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-yellow-400/60 font-semibold mb-1.5">Fix These</p>
          {data.gaps.map((g, i) => (
            <div key={i} className="mb-3 border-l-2 border-yellow-500/30 pl-2.5">
              <p className="text-[11px] text-white/70 font-medium">{g.dimension} <span className={`${scoreColor(g.score)}`}>({g.score}/10)</span></p>
              <p className="text-[11px] text-white/40 mt-0.5">{g.problem}</p>
              <p className="text-[11px] text-white/60 mt-1 bg-white/[0.03] rounded px-2 py-1">{g.fix}</p>
            </div>
          ))}
        </div>
      )}

      {/* Violations */}
      {data.violations.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-red-400/60 font-semibold mb-1.5">Violations</p>
          {data.violations.map((v, i) => (
            <p key={i} className="text-xs text-red-400/70 leading-relaxed mb-1 flex gap-1.5">
              <span className="shrink-0">!</span>
              <span>{v}</span>
            </p>
          ))}
        </div>
      )}

      {/* One thing */}
      {data.oneThing && (
        <div className="border border-violet-500/20 rounded-lg p-3 bg-violet-500/[0.05]">
          <p className="text-[10px] uppercase tracking-[0.15em] text-violet-400/60 font-semibold mb-1">#1 Priority Fix</p>
          <p className="text-xs text-white/70 leading-relaxed">{data.oneThing}</p>
        </div>
      )}
    </div>
  )
}

export function OutputPanel({ type, output, onOutputChange, model, width, itemId, onBridge }: OutputPanelProps) {
  const sections = getOutputSections(type)
  const [auditRaw, setAuditRaw] = useState<string | null>(null)
  const [auditData, setAuditData] = useState<AuditData | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [showPasteAll, setShowPasteAll] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const filledCount = sections.filter(s => output[s]?.trim()).length
  const filledSections = sections.filter(s => output[s]?.trim())
  const typeLabel = type === 'offer' ? 'Offer' : type === 'script' ? 'Script' : 'VSL'

  // Load latest audit when item changes
  useEffect(() => {
    setAuditRaw(null)
    setAuditData(null)
    if (itemId) {
      getAudits(itemId).then(audits => {
        if (audits.length > 0) {
          setAuditRaw(audits[0].content)
          setAuditData(parseAudit(audits[0].content))
        }
      })
    }
  }, [itemId])

  function handleChange(section: string, value: string) {
    onOutputChange({ ...output, [section]: value })
  }

  function handleCopyAll() {
    const divider = '═══════════════════════════════════════'
    const lines = [divider, `YOUR GRAND SLAM ${typeLabel.toUpperCase()}`, divider, '']
    for (const s of sections) {
      if (!output[s]?.trim()) continue
      lines.push(s.toUpperCase())
      lines.push(output[s].trim())
      lines.push('')
    }
    lines.push(divider)
    navigator.clipboard.writeText(lines.join('\n'))
  }

  function handlePasteAll() {
    if (!pasteText.trim()) return
    const parsed: Record<string, string> = {}
    const lines = pasteText.split('\n')

    // Keyword aliases — maps patterns to section names
    // Each section has multiple possible header patterns
    const aliases: Record<string, string[]> = {
      // Offer sections
      'Offer Name': ['offer name', 'headline'],
      'Dream Outcome': ['dream outcome'],
      'Target Market': ['target market', 'target audience', 'avatar'],
      'Problems We Solve': ['problems we solve', 'problems', 'pain points'],
      'Mechanism': ['mechanism', 'how it works'],
      'Value Stack': ['value stack'],
      'Proof': ['proof', 'testimonials', 'social proof', 'case studies'],
      'Price': ['price', 'pricing', 'investment'],
      'Guarantee': ['guarantee', 'risk reversal'],
      'Scarcity': ['scarcity', 'urgency'],
      'Call to Action': ['call to action', 'cta'],
      // Script sections
      'Opener': ['opener', 'opening', 'rapport', 'first contact', 'c — clarify', 'clarify why'],
      'Pain Discovery': ['pain discovery', 'l — label', 'label the problem', 'qualify', 'discovery'],
      'Demo Script': ['demo script', 'demo', 'o — overview', 'overview past', 'the demo'],
      'Value Stack & Price': ['value stack & price', 'value presentation', 's — sell', 'sell the vacation', 'price reveal', 'present the price', 'present price'],
      'Objections & Rebuttals': ['objections & rebuttals', 'objection', 'e — explain', 'explain away', 'rebuttals', 'handle objections', 'manejar objeciones'],
      'Close': ['close', 'the close', 'closing', 'el cierre'],
      'Follow-Up': ['follow-up', 'follow up', 'followup', 'cadence', 'seguimiento'],
      'Special Pitch': ['special pitch', 'reinforce', 'r — reinforce', 'founding', 'scarcity', 'special'],
      // VSL sections
      'Hook': ['hook'],
      'Problem': ['problem', 'pain'],
      'Credibility': ['credibility', 'authority', 'proof'],
      'Risk Reversal': ['risk reversal', 'guarantee'],
      'CTA': ['cta', 'call to action'],
    }

    // Build lookup: only for current tool's sections
    const sectionAliases: { section: string; patterns: string[] }[] = sections
      .filter(s => aliases[s])
      .map(s => ({ section: s, patterns: aliases[s] }))

    function matchSection(line: string): string | null {
      const upper = line.toUpperCase().trim()
      // Exact match on section name
      for (const s of sections) {
        if (upper === s.toUpperCase()) return s
      }
      // Fuzzy match via aliases
      for (const { section, patterns } of sectionAliases) {
        for (const pattern of patterns) {
          if (upper.includes(pattern.toUpperCase())) return section
        }
      }
      return null
    }

    let currentSection: string | null = null
    let currentLines: string[] = []
    let prevWasSeparator = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip decorative lines but track them
      if (/^[═─━─╌╍┄┅]+$/.test(trimmed)) {
        prevWasSeparator = true
        continue
      }

      if (trimmed === '') {
        if (currentSection) currentLines.push('')
        continue
      }

      // Check if this is a section header (especially after a separator)
      const match = matchSection(trimmed)
      if (match && (prevWasSeparator || trimmed === trimmed.toUpperCase() || /^[A-Z][\s—\-]/.test(trimmed))) {
        // Save previous section
        if (currentSection) {
          parsed[currentSection] = currentLines.join('\n').trim()
        }
        currentSection = match
        currentLines = []
        prevWasSeparator = false
      } else if (currentSection) {
        currentLines.push(line)
        prevWasSeparator = false
      } else {
        prevWasSeparator = false
      }
    }
    // Save last section
    if (currentSection) {
      parsed[currentSection] = currentLines.join('\n').trim()
    }

    // Merge with existing output
    const merged = { ...output }
    for (const [key, value] of Object.entries(parsed)) {
      if (value) merged[key] = value
    }
    onOutputChange(merged)
    setShowPasteAll(false)
    setPasteText('')
  }

  async function handleAudit() {
    setIsAuditing(true)
    setAuditData(null)
    setAuditRaw('')
    setView('preview')

    const content = sections
      .filter(s => output[s])
      .map(s => `${s.toUpperCase()}\n${output[s]}`)
      .join('\n\n')

    let fullText = ''

    await runAudit(
      type,
      content,
      model,
      (chunk) => {
        fullText += chunk
        setAuditRaw(fullText)
        // Try to parse incrementally
        const parsed = parseAudit(fullText)
        if (parsed) setAuditData(parsed)
      },
      async () => {
        setIsAuditing(false)
        const parsed = parseAudit(fullText)
        if (parsed) {
          setAuditData(parsed)
          // Only save valid audits to prevent corrupted data
          if (itemId) await addAudit(itemId, fullText)
        }
      },
      (error) => {
        setAuditRaw(`Error: ${error}`)
        setIsAuditing(false)
      },
    )
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="h-full border-l border-white/10 bg-[#0e0e18] flex flex-col shrink-0"
    >
      {/* Header with tabs */}
      <div className="px-5 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wider text-white/80 font-semibold">
            {typeLabel} Draft
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">{filledCount}/{sections.length}</span>
            <button
              onClick={() => setShowPasteAll(true)}
              className="text-xs px-2.5 py-1 rounded border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
            >
              Paste
            </button>
            <button
              onClick={handleCopyAll}
              className="text-xs px-2.5 py-1 rounded border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('edit')}
            className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${
              view === 'edit' ? 'bg-white/[0.08] text-white/80' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setView('preview')}
            className={`text-[11px] px-3 py-1 rounded-md transition-colors font-medium ${
              view === 'preview' ? 'bg-white/[0.08] text-white/80' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Paste All overlay */}
      {showPasteAll && (
        <div className="px-5 py-4 border-b border-white/10 bg-[#12121f] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Paste full {typeLabel.toLowerCase()}</span>
            <button
              onClick={() => { setShowPasteAll(false); setPasteText('') }}
              className="text-xs text-white/30 hover:text-white/60"
            >
              Cancel
            </button>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={`Paste your full ${typeLabel.toLowerCase()} here...\n\nFormat: section headers (like OFFER NAME, DREAM OUTCOME, etc.) on their own line, content below each header.`}
            rows={10}
            autoFocus
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-sm text-white leading-relaxed resize-none outline-none placeholder-white/20 focus:border-violet-500/30"
          />
          <button
            onClick={handlePasteAll}
            disabled={!pasteText.trim()}
            className="w-full rounded-lg px-4 py-2.5 bg-violet-500/20 border border-violet-500/30 text-sm font-medium text-violet-200 hover:bg-violet-500/30 transition-colors disabled:opacity-30"
          >
            Parse & Fill Sections
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {view === 'edit' ? (
          /* ─── Edit view: section textareas ─── */
          <div className="px-5 py-4 space-y-1">
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
        ) : (
          /* ─── Preview view ─── */
          <div className="px-5 py-6">
            {/* Scorecard (if audit exists) */}
            {auditData ? (
              <Scorecard data={auditData} />
            ) : isAuditing && auditRaw ? (
              <div className="text-xs text-white/40 leading-relaxed">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-[11px] text-violet-400/60 font-medium">Auditing...</span>
                </div>
                <pre className="whitespace-pre-wrap text-white/30 font-mono text-[10px]">{auditRaw.slice(-200)}</pre>
              </div>
            ) : (
              /* Formatted offer preview */
              <>
                {filledCount === 0 ? (
                  <p className="text-sm text-white/30 italic text-center py-10">
                    Fill sections in the Edit tab to see your {typeLabel.toLowerCase()} here.
                  </p>
                ) : (
                  <div className="space-y-5">
                    <div className="text-center pb-4 border-b border-white/[0.08]">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-violet-400/60 mb-1">Grand Slam {typeLabel}</p>
                      <h2 className="text-base font-semibold text-white/90">
                        {output[sections[0]]?.trim() || 'Untitled'}
                      </h2>
                    </div>
                    {filledSections.map((section, i) => {
                      if (i === 0 && section === sections[0]) return null
                      const content = output[section].trim()
                      const isList = content.includes('\n') && (content.includes('• ') || content.includes('- ') || content.includes('* '))
                      return (
                        <div key={section}>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-semibold mb-1.5">{section}</p>
                          {isList ? (
                            <ul className="space-y-1">
                              {content.split('\n').map((line, j) => {
                                const clean = line.replace(/^\s*[•\-*]\s*/, '').trim()
                                if (!clean) return null
                                return (
                                  <li key={j} className="text-sm text-white/75 leading-relaxed flex gap-2">
                                    <span className="text-violet-500/50 shrink-0">•</span>
                                    <span>{clean}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{content}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0 space-y-3">
        <button
          onClick={handleAudit}
          disabled={isAuditing || filledCount < 3}
          className="w-full rounded-lg px-4 py-3 border border-violet-500/30 bg-violet-500/15 text-sm font-medium text-violet-200 hover:text-white hover:bg-violet-500/25 transition-colors disabled:opacity-30"
        >
          {isAuditing ? 'Auditing...' : auditData ? 'Re-Audit' : 'Run Audit'}
        </button>

        {type === 'offer' && (
          <div className="flex gap-2">
            <button
              onClick={() => onBridge('script')}
              className="flex-1 text-xs text-white/40 px-3 py-2 rounded border border-white/10 hover:text-white/70 hover:bg-white/[0.04] transition-colors font-medium"
            >
              → Script
            </button>
            <button
              onClick={() => onBridge('vsl')}
              className="flex-1 text-xs text-white/40 px-3 py-2 rounded border border-white/10 hover:text-white/70 hover:bg-white/[0.04] transition-colors font-medium"
            >
              → VSL
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
