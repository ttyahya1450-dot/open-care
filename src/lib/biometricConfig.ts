// Native biometric capability detection and config constants.
// Consumed by BiometricCheckpoint via dynamic import — safe to tree-shake on web.

export type BiometricType = 'face' | 'finger' | 'iris' | 'multiple' | 'none';

export interface BiometricCapability {
  available:    boolean;
  biometryType: BiometricType;
  isStrong:     boolean; // true = Class 3 Android / standard iOS
}

export const BIOMETRIC_CONFIG = {
  reason:             'Authenticate to securely access your OpenCare account',
  title:              'OpenCare Sign-In',
  subtitle:           'Use your registered biometric',
  negativeButtonText: 'Use PIN instead',
  maxAttempts:        3,
} as const;

// Returns true only when running inside a Capacitor native shell (iOS / Android).
export async function detectNativeRuntime(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// Full capability probe — call before showing biometric UI.
export async function resolveBiometricCapability(): Promise<BiometricCapability> {
  if (!(await detectNativeRuntime())) {
    return { available: false, biometryType: 'none', isStrong: false };
  }
  try {
    const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    return {
      available:    result.isAvailable,
      biometryType: (result.biometryType ?? 'none') as unknown as BiometricType,
      isStrong:     true,
    };
  } catch {
    return { available: false, biometryType: 'none', isStrong: false };
  }
}
