import { useEffect, useRef, useState } from 'react'
import { renderBoldMarkdown } from '../../utils/markdown'

function LogConsole({ lines }) {
  return (
    <div className="generar-console">
      {lines.map((line, i) => (
        <div key={i} className="generar-console__line">
          {line}
        </div>
      ))}
    </div>
  )
}

export function GenerarPanel({
  selectedLead,
  draft,
  onDraftChange,
  onGenerate,
  generating,
  liveLogs,
  accountMissing,
}) {
  const bottomRef = useRef(null)
  const [expandedLogIndexes, setExpandedLogIndexes] = useState(() => new Set())

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedLead?.messages, generating, liveLogs])

  function toggleLogs(index) {
    setExpandedLogIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (!selectedLead) {
    return (
      <section className="generar-panel generar-panel--empty">
        <div className="generar-panel__empty-state">
          <p className="generar-panel__empty-title">Elegí o creá un lead</p>
          <p className="generar-panel__empty-text">
            Seleccioná un lead de la lista o usá &quot;+ Nuevo lead&quot; para empezar a practicar setting.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="generar-panel">
      <div className="generar-panel__messages">
        {selectedLead.messages.length === 0 && !generating && (
          <p className="generar-panel__hint">Pegá la conversación con el lead y tocá Generar.</p>
        )}
        {selectedLead.messages.map((msg, index) => (
          <div key={`${msg.role}-${index}`} className="generar-panel__message-group">
            <div className={`chat-bubble chat-bubble--${msg.role}`}>
              {msg.role === 'assistant' ? (
                <div
                  className="chat-bubble__content"
                  dangerouslySetInnerHTML={{ __html: renderBoldMarkdown(msg.content) }}
                />
              ) : (
                <div className="chat-bubble__content">{msg.content}</div>
              )}
            </div>
            {msg.role === 'assistant' && msg.logs?.length > 0 && (
              <div className="generar-logs-toggle">
                <button
                  type="button"
                  className="generar-logs-toggle__btn"
                  onClick={() => toggleLogs(index)}
                >
                  {expandedLogIndexes.has(index) ? 'Ocultar logs' : 'Ver logs'}
                </button>
                {expandedLogIndexes.has(index) && <LogConsole lines={msg.logs} />}
              </div>
            )}
          </div>
        ))}
        {generating && liveLogs.length > 0 && <LogConsole lines={liveLogs} />}
        <div ref={bottomRef} />
      </div>
      <form
        className="generar-panel__composer"
        onSubmit={(e) => {
          e.preventDefault()
          onGenerate()
        }}
      >
        {accountMissing && (
          <p className="generar-panel__warning">
            Elegí una cuenta en Conexión antes de generar.
          </p>
        )}
        <textarea
          className="generar-panel__input"
          rows={3}
          placeholder="Pegá el transcript de la conversación…"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          disabled={generating}
        />
        <button
          type="submit"
          className="btn-pill"
          disabled={generating || !draft.trim() || accountMissing}
        >
          Generar
        </button>
      </form>
    </section>
  )
}
