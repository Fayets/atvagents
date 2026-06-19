import { useNavigate } from 'react-router-dom'
import { BichoIcon } from './BichoIcon'

export function WorkspaceHeader({ agent }) {
  const navigate = useNavigate()

  return (
    <header className="workspace-header">
      <button type="button" className="workspace-header__back" onClick={() => navigate('/')}>
        ←
      </button>
      <div className="workspace-header__agent">
        <div className="workspace-header__icon">
          <BichoIcon shape={agent.shape} color={agent.color} size={36} />
        </div>
        <div>
          <h1 className="workspace-header__name">{agent.name}</h1>
          <p className="workspace-header__role">{agent.role}</p>
        </div>
      </div>
    </header>
  )
}
