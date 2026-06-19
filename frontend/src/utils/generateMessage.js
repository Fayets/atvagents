// MOCK — reemplazar por POST a /api/generate cuando el backend esté listo.
// No borrar la firma de la función, solo el contenido interno.

export const MOCK_GENERATION_LOG_STEPS = [
  'Leyendo identidad.md',
  'Leyendo tono.md',
  'Leyendo dos-and-donts.md',
  'Leyendo fases.md',
  'Leyendo reglas-irrompibles.md',
  'Leyendo errores-comunes.md',
  'Generando mensaje...',
]

export async function generateMessage(leadContext, accountId) {
  await new Promise((resolve) => {
    setTimeout(resolve, 1500)
  })

  return {
    reply:
      `[MOCK] Acá vendría la respuesta real del Setter Master, generada por backend/content/setter vía Claude Code con la cuenta ${accountId}. Este es un texto de prueba para validar el flujo de UI mientras el backend no está conectado.`,
    logs: MOCK_GENERATION_LOG_STEPS,
    fase: 1,
  }
}
