import { MOCK_GENERATION_LOG_STEPS } from './generateMessage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function postGenerate({
  agent,
  accountId,
  leadContext,
  sessionId,
  images,
}) {
  const formData = new FormData()
  formData.append('agent', agent)
  formData.append('account_id', accountId)
  formData.append('lead_context', leadContext || '')
  if (sessionId) {
    formData.append('session_id', sessionId)
  }
  for (const file of images || []) {
    formData.append('images', file)
  }

  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    let detail = `Error ${response.status}`
    try {
      const body = await response.json()
      if (body.detail) {
        detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  return response.json()
}

export { MOCK_GENERATION_LOG_STEPS }
