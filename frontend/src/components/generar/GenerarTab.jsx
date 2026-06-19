import { useGenerar } from '../../context/GenerarContext'
import { LeadsPanel } from '../chatbot/LeadsPanel'
import { PhaseTracker } from '../chatbot/PhaseTracker'
import { GenerarPanel } from './GenerarPanel'

export function GenerarTab() {
  const {
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
  } = useGenerar()

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
