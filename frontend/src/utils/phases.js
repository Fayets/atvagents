export function detectPhaseFromText(text) {
  if (!text) return null
  const match = text.match(/fase\s*(\d{1,2})/i)
  if (!match) return null
  const phase = Number.parseInt(match[1], 10)
  if (phase < 1 || phase > 10) return null
  return phase
}
