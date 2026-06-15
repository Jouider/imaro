import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'

/** True when running inside the Capacitor native shell (iOS/Android app). */
export const isNative = Capacitor.isNativePlatform()

/**
 * One-time native shell setup — status bar, keyboard, Android hardware back,
 * and hiding the splash screen once the web app has booted. No-op on the web.
 */
export async function initNative(): Promise<void> {
  if (!isNative) return

  // Status bar: dark icons on our light UI; match the surface on Android.
  try {
    await StatusBar.setStyle({ style: Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#f8f9fa' })
    }
  } catch {
    /* status bar plugin unavailable */
  }

  // Keyboard pushes the webview up so inputs stay visible.
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native })
  } catch {
    /* keyboard plugin unavailable */
  }

  // Android hardware back: navigate back through history, exit at the root.
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack || window.history.length > 1) {
      window.history.back()
    } else {
      void CapacitorApp.exitApp()
    }
  })

  // Reveal the app once React has mounted.
  try {
    await SplashScreen.hide()
  } catch {
    /* splash plugin unavailable */
  }
}
