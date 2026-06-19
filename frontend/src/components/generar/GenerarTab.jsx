import { useCallback, useEffect, useState } from 'react'
import { MOCK_GENERATION_LOG_STEPS, postGenerate } from '../../utils/api'
import { animateGenerationLogs } from '../../utils/generarLogs'
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
    const nextMessages = [...selectedLead.messages, userMessage]
    setSelectedLead({ ...selectedLead, messages: nextMessages })
    setGenerating(true)
    setLiveLogs([])

    const logLines = []
    const steps = MOCK_GENERATION_LOG_STEPS

    const animationPromise = animateGenerationLogs(steps, (line) => {
      logLines.push(line)
      setLiveLogs([...logLines])
    })

    try {
      const [, result] = await Promise.all([
        animationPromise,
        postGenerate({
          agent: AGENT_ID,
          accountId,
          leadContext: trimmed,
          sessionId: selectedLead.sessionId || null,
          images: attachments.map((item) => item.file),
        }),
      ])

      const assistantMessage = {
        role: 'assistant',
        content: result.reply,
        logs: [...logLines],
      }
      const fullMessages = [...nextMessages, assistantMessage]
      const detectedPhase = detectPhaseFromText(result.reply)
      const updated = updateLeadMessages(
        selectedLead.id,
        fullMessages,
        detectedPhase ?? selectedLead.phase,
        result.session_id,
      )
      setSelectedLead(updated)
      refreshLeads()
      setDraft('')
      clearAttachments()
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Error al generar el mensaje'
      const errorMessage = {
        role: 'assistant',
        content: `No pude completar la solicitud.\n\n${errorText}`,
        logs: logLines.length > 0 ? [...logLines] : undefined,
      }
      const fullMessages = [...nextMessages, errorMessage]
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
      />
      <PhaseTracker currentPhase={selectedLead?.phase ?? 1} />
    </div>
  )
}
