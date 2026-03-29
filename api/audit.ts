import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Anthropic()

const promptsDir = join(process.cwd(), 'server', 'prompts')
const auditPrompt = readFileSync(join(promptsDir, 'audit-system.md'), 'utf-8')
const offerReviewPrompt = readFileSync(join(promptsDir, 'offer-review.md'), 'utf-8')

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { type, content, model } = req.body

  if (!content) {
    res.status(400).json({ error: 'Missing content to audit' })
    return
  }

  const systemPrompt = type === 'offer'
    ? `${auditPrompt}\n\n---\n\n${offerReviewPrompt}`
    : auditPrompt

  const MODEL_MAP: Record<string, string> = {
    sonnet: 'claude-sonnet-4-6',
    opus: 'claude-opus-4-6',
  }
  const modelId = MODEL_MAP[model] || 'claude-sonnet-4-6'

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await client.messages.stream({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Audit the following ${type || 'offer'}:\n\n${content}`,
        },
      ],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error: any) {
    console.error('Audit error:', error.message)
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
}
