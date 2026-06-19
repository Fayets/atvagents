import { useState } from 'react'
import { KNOWLEDGE_BLOCKS } from '../../data/setterMasterPrompt'

export function KnowledgeTab() {
  const [selectedId, setSelectedId] = useState(KNOWLEDGE_BLOCKS[0]?.id ?? null)
  const selected = KNOWLEDGE_BLOCKS.find((block) => block.id === selectedId) ?? KNOWLEDGE_BLOCKS[0]

  return (
    <div className="knowledge-tab">
      <div className="knowledge-explorer">
        <nav className="knowledge-explorer__sidebar" aria-label="Archivos de conocimiento">
          {KNOWLEDGE_BLOCKS.map((block) => {
            const isActive = block.id === selected?.id
            return (
              <button
                key={block.id}
                type="button"
                className={`knowledge-explorer__file${isActive ? ' knowledge-explorer__file--active' : ''}`}
                onClick={() => setSelectedId(block.id)}
              >
                {block.filename}
              </button>
            )
          })}
        </nav>
        <div className="knowledge-explorer__content">
          <pre className="knowledge-explorer__text">{selected?.content ?? ''}</pre>
        </div>
      </div>
    </div>
  )
}
