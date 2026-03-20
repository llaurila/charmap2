import { useCallback, useMemo } from 'react'
import { useCopyFeedback } from './useCopyFeedback'
import type { ResultRecord } from '../types/unicode'
import { getCopyFormats } from '../utils/copyFormats'

type UseDetailCopyFormatsResult = {
  announceMessage: string
  copiedLabel: string | null
  copyFormats: ReturnType<typeof getCopyFormats>
  handleCopyFormat: (entry: ReturnType<typeof getCopyFormats>[number]) => Promise<void>
}

export function useDetailCopyFormats(
  selectedDetailRecord: ResultRecord | null,
): UseDetailCopyFormatsResult {
  const { announceMessage, copiedLabel, copyValue } = useCopyFeedback()
  const copyFormats = useMemo(
    () => (selectedDetailRecord ? getCopyFormats(selectedDetailRecord) : []),
    [selectedDetailRecord],
  )

  const handleCopyFormat = useCallback(
    async (entry: (typeof copyFormats)[number]): Promise<void> =>
      copyValue(entry.label, entry.value),
    [copyValue],
  )

  return {
    announceMessage,
    copiedLabel,
    copyFormats,
    handleCopyFormat,
  }
}
