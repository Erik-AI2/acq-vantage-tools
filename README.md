# ACQ Vantage AI Tools

AI-powered business tools built on Alex Hormozi's public frameworks. Three working tools that guide users through structured interviews and produce execution-ready outputs.

**Live demo:** [Coming soon]

## Tools

- **Offer Creator** — Guided interview that builds a Grand Slam Offer using the Value Equation framework ($100M Offers)
- **Sales Script Builder** — Builds complete sales scripts using the CLOSER framework with objection handling
- **VSL Generator** — Creates Video Sales Letter scripts with hook, problem, credibility, mechanism, value stack, risk reversal, and CTA

## How It Works

Each tool runs as a chat-based interview. The AI asks questions one at a time, shapes answers into structured sections, and produces a complete document. Users can:

- Follow the guided conversation or paste a complete draft
- Edit individual sections in the output panel
- Run an AI audit that scores the draft against framework dimensions
- Bridge from a completed offer directly into a script or VSL

## Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS v4 + Vite 8
- **Backend:** Vercel Serverless Functions (Express for local dev)
- **AI:** Claude API (Sonnet 4.6 default, Opus 4.6 premium) via SSE streaming
- **Database:** Supabase (items, messages, audits)
- **Prompts:** 6 system prompts (~1,200 lines total) encoding interview flows, scoring rubrics, and framework knowledge

## Architecture

```
Frontend (React + Vite)
  ├── Sidebar (saved items, create/delete, model toggle)
  ├── Chat (SSE streaming, blockquote/list/bold rendering)
  ├── OutputPanel (Edit/Preview tabs, Paste All, Audit Scorecard)
  └── Roadmap (24 planned features across 4 categories)

API (Vercel Serverless)
  ├── POST /api/chat → Claude SSE stream
  └── POST /api/audit → Claude SSE stream (scoring)

Database (Supabase)
  ├── items (id, type, name, output, timestamps)
  ├── messages (item_id, role, content)
  └── audits (item_id, content)
```

## Local Development

```bash
# Install dependencies
npm install

# Create .env with your API key
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run dev server (frontend + backend)
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

## Deployment

Deployed on Vercel. Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard.

## Prompt Engineering

The real work is in `server/prompts/`. Each prompt encodes:
- Interview sequences with per-step instructions
- Framework knowledge from public sources ($100M Offers, $100M Leads, $100M Money Models)
- Scoring rubrics with dimension-specific criteria
- Output formatting rules for paste parsing

All frameworks are sourced from publicly available books and content.
