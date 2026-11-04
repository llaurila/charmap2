import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '../utils/clipboard'

type UseCopyFeedbackResult = {
  announceMessage: string
  copiedLabel: string | null
  copyValue: (label: string, value: string) => Promise<void>
  clearFeedback: () => void
}

export function useCopyFeedback(): UseCopyFeedbackResult {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [announceMessage, setAnnounceMessage] = useState('')
  const revisionRef = useRef(0)

  useEffect(() => {
    if (!copiedLabel) {
      return
    }

    setAnnounceMessage(`${copiedLabel} copied`)
    const timeout = window.setTimeout(() => setCopiedLabel(null), 1600)
    return () => window.clearTimeout(timeout)
  }, [copiedLabel])

  useEffect(() => {
    if (!announceMessage) {
      return
    }

    const timeout = window.setTimeout(() => setAnnounceMessage(''), 1800)
    return () => window.clearTimeout(timeout)
  }, [announceMessage])

  const copyValue = useCallback(async (label: string, value: string): Promise<void> => {
    const revision = revisionRef.current
    await copyText(value)
    if (revisionRef.current === revision) setCopiedLabel(label)
  }, [])

  const clearFeedback = useCallback((): void => {
    revisionRef.current += 1
    setCopiedLabel(null)
    setAnnounceMessage('')
  }, [])

  return {
    announceMessage,
    copiedLabel,
    copyValue,
    clearFeedback,
  }
}
