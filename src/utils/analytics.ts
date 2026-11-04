type GoatCounter = {
  get_data: (variables?: Record<string, unknown>) => Record<string, unknown>
  count: () => void
}

export const initializeAnalytics = (): void => {
  if (
    !import.meta.env.PROD ||
    window.location.origin !== 'https://llaurila.github.io' ||
    !window.location.pathname.startsWith('/charmap2/')
  ) {
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://gc.zgo.at/count.js'
  script.dataset.goatcounter = 'https://charmap2.goatcounter.com/count'
  script.dataset.goatcounterSettings = JSON.stringify({
    no_onload: true,
    no_events: true,
    path: '/charmap2/',
    title: 'Charmap2',
    referrer: '',
  })

  script.addEventListener('load', () => {
    const goatcounter = (window as Window & { goatcounter?: GoatCounter }).goatcounter
    if (!goatcounter) {
      return
    }

    // count.js includes location.search separately from the configured path.
    const getData = goatcounter.get_data
    goatcounter.get_data = (variables) => {
      const data = getData(variables)
      delete data.q
      return data
    }

    const countWhenVisible = (): void => {
      if (document.visibilityState !== 'visible') {
        return
      }

      document.removeEventListener('visibilitychange', countWhenVisible)
      goatcounter.count()
    }

    document.addEventListener('visibilitychange', countWhenVisible)
    countWhenVisible()
  }, { once: true })

  document.body.appendChild(script)
}
