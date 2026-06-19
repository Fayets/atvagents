import { KNOWLEDGE_BLOCKS } from '../data/setterMasterPrompt'

export const KNOWLEDGE_FILENAMES = KNOWLEDGE_BLOCKS.map((block) => block.filename)

export function buildLogSteps() {
  return [
    ...KNOWLEDGE_FILENAMES.map((filename) => `Leyendo ${filename}`),
    'Analizando conversación del lead',
    'Generando mensaje...',
  ]
}

function formatLogTimestamp(date = new Date()) {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export async function animateGenerationLogs(steps, onLine) {
  for (const step of steps) {
    await new Promise((resolve) => {
      setTimeout(resolve, 150 + Math.random() * 100)
    })
    onLine(`[${formatLogTimestamp()}] › ${step}`)
  }
}
