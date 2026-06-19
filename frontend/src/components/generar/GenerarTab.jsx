import { useCallback, useEffect, useState } from 'react'
import { useTypewriter } from '../../hooks/useTypewriter'
import { createLead, fetchLead, fetchLeads, streamGenerate } from '../../utils/api'
import { detectPhaseFromText } from '../../utils/phases'
import { getActiveAccountId } from '../../utils/storage'
import { LeadsPanel } from '../chatbot/LeadsPanel'
import { PhaseTracker } from '../chatbot/PhaseTracker'
import { GenerarPanel } from './GenerarPanel'

const AGENT_ID = 'setter'

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

export function GenerarTab() {
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

  function clearAttachments() {
    setAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return []
    })
  }

  async function handleSelectLead(id) {
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
  }

  async function handleCreateLead(name) {
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

  async function handleGenerate() {
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

    const imageDataUrls = hasImages
      ? await Promise.all(attachments.map((item) => readFileAsDataUrl(item.file)))
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
          images: attachments.map((item) => item.file),
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

              setDraft('')
              clearAttachments()
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
  }

  return (
    <div className="generar-layout">
      <LeadsPanel
        leads={leads}
        selectedLeadId={selectedLeadId}
        onSelectLead={handleSelectLead}
        onCreateLead={handleCreateLead}
      />
      <GenerarPanel
        selectedLead={selectedLead}
        draft={draft}
        onDraftChange={setDraft}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onGenerate={handleGenerate}
        generating={generating}
        liveLogs={liveLogs}
        accountMissing={accountMissing}
        typewriter={typewriter}
      />
      <PhaseTracker currentPhase={selectedLead?.phase ?? 1} />
    </div>
  )
}
