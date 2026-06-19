function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LeadsPanel({ leads, selectedLeadId, onSelectLead, onCreateLead }) {
  function handleNewLead() {
    const name = window.prompt('Nombre del lead:')
    if (!name?.trim()) return
    onCreateLead(name.trim())
  }

  return (
    <aside className="leads-panel">
      <div className="leads-panel__header">
        <h2 className="leads-panel__title">Leads</h2>
        <button type="button" className="btn-pill btn-pill--sm" onClick={handleNewLead}>
          + Nuevo lead
        </button>
      </div>
      <ul className="leads-panel__list">
        {leads.length === 0 && (
          <li className="leads-panel__empty">Todavía no hay leads. Creá el primero.</li>
        )}
        {leads.map((lead) => (
          <li key={lead.id}>
            <button
              type="button"
              className={`leads-panel__item${selectedLeadId === lead.id ? ' leads-panel__item--active' : ''}`}
              onClick={() => onSelectLead(lead.id)}
            >
              <span className="leads-panel__name">{lead.name}</span>
              <span className="leads-panel__meta">Fase {lead.phase ?? 1}</span>
              <span className="leads-panel__date">{formatDate(lead.lastContact)}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
