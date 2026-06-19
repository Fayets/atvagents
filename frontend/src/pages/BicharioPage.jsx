import { AGENTS } from '../data/agents'
import { AgentCard } from '../components/AgentCard'

export function BicharioPage() {
  return (
    <div className="atv-shell">
      <main className="bichario-page">
        <header className="bichario-header">
          <p className="bichario-header__eyebrow">ATV Pack</p>
          <h1 className="bichario-header__title">Bichario</h1>
          <p className="bichario-header__subtitle">Elegí un agente para abrir su workspace</p>
        </header>
        <div className="bichario-grid">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </main>
    </div>
  )
}
