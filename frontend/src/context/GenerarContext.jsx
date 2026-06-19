import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useTypewriter } from '../hooks/useTypewriter'
import { createLead, fetchLead, fetchLeads, streamGenerate } from '../utils/api'
import { detectPhaseFromText } from '../utils/phases'
import { getActiveAccountId } from '../utils/storage'

const AGENT_ID = 'setter'

const GenerarContext = createContext(null)

function mapLeadFromApi(lead) {
  return {
    id: lead.id,
    name: lead.nombre,
    phase: lead.fase || 1,
    sessionId: lead.session_id || null,
    lastContact: lead.actualizado,
    messages: (lead.mensajes || []).map((msg) => ({
      role: msg.role,
      content: msg.contenido,
      logs: msg.logs ?? undefined,
    })),
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function upsertStreamingAssistant(messages, content, streaming) {
  const last = messages[messages.length - 1]
  if (last?.role === 'assistant' && last.streaming) {
    return [
      ...messages.slice(0, -1),
      { ...last, content, streaming },
    ]
  }
  return [...messages, { role: 'assistant', content, streaming: true }]
}

export function GenerarProvider({ children }) {
  const [leads, setLeads] = useState([])
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [generating, setGenerating] = useState(false)
  const [liveLogs, setLiveLogs] = useState([])
  const [accountMissing, setAccountMissing] = useState(() => !getActiveAccountId())
  const typewriter = useTypewriter()

  const loadLeads = useCallback(async () => {
    const data = await fetchLeads(AGENT_ID)
    setLeads(data)
  }, [])

  useEffect(() => {
    loadLeads().catch(() => {
      setLeads([])
    })
  }, [loadLeads])

  useEffect(() => {
    typewriter.cancel()
  }, [selectedLeadId, typewriter.cancel])

  const clearAttachments = useCallback(() => {
    setAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return []
    })
  }, [])

  const handleSelectLead = useCallback(async (id) => {
    setSelectedLeadId(id)
    setSelectedLead(null)
    setDraft('')
    clearAttachments()

    try {
      const lead = await fetchLead(id)
      setSelectedLead(mapLeadFromApi(lead))
    } catch {
      setSelectedLead(null)
    }
  }, [clearAttachments])

  const handleCreateLead = useCallback(async (name) => {
    try {
      const lead = await createLead({ agent: AGENT_ID, nombre: name })
      setLeads((current) => [lead, ...current])
      setSelectedLeadId(lead.id)
      setSelectedLead(mapLeadFromApi({ ...lead, mensajes: [] }))
      setDraft('')
      clearAttachments()
    } catch {
      window.alert('No se pudo crear el lead. Intentá de nuevo.')
    }
  }, [clearAttachments])

  const handleGenerate = useCallback(async () => {
    const trimmed = draft.trim()
    const hasImages = attachments.length > 0
    if ((!trimmed && !hasImages) || generating) return

    const accountId = getActiveAccountId()
    if (!accountId) {
      setAccountMissing(true)
      return
    }
    setAccountMissing(false)

    if (!selectedLead) return

    const imageAttachments = [...attachments]
    const imageFiles = imageAttachments.map((item) => item.file)

    setDraft('')
    clearAttachments()

    const imageDataUrls = hasImages
      ? await Promise.all(imageAttachments.map((item) => readFileAsDataUrl(item.file)))
      : []

    const userMessage = {
      role: 'user',
      content: trimmed,
      ...(imageDataUrls.length > 0 ? { images: imageDataUrls } : {}),
    }
    const baseMessages = [...selectedLead.messages, userMessage]

    setSelectedLead({ ...selectedLead, messages: baseMessages })
    setGenerating(true)
    setLiveLogs([])
    typewriter.cancel()

    let accumulatedText = ''
    const logLines = []
    let assistantVisible = false
    let streamFinished = false
    const activeLeadId = selectedLead.id

    function showAssistant(content) {
      assistantVisible = true
      setSelectedLead((prev) => ({
        ...prev,
        messages: upsertStreamingAssistant(prev.messages, content, true),
      }))
    }

    try {
      await streamGenerate(
        {
          agent: AGENT_ID,
          accountId,
          leadId: activeLeadId,
          leadContext: trimmed,
          sessionId: selectedLead.sessionId || null,
          images: imageFiles,
        },
        {
          onEvent(event) {
            if (event.type === 'log') {
              logLines.push(event.value)
              setLiveLogs([...logLines])
              if (!assistantVisible) showAssistant('')
            }

            if (event.type === 'text_chunk') {
              accumulatedText += event.value
              if (!assistantVisible) showAssistant('')
              typewriter.reveal(accumulatedText)
            }

            if (event.type === 'error') {
              streamFinished = true
              typewriter.cancel()
              const errorMessage = {
                role: 'assistant',
                content: `No pude completar la solicitud.\n\n${event.detail || 'Error desconocido.'}`,
                logs: logLines.length > 0 ? [...logLines] : undefined,
              }
              setSelectedLead((prev) => ({
                ...prev,
                messages: [...baseMessages, errorMessage],
              }))
            }

            if (event.type === 'done') {
              streamFinished = true
              const assistantMessage = {
                role: 'assistant',
                content: accumulatedText,
                logs: logLines.length > 0 ? [...logLines] : undefined,
              }
              const detectedPhase = detectPhaseFromText(accumulatedText)
              const updatedAt = new Date().toISOString()

              setSelectedLead((prev) => ({
                ...prev,
                messages: [...baseMessages, assistantMessage],
                sessionId: event.session_id,
                phase: detectedPhase ?? prev.phase,
              }))

              setLeads((prev) =>
                prev.map((lead) =>
                  lead.id === activeLeadId
                    ? {
                        ...lead,
                        fase: detectedPhase ?? lead.fase,
                        actualizado: updatedAt,
                      }
                    : lead,
                ),
              )
            }
          },
        },
      )

      if (!streamFinished) {
        throw new Error('La conexión con el agente se interrumpió antes de completar la respuesta.')
      }
    } catch (err) {
      typewriter.cancel()
      const errorText = err instanceof Error ? err.message : 'Error al generar el mensaje'
      const errorMessage = {
        role: 'assistant',
        content: `No pude completar la solicitud.\n\n${errorText}`,
        logs: logLines.length > 0 ? [...logLines] : undefined,
      }
      setSelectedLead((prev) => ({
        ...prev,
        messages: [...baseMessages, errorMessage],
      }))
    } finally {
      setGenerating(false)
      setLiveLogs([])
    }
  }, [
    attachments,
    clearAttachments,
    draft,
    generating,
    selectedLead,
    typewriter,
  ])

  const value = {
    leads,
    selectedLeadId,
    selectedLead,
    draft,
    setDraft,
    attachments,
    setAttachments,
    generating,
    liveLogs,
    accountMissing,
    typewriter,
    handleSelectLead,
    handleCreateLead,
    handleGenerate,
  }

  return <GenerarContext.Provider value={value}>{children}</GenerarContext.Provider>
}

export function useGenerar() {
  const context = useContext(GenerarContext)
  if (!context) {
    throw new Error('useGenerar debe usarse dentro de GenerarProvider')
  }
  return context
}
