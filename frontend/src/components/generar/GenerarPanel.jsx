import { useEffect, useRef, useState } from 'react'
import { renderBoldMarkdown } from '../../utils/markdown'

const MAX_IMAGES = 6
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

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

function UserMessageContent({ content, images }) {
  const hasImages = images?.length > 0
  const hasText = Boolean(content?.trim())

  return (
    <div className="chat-bubble__content">
      {hasImages && (
        <div className="chat-bubble__images">
          {images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              className="chat-bubble__thumb"
            />
          ))}
        </div>
      )}
      {hasText && <span className="chat-bubble__text">{content}</span>}
    </div>
  )
}

export function GenerarPanel({
  selectedLead,
  draft,
  onDraftChange,
  attachments,
  onAttachmentsChange,
  onGenerate,
  generating,
  liveLogs,
  accountMissing,
}) {
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const [expandedLogIndexes, setExpandedLogIndexes] = useState(() => new Set())
  const canGenerate = Boolean(draft.trim()) || attachments.length > 0

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

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((file) => ACCEPTED_TYPES.includes(file.type))
    if (incoming.length === 0) return

    const available = MAX_IMAGES - attachments.length
    const toAdd = incoming.slice(0, available).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    if (toAdd.length > 0) {
      onAttachmentsChange([...attachments, ...toAdd])
    }
  }

  function removeAttachment(id) {
    const target = attachments.find((item) => item.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onAttachmentsChange(attachments.filter((item) => item.id !== id))
  }

  function handleDrop(e) {
    e.preventDefault()
    if (generating) return
    addFiles(e.dataTransfer.files)
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
          <p className="generar-panel__hint">
            Pegá la conversación con el lead, adjuntá capturas, o ambas cosas.
          </p>
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
                <UserMessageContent content={msg.content} images={msg.images} />
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
        <div
          className="generar-attach"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="visually-hidden"
            disabled={generating || attachments.length >= MAX_IMAGES}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="generar-attach__trigger"
            disabled={generating || attachments.length >= MAX_IMAGES}
            onClick={() => fileInputRef.current?.click()}
          >
            + Adjuntar capturas (hasta 6)
          </button>
          {attachments.length > 0 && (
            <div className="generar-attach__previews">
              {attachments.map((item) => (
                <div key={item.id} className="generar-attach__preview">
                  <img src={item.previewUrl} alt="" className="generar-attach__thumb" />
                  <button
                    type="button"
                    className="generar-attach__remove"
                    aria-label="Quitar captura"
                    disabled={generating}
                    onClick={() => removeAttachment(item.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="btn-pill"
          disabled={generating || !canGenerate || accountMissing}
        >
          Generar
        </button>
      </form>
    </section>
  )
}
