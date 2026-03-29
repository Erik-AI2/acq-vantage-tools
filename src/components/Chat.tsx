import { useState, useRef, useEffect } from 'react'
import type { Message } from '../api/chat'

interface ChatProps {
  messages: Message[]
  isStreaming: boolean
  onSend: (text: string) => void
  toolLabel: string
  itemName: string
}

export function Chat({ messages, isStreaming, onSend, toolLabel, itemName }: ChatProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isStreaming) inputRef.current?.focus()
  }, [isStreaming])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    onSend(input.trim())
    setInput('')
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <main className="flex-1 h-full flex flex-col min-w-0">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.04] shrink-0">
        <h2 className="text-sm font-medium text-white/80">
          {toolLabel} <span className="text-white/40 font-normal">— {itemName}</span>
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-5 py-6 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`animate-[fadeIn_0.25s_ease-out] ${msg.role === 'user' ? 'ml-8' : ''}`}>
              {msg.role === 'user' ? (
                <div className="bg-white/[0.05] rounded-xl px-4 py-3 inline-block">
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => handleCopy(msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0 right-0 text-xs px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70"
                  >
                    Copy
                  </button>
                  <div className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                    {msg.content.split(/```([\s\S]*?)```/).map((part, j) => {
                      if (j % 2 === 1) {
                        // Code/copyable block
                        return (
                          <div key={j} className="relative group/block mt-3 mb-3 border border-white/10 rounded-lg px-4 py-3 bg-white/[0.03]">
                            <button
                              onClick={() => handleCopy(part.trim())}
                              className="opacity-0 group-hover/block:opacity-100 transition-opacity absolute top-2 right-2 text-xs px-2 py-0.5 rounded border border-white/10 text-white/40 hover:text-white/70"
                            >
                              Copy
                            </button>
                            <pre className="text-sm text-white/90 font-mono whitespace-pre-wrap">{part.trim()}</pre>
                          </div>
                        )
                      }
                      // Regular text — handle blockquotes, lists, bold
                      return <span key={j}>{renderBlock(part)}</span>
                    })}
                    {isStreaming && i === messages.length - 1 && (
                      <span className="text-violet-500/50 animate-pulse">|</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <div className="flex items-center gap-1 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse3_1.4s_infinite_0s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse3_1.4s_infinite_0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-[pulse3_1.4s_infinite_0.4s]" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-5 py-4 border-t border-white/[0.04] shrink-0">
        <div className="relative max-w-xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isStreaming}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:border-violet-500/40 focus:outline-none placeholder-white/30 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors flex items-center justify-center disabled:opacity-30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  )
}

function renderBlock(text: string) {
  const lines = text.split('\n')
  const blocks: { type: 'quote' | 'list' | 'text'; lines: string[] }[] = []

  for (const line of lines) {
    const trimmed = line.trimStart()
    let type: 'quote' | 'list' | 'text' = 'text'
    if (trimmed.startsWith('> ') || trimmed === '>') type = 'quote'
    else if (/^[-*•]\s/.test(trimmed)) type = 'list'

    const last = blocks[blocks.length - 1]
    if (last && last.type === type) {
      last.lines.push(line)
    } else {
      blocks.push({ type, lines: [line] })
    }
  }

  return blocks.map((block, i) => {
    if (block.type === 'quote') {
      return (
        <div key={i} className="border-l-2 border-violet-500/40 pl-3 my-2 text-white/80">
          {block.lines.map((l, j) => (
            <div key={j}>{renderText(l.replace(/^\s*>\s?/, ''))}</div>
          ))}
        </div>
      )
    }
    if (block.type === 'list') {
      return (
        <ul key={i} className="list-disc list-inside my-2 space-y-0.5">
          {block.lines.map((l, j) => (
            <li key={j}>{renderText(l.replace(/^\s*[-*•]\s/, ''))}</li>
          ))}
        </ul>
      )
    }
    return <span key={i}>{renderText(block.lines.join('\n'))}</span>
  })
}

function renderText(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="text-white/90">{part}</span>
      : part
  )
}
