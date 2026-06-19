const LEADS_INDEX_KEY = 'atv_leads_index'
const LEAD_PREFIX = 'atv_lead_'
const ACTIVE_ACCOUNT_KEY = 'atv_active_account'
const TRANSCRIPTS_KEY = 'atv_setter_transcripts'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getActiveAccountId() {
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY) || ''
}

export function saveActiveAccountId(id) {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, id)
}

export function getLeadsIndex() {
  return readJson(LEADS_INDEX_KEY, [])
}

function saveLeadsIndex(index) {
  writeJson(LEADS_INDEX_KEY, index)
}

export function getLead(id) {
  return readJson(`${LEAD_PREFIX}${id}`, null)
}

export function saveLead(lead) {
  writeJson(`${LEAD_PREFIX}${lead.id}`, lead)
  const index = getLeadsIndex()
  const entry = {
    id: lead.id,
    name: lead.name,
    phase: lead.phase ?? 1,
    lastContact: lead.lastContact,
  }
  const existing = index.findIndex((item) => item.id === lead.id)
  if (existing >= 0) {
    index[existing] = entry
  } else {
    index.unshift(entry)
  }
  saveLeadsIndex(index)
}

export function createLead(name) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const lead = {
    id,
    name: name.trim(),
    phase: 1,
    lastContact: now,
    messages: [],
  }
  saveLead(lead)
  return lead
}

export function updateLeadMessages(id, messages, phase, sessionId) {
  const lead = getLead(id)
  if (!lead) return null
  const updated = {
    ...lead,
    messages,
    phase: phase ?? lead.phase,
    sessionId: sessionId !== undefined ? sessionId : lead.sessionId,
    lastContact: new Date().toISOString(),
  }
  saveLead(updated)
  return updated
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function getTranscripts() {
  return readJson(TRANSCRIPTS_KEY, [])
}

export function saveTranscripts(transcripts) {
  writeJson(TRANSCRIPTS_KEY, transcripts)
}
