import { useState, useEffect, useCallback, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { Chat } from './components/Chat'
import { OutputPanel } from './components/OutputPanel'
import { ResizeHandle } from './components/ResizeHandle'
import { Roadmap } from './components/Roadmap'
import { useChat } from './hooks/useChat'
import type { SavedItem } from './api/storage'
import { getItem, updateItem, createItem, getItems, getMessages, addMessage } from './api/storage'
import type { ToolType } from './api/chat'

const TOOL_LABELS: Record<ToolType, string> = {
  offer: 'Offer Creator',
  script: 'Sales Script',
  vsl: 'VSL Generator',
}

const GREETINGS: Record<ToolType, string> = {
  offer: "Let's build your Grand Slam Offer. I'll walk you through it step by step — just answer naturally and I'll shape everything into a structured offer.\n\nFirst — what's your business? What do you sell?",
  script: "Let's build your sales script. I'll structure it using the CLOSER framework so it flows naturally and closes deals.\n\nFirst — what are you selling? Or if you already built an offer, I can use that as the starting point.",
  vsl: "Let's build your VSL script. I'll walk you through each section — hook, problem, credibility, mechanism, value stack, and CTA.\n\nFirst — what are you selling? Or if you already built an offer, I can use that as the starting point.",
}

const MIN_OUTPUT_WIDTH = 240
const MAX_OUTPUT_WIDTH = 600
const DEFAULT_OUTPUT_WIDTH = 360

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<SavedItem | null>(null)
  const [items, setItems] = useState<SavedItem[]>([])
  const [outputWidth, setOutputWidth] = useState(DEFAULT_OUTPUT_WIDTH)
  const [page, setPage] = useState<'tools' | 'roadmap'>('tools')
  const initDone = useRef(false)

  const toolType = activeItem?.type || 'offer'
  const { messages, isStreaming, model, setModel, sendMessage, resetChat, setMessages } = useChat(toolType)

  // Track which messages have been saved to DB to prevent duplicates
  const savedCount = useRef(0)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId
  const wasStreaming = useRef(false)
  const pendingBridgeMsg = useRef<string | null>(null)

  // Load all items on mount
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    getItems().then(loaded => {
      setItems(loaded)
      if (loaded.length === 0) {
        createItem('offer', 'My First Offer').then(item => {
          setItems([item])
          setActiveId(item.id)
          setActiveItem(item)
        })
      }
    })
  }, [])

  // Load active item + its messages when activeId changes
  useEffect(() => {
    if (!activeId) return

    Promise.all([getItem(activeId), getMessages(activeId)]).then(([item, msgs]) => {
      // Guard: if user switched away while we were loading, don't apply
      if (activeIdRef.current !== activeId) return

      if (item) setActiveItem(item)

      if (msgs.length > 0) {
        // Load from DB — mark all as already saved
        setMessages(msgs.map(m => ({ role: m.role, content: m.content })))
        savedCount.current = msgs.length
      } else {
        // No messages — show static greeting
        const greeting = GREETINGS[item?.type || 'offer']
        setMessages([{ role: 'assistant', content: greeting }])
        // Save greeting to DB, mark as saved
        addMessage(activeId, 'assistant', greeting)
        savedCount.current = 1
      }
    })
  }, [activeId])

  // Save user messages immediately when they appear
  useEffect(() => {
    const id = activeIdRef.current
    if (!id || messages.length <= savedCount.current) return

    const newMessages = messages.slice(savedCount.current)
    // Only save user messages here — assistant messages are saved on stream end
    const userMsgs = newMessages.filter(m => m.role === 'user' && m.content.trim())

    if (userMsgs.length > 0) {
      Promise.all(userMsgs.map(m => addMessage(id, m.role, m.content)))
      // Advance count for user msg + the empty assistant placeholder
      savedCount.current = messages.length
    }
  }, [messages])

  // Save the completed assistant message when streaming finishes
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      const id = activeIdRef.current
      if (id && messages.length > 0) {
        const lastMsg = messages[messages.length - 1]
        if (lastMsg.role === 'assistant' && lastMsg.content.trim()) {
          addMessage(id, 'assistant', lastMsg.content)
        }
      }
      savedCount.current = messages.length
    }
    wasStreaming.current = isStreaming
  }, [isStreaming, messages])

  const handleResize = useCallback((delta: number) => {
    setOutputWidth(w => Math.min(MAX_OUTPUT_WIDTH, Math.max(MIN_OUTPUT_WIDTH, w + delta)))
  }, [])

  function handleSelect(id: string) {
    savedCount.current = 0
    resetChat()
    setActiveId(id)
  }

  function handleNew(item: SavedItem) {
    savedCount.current = 0
    resetChat()
    setActiveId(item.id)
    setActiveItem(item)
    setItems(prev => [item, ...prev])
  }

  function handleDelete(id: string) {
    if (activeId === id) {
      setActiveId(null)
      setActiveItem(null)
      resetChat()
    }
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function handleOutputChange(output: Record<string, string>) {
    if (activeItem) {
      const updated = { ...activeItem, output }
      updateItem(activeItem.id, { output })
      setActiveItem(updated)
    }
  }

  // Bridge: create a script or VSL from the current offer's output
  async function handleBridge(targetType: 'script' | 'vsl') {
    if (!activeItem) return
    const label = targetType === 'script' ? 'Script' : 'VSL'
    const count = items.filter(i => i.type === targetType).length
    const item = await createItem(targetType, `${label} ${count + 1}`)

    const offerSummary = Object.entries(activeItem.output)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')

    // Switch to new item
    savedCount.current = 0
    resetChat()
    setActiveItem(item)
    setItems(prev => [item, ...prev])

    if (offerSummary) {
      const bridgeMsg = `I already have an offer. Here are the details:\n\n${offerSummary}\n\nUse this to build my ${label.toLowerCase()}.`
      // Store bridge message to auto-send after item loads
      pendingBridgeMsg.current = bridgeMsg
    }
    setActiveId(item.id)
  }

  // Auto-send bridge message after the new item's greeting loads
  useEffect(() => {
    if (pendingBridgeMsg.current && messages.length > 0 && !isStreaming) {
      const msg = pendingBridgeMsg.current
      pendingBridgeMsg.current = null
      sendMessage(msg)
    }
  }, [messages, isStreaming])

  if (page === 'roadmap') {
    return <Roadmap onBack={() => setPage('tools')} />
  }

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0f] text-white font-sans">
      <Sidebar
        activeId={activeId}
        items={items}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        model={model}
        onModelChange={setModel}
        onShowRoadmap={() => setPage('roadmap')}
      />
      <Chat
        messages={messages}
        isStreaming={isStreaming}
        onSend={sendMessage}
        toolLabel={TOOL_LABELS[toolType]}
        itemName={activeItem?.name || 'Untitled'}
      />
      <ResizeHandle onResize={handleResize} />
      <OutputPanel
        type={toolType}
        output={activeItem?.output || {}}
        onOutputChange={handleOutputChange}
        model={model}
        width={outputWidth}
        itemId={activeId}
        onBridge={handleBridge}
      />
    </div>
  )
}
