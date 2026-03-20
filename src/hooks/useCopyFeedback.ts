import { useCallback, useEffect, useState } from 'react'
import { copyText } from '../utils/clipboard'

type UseCopyFeedbackResult = {
  announceMessage: string
  copiedLabel: string | null
  copyValue: (label: string, value: string) => Promise<void>
}

export function useCopyFeedback(): UseCopyFeedbackResult {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)
  const [announceMessage, setAnnounceMessage] = useState('')

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
    await copyText(value)
    setCopiedLabel(label)
  }, [])

  return {
    announceMessage,
    copiedLabel,
    copyValue,
  }
}
