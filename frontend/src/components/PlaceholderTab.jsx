export function PlaceholderTab({ title }) {
  return (
    <div className="placeholder-tab">
      <div className="placeholder-tab__icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="6" y="8" width="28" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M14 18h12M14 24h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="placeholder-tab__title">{title}</h2>
      <p className="placeholder-tab__text">Esta sección se activa en la próxima etapa del proyecto.</p>
    </div>
  )
}
