import { PHASES } from '../../data/setterMasterPrompt'

export function PhaseTracker({ currentPhase }) {
  return (
    <aside className="phase-tracker">
      <h2 className="phase-tracker__title">Fases</h2>
      <ol className="phase-tracker__list">
        {PHASES.map((phase) => {
          const isActive = currentPhase === phase.number
          return (
            <li
              key={phase.number}
              className={`phase-tracker__item${isActive ? ' phase-tracker__item--active' : ''}`}
            >
              <span className="phase-tracker__number">{phase.number}</span>
              <div>
                <span className="phase-tracker__name">{phase.title}</span>
                <span className="phase-tracker__desc">{phase.description}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
