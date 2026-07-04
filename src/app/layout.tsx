import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { DataStoreProvider } from '../context/DataStoreContext';
import { LegalConsentProvider } from '../context/LegalConsentContext';
import LegalConsentModal from '../components/LegalConsentModal';

export const metadata = {
  title: 'OpenCare Marketplace',
  description: 'An NDIS support worker marketplace MVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <DataStoreProvider>
              <LegalConsentProvider>
                {children}
                {/* Blocking modal — appears for any logged-in user without valid consent */}
                <LegalConsentModal />
              </LegalConsentProvider>
            </DataStoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
