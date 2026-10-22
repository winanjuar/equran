// Non-standard browser event — not yet in TypeScript's lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const useInstallPWA = () => {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const isIOS = ref(false)
  const isInstalled = ref(false)

  onMounted(() => {
    // Already running in standalone mode (already installed)
    isInstalled.value =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true

    // Detect iOS Safari (no beforeinstallprompt support)
    isIOS.value =
      /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream

    // Android Chrome / Edge / Samsung Internet
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault() // prevent the mini-infobar from appearing
      deferredPrompt.value = e as BeforeInstallPromptEvent
      canInstall.value = true
    })

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      canInstall.value = false
      deferredPrompt.value = null
    })
  })

  const install = async () => {
    if (!deferredPrompt.value) return
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      canInstall.value = false
      deferredPrompt.value = null
    }
  }

  return { canInstall, isIOS, isInstalled, install }
}
