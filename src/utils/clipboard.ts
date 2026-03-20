const fallbackCopy = async (value: string): Promise<void> => {
  const helper = document.createElement('textarea')
  helper.value = value
  helper.setAttribute('readonly', 'true')
  helper.style.position = 'absolute'
  helper.style.left = '-9999px'
  document.body.appendChild(helper)
  helper.select()
  document.execCommand('copy')
  document.body.removeChild(helper)
}

export const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  await fallbackCopy(value)
}
