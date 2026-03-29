import type { Message, ToolType } from './chat'

export interface SavedItem {
  id: string
  type: ToolType
  name: string
  chat_history: Message[]
  output: Record<string, string>
  audit: string | null
  created_at: string
  updated_at: string
}

const STORAGE_KEY = 'acq-vantage-items'

function generateId(): string {
  return crypto.randomUUID()
}

export function getItems(): SavedItem[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? JSON.parse(raw) : []
}

export function getItem(id: string): SavedItem | undefined {
  return getItems().find(item => item.id === id)
}

export function saveItem(item: SavedItem): void {
  const items = getItems()
  const index = items.findIndex(i => i.id === item.id)
  item.updated_at = new Date().toISOString()
  if (index >= 0) {
    items[index] = item
  } else {
    items.push(item)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function createItem(type: ToolType, name: string): SavedItem {
  const item: SavedItem = {
    id: generateId(),
    type,
    name,
    chat_history: [],
    output: {},
    audit: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  saveItem(item)
  return item
}

export function deleteItem(id: string): void {
  const items = getItems().filter(i => i.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getOutputSections(type: ToolType): string[] {
  switch (type) {
    case 'offer':
      return ['Offer Name', 'Dream Outcome', 'Target Market', 'Problems We Solve', 'Mechanism', 'Value Stack', 'Proof', 'Price', 'Guarantee', 'Scarcity', 'Call to Action']
    case 'script':
      return ['Context', 'Channel', 'Opener', 'Clarify', 'Label', 'Overview', 'Value Presentation', 'Price Reveal', 'Objection Handling', 'Close', 'Reinforce', 'Follow-Up']
    case 'vsl':
      return ['Hook', 'Problem', 'Credibility', 'Mechanism', 'Value Stack', 'Risk Reversal', 'CTA']
    default:
      return []
  }
}
