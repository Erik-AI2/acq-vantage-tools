export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export type ToolType = 'offer' | 'script' | 'vsl'

export async function streamChat(
  tool: ToolType,
  chatHistory: Message[],
  userMessage: string,
  model: 'sonnet' | 'opus',
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        chat_history: chatHistory,
        user_message: userMessage,
        model,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      onError(err.error || 'Request failed')
      return
    }

    const reader = response.body?.getReader()
    if (!reader) { onError('No response body'); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { onError(parsed.error); return }
          if (parsed.text) onChunk(parsed.text)
        } catch {}
      }
    }
    onDone()
  } catch (error: any) {
    onError(error.message || 'Network error')
  }
}

export async function runAudit(
  type: string,
  content: string,
  model: 'sonnet' | 'opus',
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, model }),
    })

    if (!response.ok) {
      const err = await response.json()
      onError(err.error || 'Audit request failed')
      return
    }

    const reader = response.body?.getReader()
    if (!reader) { onError('No response body'); return }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { onError(parsed.error); return }
          if (parsed.text) onChunk(parsed.text)
        } catch {}
      }
    }
    onDone()
  } catch (error: any) {
    onError(error.message || 'Network error')
  }
}
