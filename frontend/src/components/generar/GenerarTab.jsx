import { useCallback, useEffect, useState } from 'react'
import { useTypewriter } from '../../hooks/useTypewriter'
import { streamGenerate } from '../../utils/api'
import { detectPhaseFromText } from '../../utils/phases'
import {
  createLead,
  getActiveAccountId,
  getLead,
  getLeadsIndex,
  updateLeadMessages,
} from '../../utils/storage'
import { LeadsPanel } from '../chatbot/LeadsPanel'
import { PhaseTracker } from '../chatbot/PhaseTracker'
import { GenerarPanel } from './GenerarPanel'

const AGENT_ID = 'setter'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function GenerarTab() {
  const [leads, setLeads] = useState(() => getLeadsIndex())
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [generating, setGenerating] = useState(false)
  const [liveLogs, setLiveLogs] = useState([])
  const [accountMissing, setAccountMissing] = useState(() => !getActiveAccountId())
  const typewriter = useTypewriter()

  const refreshLeads = useCallback(() => {
    setLeads(getLeadsIndex())
  }, [])

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null)
      return
    }
    setSelectedLead(getLead(selectedLeadId))
  }, [selectedLeadId, leads])

  useEffect(() => {
    typewriter.cancel()
  }, [selectedLeadId, typewriter.cancel])

  function clearAttachments() {
    setAttachments((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return []
    })
  }

  function handleSelectLead(id) {
    setSelectedLeadId(id)
    setDraft('')
    clearAttachments()
  }

  function handleCreateLead(name) {
    const lead = createLead(name)
    refreshLeads()
    setSelectedLeadId(lead.id)
    setSelectedLead(lead)
    setDraft('')
    clearAttachments()
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
              const fullMessages = [...baseMessages, errorMessage]
              const updated = updateLeadMessages(
                selectedLead.id,
                fullMessages,
                selectedLead.phase,
              )
              setSelectedLead(updated)
              refreshLeads()
            }

            if (event.type === 'done') {
              streamFinished = true
              const assistantMessage = {
                role: 'assistant',
                content: accumulatedText,
                logs: logLines.length > 0 ? [...logLines] : undefined,
              }
              const fullMessages = [...baseMessages, assistantMessage]
              const detectedPhase = detectPhaseFromText(accumulatedText)
              const updated = updateLeadMessages(
                selectedLead.id,
                fullMessages,
                detectedPhase ?? selectedLead.phase,
                event.session_id,
              )
              setSelectedLead(updated)
              refreshLeads()
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
      const fullMessages = [...baseMessages, errorMessage]
      const updated = updateLeadMessages(selectedLead.id, fullMessages, selectedLead.phase)
      setSelectedLead(updated)
      refreshLeads()
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
