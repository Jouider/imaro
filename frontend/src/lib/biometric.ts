import {
  BiometricAuth,
  BiometryType,
} from '@aparajita/capacitor-biometric-auth'
import { isNative } from '@/lib/native'

export { BiometryType }

/** Whether the device has biometry enrolled and available (native only). */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isNative) return false
  try {
    const { isAvailable } = await BiometricAuth.checkBiometry()
    return isAvailable
  } catch {
    return false
  }
}

/** The kind of biometry available (Face ID, Touch ID, fingerprint…). */
export async function getBiometryType(): Promise<BiometryType> {
  if (!isNative) return BiometryType.none
  try {
    const { biometryType } = await BiometricAuth.checkBiometry()
    return biometryType
  } catch {
    return BiometryType.none
  }
}

/**
 * Prompt the OS biometric check. Resolves true on success, false on failure or
 * cancellation — never throws, so callers can fall back to the access code.
 */
export async function authenticateBiometric(reason: string): Promise<boolean> {
  if (!isNative) return false
  try {
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Annuler',
      allowDeviceCredential: false,
      androidTitle: 'Imaro',
      androidSubtitle: reason,
    })
    return true
  } catch {
    return false
  }
}
