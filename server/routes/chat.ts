import { Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new Anthropic()

// Load prompts once at startup
const promptsDir = join(__dirname, '..', 'prompts')
const orchestrator = readFileSync(join(promptsDir, 'chat-orchestrator.md'), 'utf-8')
const toolPrompts: Record<string, string> = {
  offer: readFileSync(join(promptsDir, 'offer-system.md'), 'utf-8'),
  script: readFileSync(join(promptsDir, 'script-system.md'), 'utf-8'),
  vsl: readFileSync(join(promptsDir, 'vsl-system.md'), 'utf-8'),
}

export async function chatRoute(req: Request, res: Response) {
  const { tool, chat_history, user_message, model } = req.body

  if (!tool || !user_message) {
    res.status(400).json({ error: 'Missing tool or user_message' })
    return
  }

  const toolPrompt = toolPrompts[tool]
  if (!toolPrompt) {
    res.status(400).json({ error: `Unknown tool: ${tool}` })
    return
  }

  const systemPrompt = `${orchestrator}\n\n---\n\n# FRAMEWORK KNOWLEDGE\n\n${toolPrompt}`

  const messages: Anthropic.MessageParam[] = [
    ...(chat_history || []),
    { role: 'user', content: user_message },
  ]

  const MODEL_MAP: Record<string, string> = {
    sonnet: 'claude-sonnet-4-6',
    opus: 'claude-opus-4-6',
  }
  const modelId = MODEL_MAP[model] || 'claude-sonnet-4-6'

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const stream = await client.messages.stream({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: any) {
    console.error('Chat error:', error.message)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}
