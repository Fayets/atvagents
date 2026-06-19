import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { getAgentById, PLACEHOLDER_TABS, SETTER_TABS } from '../data/agents'
import { GenerarTab } from '../components/generar/GenerarTab'
import { ConexionTab } from '../components/conexion/ConexionTab'
import { KnowledgeTab } from '../components/knowledge/KnowledgeTab'
import { MarcaTab } from '../components/marca/MarcaTab'
import { PlaceholderTab } from '../components/PlaceholderTab'
import { TabBar } from '../components/TabBar'
import { WorkspaceHeader } from '../components/WorkspaceHeader'

const TAB_COMPONENTS = {
  generar: GenerarTab,
  conexion: ConexionTab,
  knowledge: KnowledgeTab,
  marca: MarcaTab,
}

export function WorkspacePage() {
  const { agentId } = useParams()
  const agent = getAgentById(agentId)
  const [activeTab, setActiveTab] = useState('generar')

  if (!agent || !agent.active) {
    return <Navigate to="/" replace />
  }

  const PlaceholderComponent = PLACEHOLDER_TABS.includes(activeTab)
  const ActiveComponent = TAB_COMPONENTS[activeTab]
  const tabLabel = SETTER_TABS.find((tab) => tab.id === activeTab)?.label

  return (
    <div className="atv-shell atv-shell--workspace">
      <WorkspaceHeader agent={agent} />
      <TabBar tabs={SETTER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="workspace-content">
        {PlaceholderComponent && <PlaceholderTab title={tabLabel} />}
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  )
}
