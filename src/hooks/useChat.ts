import { useState, useCallback } from 'react'
import { streamChat } from '../api/chat'
import type { Message, ToolType } from '../api/chat'

export function useChat(tool: ToolType) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [model, setModel] = useState<'haiku' | 'sonnet' | 'opus'>('haiku')

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    let assistantText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    await streamChat(
      tool,
      messages,
      text,
      model,
      (chunk) => {
        assistantText += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
      },
      () => setIsStreaming(false),
      (error) => {
        assistantText += `\n\n*Error: ${error}*`
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: assistantText }
          return updated
        })
        setIsStreaming(false)
      },
    )
  }, [tool, messages, model])

  const resetChat = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isStreaming, model, setModel, sendMessage, resetChat }
}
