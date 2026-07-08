import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.opencare.app',
  appName: 'OpenCare',
  webDir: 'out',
  server: {
    // Live-server mode keeps Next.js API routes accessible from native shell.
    // Set NEXT_PUBLIC_APP_URL and uncomment before running `npx cap sync`.
    // url: process.env.NEXT_PUBLIC_APP_URL,
    androidScheme: 'https',
    hostname: 'app.opencare.com.au',
    allowNavigation: ['*.opencare.com.au', '*.stripe.com'],
  },
  ios: {
    // Add to ios/App/App/Info.plist before submitting to App Store:
    // <key>NSFaceIDUsageDescription</key>
    // <string>OpenCare uses Face ID to securely verify your identity.</string>
    contentInset: 'always',
    scrollEnabled: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // must be false for Play Store release build
  },
  plugins: {
    NativeBiometric: {
      // @capgo/capacitor-native-biometric — no plugin-level config keys required.
      // iOS: resolved via LocalAuthentication (Face ID / Touch ID).
      // Android: BiometricPrompt activates on API 28+ (Class 3 hardware-backed keystore).
    },
  },
};

export default config;
