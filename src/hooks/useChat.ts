import { useState, useCallback, useRef } from 'react'
import { streamChat } from '../api/chat'
import type { Message, ToolType } from '../api/chat'

export function useChat(tool: ToolType) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [model, setModel] = useState<'sonnet' | 'opus'>('sonnet')
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    let assistantText = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    await streamChat(
      tool,
      messagesRef.current,
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
  }, [tool, model])

  const resetChat = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isStreaming, model, setModel, sendMessage, resetChat, setMessages }
}
