import { useCallback, useEffect, useState } from 'react'
import { generateMessage, MOCK_GENERATION_LOG_STEPS } from '../../utils/generateMessage'
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

export function GenerarTab() {
  const [leads, setLeads] = useState(() => getLeadsIndex())
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [draft, setDraft] = useState('')
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

  function handleSelectLead(id) {
    setSelectedLeadId(id)
    setDraft('')
  }

  function handleCreateLead(name) {
    const lead = createLead(name)
    refreshLeads()
    setSelectedLeadId(lead.id)
    setSelectedLead(lead)
  }

  async function handleGenerate() {
    const trimmed = draft.trim()
    if (!trimmed || generating) return

    const accountId = getActiveAccountId()
    if (!accountId) {
      setAccountMissing(true)
      return
    }
    setAccountMissing(false)

    if (!selectedLead) return

    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...selectedLead.messages, userMessage]
    setSelectedLead({ ...selectedLead, messages: nextMessages })
    setDraft('')
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
        generateMessage(
          {
            leadId: selectedLead.id,
            leadName: selectedLead.name,
            messages: selectedLead.messages,
            userMessage: trimmed,
          },
          accountId,
        ),
      ])

      const assistantMessage = {
        role: 'assistant',
        content: result.reply,
        logs: [...logLines],
      }
      const fullMessages = [...nextMessages, assistantMessage]
      const detectedPhase = result.fase ?? detectPhaseFromText(result.reply)
      const updated = updateLeadMessages(
        selectedLead.id,
        fullMessages,
        detectedPhase ?? selectedLead.phase,
      )
      setSelectedLead(updated)
      refreshLeads()
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
        onGenerate={handleGenerate}
        generating={generating}
        liveLogs={liveLogs}
        accountMissing={accountMissing}
      />
      <PhaseTracker currentPhase={selectedLead?.phase ?? 1} />
    </div>
  )
}
