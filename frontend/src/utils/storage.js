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

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function getTranscripts() {
  return readJson(TRANSCRIPTS_KEY, [])
}

export function saveTranscripts(transcripts) {
  writeJson(TRANSCRIPTS_KEY, transcripts)
}
