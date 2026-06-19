import { useRef, useState } from 'react'
import { countWords, getTranscripts, saveTranscripts } from '../../utils/storage'

const CARD_COLORS = ['#94a3b8', '#7cb8a0', '#e8dcc8', '#f0b87a', '#6b7280', '#a5b4c8']

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatWordCount(count) {
  return count.toLocaleString('es-AR')
}

export function MarcaTab() {
  const [transcripts, setTranscripts] = useState(() => getTranscripts())
  const [addOpen, setAddOpen] = useState(false)
  const [viewId, setViewId] = useState(null)
  const [addTitle, setAddTitle] = useState('')
  const [addContent, setAddContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const fileInputRef = useRef(null)

  const viewed = transcripts.find((t) => t.id === viewId) ?? null

  function persist(next) {
    setTranscripts(next)
    saveTranscripts(next)
  }

  function openAdd() {
    setAddTitle('')
    setAddContent('')
    setAddOpen(true)
  }

  function handleSaveNew(e) {
    e.preventDefault()
    const titulo = addTitle.trim()
    const contenido = addContent.trim()
    if (!titulo || !contenido) return

    const entry = {
      id: crypto.randomUUID(),
      titulo,
      contenido,
      fecha: new Date().toISOString(),
      palabras: countWords(contenido),
    }
    persist([entry, ...transcripts])
    setAddOpen(false)
  }

  function openView(id) {
    const item = transcripts.find((t) => t.id === id)
    if (!item) return
    setViewId(id)
    setEditTitle(item.titulo)
    setEditContent(item.contenido)
  }

  function handleCloseView() {
    if (viewed) {
      const titulo = editTitle.trim()
      const contenido = editContent.trim()
      if (titulo && contenido) {
        persist(
          transcripts.map((t) =>
            t.id === viewed.id
              ? { ...t, titulo, contenido, palabras: countWords(contenido) }
              : t,
          ),
        )
      }
    }
    setViewId(null)
  }

  function handleDelete() {
    if (!viewed) return
    persist(transcripts.filter((t) => t.id !== viewed.id))
    setViewId(null)
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      setAddContent(text)
      if (!addTitle.trim()) {
        const baseName = file.name.replace(/\.(txt|md)$/i, '')
        setAddTitle(baseName)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="marca-tab">
      <header className="marca-tab__header">
        <div className="marca-tab__header-text">
          <h2 className="marca-tab__title">Llamadas (memoria)</h2>
          <p className="marca-tab__subtitle">
            Transcripts de llamadas viejas. El Setter las usa como referencia para mantener el estilo y el
            criterio de Juan. Pegá el texto de la llamada o subí un archivo .txt/.md.
          </p>
        </div>
        <button type="button" className="btn-pill btn-pill--sm" onClick={openAdd}>
          + Agregar llamada
        </button>
      </header>

      {transcripts.length === 0 ? (
        <div className="marca-tab__empty">
          <div className="marca-tab__empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="8" y="6" width="24" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 14h14M13 20h14M13 26h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="marca-tab__empty-text">Todavía no agregaste llamadas</p>
          <button type="button" className="btn-pill btn-pill--sm" onClick={openAdd}>
            + Agregar llamada
          </button>
        </div>
      ) : (
        <div className="marca-tab__grid">
          {transcripts.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="marca-card"
              onClick={() => openView(item.id)}
            >
              <div
                className="marca-card__stripe"
                style={{ backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }}
              />
              <div className="marca-card__body">
                <span className="marca-card__name">{item.titulo}</span>
                <span className="marca-card__meta">
                  {formatDate(item.fecha)} · {formatWordCount(item.palabras)} palabras
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Agregar llamada</h3>
            <form className="modal__form" onSubmit={handleSaveNew}>
              <label className="modal__label" htmlFor="add-title">
                Título
              </label>
              <input
                id="add-title"
                type="text"
                className="atv-input"
                placeholder="Llamada - María - Diagnóstico"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                autoFocus
              />
              <label className="modal__label" htmlFor="add-content">
                Transcript
              </label>
              <textarea
                id="add-content"
                className="modal__textarea"
                rows={10}
                placeholder="Pegá acá el texto completo de la llamada…"
                value={addContent}
                onChange={(e) => setAddContent(e.target.value)}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                className="visually-hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="modal__file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Subir archivo .txt/.md
              </button>
              <div className="modal__actions">
                <button type="button" className="btn-secondary" onClick={() => setAddOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-pill btn-pill--sm"
                  disabled={!addTitle.trim() || !addContent.trim()}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewed && (
        <div className="modal-overlay" onClick={handleCloseView}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <label className="modal__label" htmlFor="view-title">
              Título
            </label>
            <input
              id="view-title"
              type="text"
              className="atv-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <label className="modal__label" htmlFor="view-content">
              Transcript
            </label>
            <textarea
              id="view-content"
              className="modal__textarea"
              rows={14}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="modal__actions">
              <button type="button" className="btn-danger" onClick={handleDelete}>
                Eliminar
              </button>
              <button type="button" className="btn-pill btn-pill--sm" onClick={handleCloseView}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
