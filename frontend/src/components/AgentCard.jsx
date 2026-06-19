import { useNavigate } from 'react-router-dom'
import { BichoIcon } from './BichoIcon'

export function AgentCard({ agent }) {
  const navigate = useNavigate()

  function handleClick() {
    if (!agent.active) return
    navigate(`/agent/${agent.id}`)
  }

  return (
    <button
      type="button"
      className={`agent-card${agent.active ? '' : ' agent-card--locked'}`}
      onClick={handleClick}
      disabled={!agent.active}
      aria-disabled={!agent.active}
    >
      <div className="agent-card__icon" style={{ '--agent-color': agent.color }}>
        <BichoIcon shape={agent.shape} color={agent.color} size={52} />
      </div>
      <div className="agent-card__body">
        <h2 className="agent-card__name">{agent.name}</h2>
        <p className="agent-card__role">{agent.role}</p>
      </div>
      {!agent.active && <span className="agent-card__badge">Próximamente</span>}
    </button>
  )
}
