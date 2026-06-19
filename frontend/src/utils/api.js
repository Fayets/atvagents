const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function parseErrorResponse(response) {
  let detail = `Error ${response.status}`
  try {
    const body = await response.json()
    if (body.detail) {
      detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    }
  } catch {
    // ignore parse errors
  }
  return detail
}

export async function fetchLeads(agent) {
  const response = await fetch(`${API_BASE}/api/leads?agent=${encodeURIComponent(agent)}`)
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }
  return response.json()
}

export async function createLead({ agent, nombre }) {
  const response = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, nombre }),
  })
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }
  return response.json()
}

export async function fetchLead(id) {
  const response = await fetch(`${API_BASE}/api/leads/${id}`)
  if (!response.ok) {
    throw new Error(await parseErrorResponse(response))
  }
  return response.json()
}

function parseSseBuffer(buffer) {
  const events = []
  const blocks = buffer.split('\n\n')
  const remainder = blocks.pop() ?? ''

  for (const block of blocks) {
    const dataLine = block
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('data:'))

    if (!dataLine) continue

    try {
      events.push(JSON.parse(dataLine.slice(5).trim()))
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, remainder }
}

export async function streamGenerate(
  { agent, accountId, leadId, leadContext, sessionId, images },
  { onEvent },
) {
  const formData = new FormData()
  formData.append('agent', agent)
  formData.append('account_id', accountId)
  formData.append('lead_id', String(leadId))
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
    throw new Error(await parseErrorResponse(response))
  }

  if (!response.body) {
    throw new Error('El servidor no devolvió un stream de respuesta.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const { events, remainder } = parseSseBuffer(buffer)
    buffer = remainder

    for (const event of events) {
      onEvent(event)
      if (event.type === 'done' || event.type === 'error') {
        return
      }
    }
  }
}
