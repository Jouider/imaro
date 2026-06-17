import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Imaro — application propriétaire (copropriétaire) iOS + Android.
 *
 * Capacitor encapsule le build web du portail (`dist/`) ; l'app embarque le
 * bundle (offline-capable) et démarre sur le portail résident.
 *
 * appId à confirmer avant soumission (cf. KAN-63). Apple Team ID : 6U4S82LM57
 * → app identifier complet pour l'AASA : `6U4S82LM57.ma.imaro.portail`.
 */
const config: CapacitorConfig = {
  appId: 'ma.imaro.portail',
  appName: 'Imaro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  backgroundColor: '#1B4F72',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#1B4F72',
    },
    // Route fetch/XHR through the native HTTP stack so API calls bypass the
    // WebView's CORS checks (the app origin capacitor://localhost isn't in the
    // backend allow-list — see KAN-71). No effect on the web build.
    CapacitorHttp: {
      enabled: true,
    },
    PushNotifications: {
      // Android: default notification channel shown to the user.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
