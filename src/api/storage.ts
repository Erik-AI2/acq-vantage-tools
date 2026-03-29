import { createClient } from '@supabase/supabase-js'
import type { ToolType } from './chat'

const supabase = createClient(
  'https://ioanyldicahtiddvarop.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYW55bGRpY2FodGlkZHZhcm9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDI1MDMsImV4cCI6MjA5MDM3ODUwM30.42HgP6URhQnYoJK10lL_VNLT0uUf7cXszHGV2Pi43HI'
)

// ---------- Types ----------

export interface SavedItem {
  id: string
  type: ToolType
  name: string
  output: Record<string, string>
  created_at: string
  updated_at: string
}

export interface MessageRow {
  id: string
  item_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface AuditRow {
  id: string
  item_id: string
  content: string
  created_at: string
}

// ---------- Items ----------

export async function getItems(): Promise<SavedItem[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as SavedItem[]
}

export async function getItem(id: string): Promise<SavedItem | undefined> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return undefined
  return data as SavedItem
}

export async function createItem(type: ToolType, name: string): Promise<SavedItem> {
  const { data, error } = await supabase
    .from('items')
    .insert({ type, name, output: {} })
    .select()
    .single()
  if (error) throw error
  return data as SavedItem
}

export async function updateItem(id: string, fields: Partial<Pick<SavedItem, 'name' | 'output'>>): Promise<void> {
  const { error } = await supabase
    .from('items')
    .update(fields)
    .eq('id', id)
  if (error) throw error
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ---------- Messages ----------

export async function getMessages(itemId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data as MessageRow[]
}

export async function addMessage(itemId: string, role: 'user' | 'assistant', content: string): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ item_id: itemId, role, content })
    .select()
    .single()
  if (error) throw error
  return data as MessageRow
}

// ---------- Audits ----------

export async function getAudits(itemId: string): Promise<AuditRow[]> {
  const { data, error } = await supabase
    .from('audits')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as AuditRow[]
}

export async function addAudit(itemId: string, content: string): Promise<AuditRow> {
  const { data, error } = await supabase
    .from('audits')
    .insert({ item_id: itemId, content })
    .select()
    .single()
  if (error) throw error
  return data as AuditRow
}

// ---------- Output Sections (static, no DB) ----------

export function getOutputSections(type: ToolType): string[] {
  switch (type) {
    case 'offer':
      return ['Offer Name', 'Dream Outcome', 'Target Market', 'Problems We Solve', 'Mechanism', 'Value Stack', 'Proof', 'Price', 'Guarantee', 'Scarcity', 'Call to Action']
    case 'script':
      return ['Opener', 'Pain Discovery', 'Demo Script', 'Value Stack & Price', 'Objections & Rebuttals', 'Close', 'Follow-Up', 'Special Pitch']
    case 'vsl':
      return ['Hook', 'Problem', 'Credibility', 'Mechanism', 'Value Stack', 'Risk Reversal', 'CTA']
    default:
      return []
  }
}
