import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 16
const MIN_CHARS_PER_TICK = 3
const MAX_CHARS_PER_TICK = 10
const TARGET_DURATION_MS = 3000

function getCharsPerTick(textLength) {
  const totalTicks = TARGET_DURATION_MS / TICK_MS
  return Math.max(
    MIN_CHARS_PER_TICK,
    Math.min(MAX_CHARS_PER_TICK, Math.ceil(textLength / totalTicks)),
  )
}

export function useTypewriter() {
  const intervalRef = useRef(null)
  const fullTextRef = useRef('')

  const [state, setState] = useState({
    fullText: '',
    visibleLength: 0,
    active: false,
    complete: true,
  })

  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    stopInterval()
    fullTextRef.current = ''
    setState({
      fullText: '',
      visibleLength: 0,
      active: false,
      complete: true,
    })
  }, [stopInterval])

  const ensureInterval = useCallback(() => {
    if (intervalRef.current !== null) return

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const fullText = fullTextRef.current
        if (fullText.length === 0) {
          stopInterval()
          return { ...prev, active: false, complete: true }
        }

        if (prev.visibleLength >= fullText.length) {
          stopInterval()
          return {
            fullText,
            visibleLength: fullText.length,
            active: false,
            complete: true,
          }
        }

        const charsPerTick = getCharsPerTick(fullText.length)
        const visibleLength = Math.min(
          prev.visibleLength + charsPerTick,
          fullText.length,
        )
        const complete = visibleLength >= fullText.length

        if (complete) {
          stopInterval()
        }

        return {
          fullText,
          visibleLength,
          active: !complete,
          complete,
        }
      })
    }, TICK_MS)
  }, [stopInterval])

  const reveal = useCallback(
    (fullText) => {
      fullTextRef.current = fullText

      setState((prev) => {
        const grewFromPrevious =
          prev.fullText.length > 0 && fullText.startsWith(prev.fullText)
        const visibleLength = grewFromPrevious
          ? Math.min(prev.visibleLength, fullText.length)
          : 0
        const complete = fullText.length > 0 && visibleLength >= fullText.length
        const active = fullText.length > 0 && !complete

        return { fullText, visibleLength, active, complete }
      })

      ensureInterval()
    },
    [ensureInterval],
  )

  useEffect(() => () => cancel(), [cancel])

  const visibleText = state.fullText.slice(0, state.visibleLength)

  return { ...state, visibleText, reveal, cancel }
}
