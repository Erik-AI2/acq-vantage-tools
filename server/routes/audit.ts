import { Request, Response } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = new Anthropic()

const auditPrompt = readFileSync(
  join(__dirname, '..', 'prompts', 'audit-system.md'),
  'utf-8'
)
const offerReviewPrompt = readFileSync(
  join(__dirname, '..', 'prompts', 'offer-review.md'),
  'utf-8'
)

export async function auditRoute(req: Request, res: Response) {
  const { type, content, model } = req.body

  if (!content) {
    res.status(400).json({ error: 'Missing content to audit' })
    return
  }

  const systemPrompt = type === 'offer'
    ? `${auditPrompt}\n\n---\n\n${offerReviewPrompt}`
    : auditPrompt

  const MODEL_MAP: Record<string, string> = {
    haiku: 'claude-haiku-4-5',
    sonnet: 'claude-sonnet-4-6',
    opus: 'claude-opus-4-6',
  }
  const modelId = MODEL_MAP[model] || 'claude-haiku-4-5'

  try {
    const response = await client.messages.create({
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

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    res.json({ audit: text })
  } catch (error: any) {
    console.error('Audit error:', error.message)
    res.status(500).json({ error: error.message })
  }
}
