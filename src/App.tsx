import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { Chat } from './components/Chat'
import { OutputPanel } from './components/OutputPanel'
import { ResizeHandle } from './components/ResizeHandle'
import { useChat } from './hooks/useChat'
import type { SavedItem } from './api/storage'
import { getItem, saveItem, createItem } from './api/storage'
import type { ToolType } from './api/chat'

const TOOL_LABELS: Record<ToolType, string> = {
  offer: 'Offer Creator',
  script: 'Sales Script',
  vsl: 'VSL Generator',
}

const MIN_OUTPUT_WIDTH = 240
const MAX_OUTPUT_WIDTH = 600
const DEFAULT_OUTPUT_WIDTH = 360

export default function App() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<SavedItem | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [outputWidth, setOutputWidth] = useState(DEFAULT_OUTPUT_WIDTH)

  const toolType = activeItem?.type || 'offer'
  const { messages, isStreaming, model, setModel, sendMessage, resetChat } = useChat(toolType)

  useEffect(() => {
    if (activeId) {
      const item = getItem(activeId)
      if (item) setActiveItem(item)
    }
  }, [activeId])

  useEffect(() => {
    if (activeItem && messages.length > 0) {
      const updated = { ...activeItem, chat_history: messages }
      saveItem(updated)
    }
  }, [messages])

  useEffect(() => {
    if (!activeId) {
      const item = createItem('offer', 'My First Offer')
      setActiveId(item.id)
      setRefreshKey(k => k + 1)
    }
  }, [])

  const handleResize = useCallback((delta: number) => {
    setOutputWidth(w => Math.min(MAX_OUTPUT_WIDTH, Math.max(MIN_OUTPUT_WIDTH, w + delta)))
  }, [])

  function handleSelect(id: string) {
    setActiveId(id)
    resetChat()
  }

  function handleNew(item: SavedItem) {
    setActiveId(item.id)
    resetChat()
    setRefreshKey(k => k + 1)
  }

  function handleDelete(id: string) {
    if (activeId === id) {
      setActiveId(null)
      setActiveItem(null)
      resetChat()
    }
    setRefreshKey(k => k + 1)
  }

  function handleOutputChange(output: Record<string, string>) {
    if (activeItem) {
      const updated = { ...activeItem, output }
      saveItem(updated)
      setActiveItem(updated)
    }
  }

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0f] text-white font-sans">
      <Sidebar
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
        model={model}
        onModelChange={setModel}
        refreshKey={refreshKey}
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
      />
    </div>
  )
}
