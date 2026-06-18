import { Share } from '@capacitor/share'
import { Browser } from '@capacitor/browser'
import { isNative } from '@/lib/native'

/**
 * Listen for the in-app browser closing (native only). Returns a cleanup
 * function — call it when the component unmounts to avoid double-firing.
 * On web, `cb` is never called (the browser tab doesn't emit close events).
 */
export function listenForBrowserClose(cb: () => void): () => void {
  if (!isNative) return () => {}
  let removed = false
  const handle = Browser.addListener('browserFinished', () => {
    if (!removed) cb()
  })
  return () => {
    removed = true
    void handle.then((h) => h.remove())
  }
}

/** True when a share sheet is available (native, or web with the Web Share API). */
export async function canShare(): Promise<boolean> {
  if (isNative) {
    try {
      return (await Share.canShare()).value
    } catch {
      return false
    }
  }
  return (
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  )
}

/**
 * Open the OS share sheet (native) or the Web Share API (web). Returns true if a
 * sheet was presented, false otherwise — callers keep WhatsApp/SMS/copy as a
 * fallback. Cancellation counts as "presented" (true).
 */
export async function shareContent(opts: {
  title?: string
  text?: string
  url?: string
  dialogTitle?: string
}): Promise<boolean> {
  try {
    if (isNative) {
      await Share.share(opts)
      return true
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      })
      return true
    }
  } catch {
    // User cancelled or share failed — fall back to the explicit channels.
  }
  return false
}

/**
 * Open an external URL in the in-app browser on native (keeps the user inside
 * the app — e.g. payment receipts), or a new tab on the web. Real-world service
 * links (charges, receipts) → external browsing is allowed by the stores.
 */
export async function openExternal(url: string): Promise<void> {
  if (isNative) {
    await Browser.open({ url, presentationStyle: 'popover' })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
