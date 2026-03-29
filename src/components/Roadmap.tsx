interface RoadmapProps {
  onBack: () => void
}

const ROADMAP = [
  {
    category: 'AI Tools',
    description: 'New AI-powered generators and analyzers',
    items: [
      { name: 'Call Transcript Analyzer', desc: 'Paste a sales call transcript — AI scores it against CLOSER framework, flags missed opportunities, suggests better responses' },
      { name: 'Rebuttal Generator', desc: 'Input your top objections — AI generates full rebuttal scripts using Onion of Blame + All-Purpose Closes' },
      { name: 'GTM Planner', desc: 'Go-to-market strategy builder — channel selection, launch sequencing, budget allocation based on business stage' },
      { name: 'Ad Copy Generator', desc: 'Direct response ad copy for Meta, Google, YouTube — hook variants, body copy, CTAs tested against frameworks' },
      { name: 'Email Sequence Builder', desc: 'Nurture and sales email sequences — welcome, activation, upsell, win-back — with subject line variants' },
      { name: 'Webinar Script Builder', desc: 'Full webinar scripts with timed sections — registration page copy, reminder emails, replay sequences' },
      { name: 'Script Role-Play', desc: 'AI plays the prospect — practice your script live, get scored on technique, objection handling, and closing' },
    ],
  },
  {
    category: 'Workflow',
    description: 'Connect tools and optimize output',
    items: [
      { name: 'Funnel Builder', desc: 'Connect offer → script → VSL → landing page in one flow — each tool feeds the next automatically' },
      { name: 'A/B Variant Generation', desc: 'Generate 2-3 versions of any section — compare side-by-side, pick the strongest' },
      { name: 'Offer Comparison', desc: 'Side-by-side comparison of two offers with differential audit scoring — see exactly what changed' },
      { name: 'Templates Library', desc: 'Pre-built templates by industry — fitness, agency, SaaS, coaching, e-commerce — start from proven patterns' },
      { name: 'PDF Export', desc: 'One-click branded PDF export — send offers, scripts, and VSLs to clients or team members' },
      { name: 'Inline Regeneration', desc: 'Click any section to regenerate just that part — keep everything else, improve one piece at a time' },
    ],
  },
  {
    category: 'Platform',
    description: 'Scale to teams and organizations',
    items: [
      { name: 'Team Dashboards', desc: 'Admin view of team members\' offers, scripts, audit scores, completion rates — coach your sales team with data' },
      { name: 'Version History', desc: 'Save versions of every offer — compare v1 vs v3, restore any previous version, see what improved your score' },
      { name: 'CRM Integration', desc: 'Push offers and scripts to HubSpot, GoHighLevel, Notion, Google Docs — no copy-pasting' },
      { name: 'Analytics', desc: 'Track offers created, average audit scores, most common gaps, improvement over time' },
      { name: 'Multi-Language', desc: 'Generate offers, scripts, and VSLs in Spanish, Portuguese, French, German — same frameworks, any language' },
      { name: 'Collaboration', desc: 'Share offers with team, comment on sections, suggest edits — real-time multiplayer' },
    ],
  },
  {
    category: 'Infrastructure',
    description: 'Technical foundations for scale',
    items: [
      { name: 'RAG Pipeline', desc: 'Vector database with embedded playbooks + YouTube transcripts — retrieve relevant frameworks per question instead of prompt stuffing' },
      { name: 'Evaluation Suite', desc: 'Automated quality testing — generate 100 offers, score consistency, catch regressions — CI/CD for AI output' },
      { name: 'Voice Input', desc: 'Speak your answers instead of typing — AI transcribes and refines, faster for founders who think out loud' },
      { name: 'Real-Time Streaming', desc: 'Sections fill in real-time as the AI generates — 2-3 second intervals, output panel builds live' },
      { name: 'Fine-Tuned Models', desc: 'Custom models trained on 500+ real Hormozi-style offers, scripts, and VSLs — higher quality, lower cost' },
    ],
  },
]

export function Roadmap({ onBack }: RoadmapProps) {
  return (
    <div className="h-screen w-screen bg-[#0a0a0f] text-white overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <button
              onClick={onBack}
              className="text-xs text-white/30 hover:text-white/60 transition-colors mb-3 flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to tools
            </button>
            <h1 className="text-xl font-semibold text-white/90">Product Roadmap</h1>
            <p className="text-sm text-white/40 mt-1">What we're building next for ACQ Vantage members</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/20">
              {ROADMAP.reduce((sum, cat) => sum + cat.items.length, 0)} features planned
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-10">
          {ROADMAP.map(({ category, description, items }) => (
            <div key={category}>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-white/80">{category}</h2>
                <p className="text-xs text-white/30 mt-0.5">{description}</p>
              </div>
              <div className="grid gap-3">
                {items.map(({ name, desc }) => (
                  <div
                    key={name}
                    className="border border-white/[0.06] rounded-lg px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500/40 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm text-white/70 font-medium">{name}</p>
                        <p className="text-xs text-white/35 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-xs text-white/20">
            Built with Claude API + React + Supabase — powered by Hormozi's frameworks
          </p>
        </div>
      </div>
    </div>
  )
}
