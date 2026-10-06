import './globals.css';
import { SessionProvider } from '../lib/useSession';
import { ThemeProvider } from '../lib/ThemeContext';
import VersionBadge from '../components/VersionBadge';
import Nav from '../components/Nav';
import EscCierraModales from '../components/EscCierraModales';
import { DialogosProvider } from '../components/Dialogos';
import TablasEnTarjetas from '../components/TablasEnTarjetas';

export const metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png?v=2'
  },
  title: 'Cronograma ILCE',
  description: 'Gestión de formaciones, actividades y disponibilidad de salas'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-bg text-text">
        <ThemeProvider>
          <SessionProvider>
            <DialogosProvider>
              <EscCierraModales />
              <TablasEnTarjetas />
              <Nav />
              {children}
              <VersionBadge />
            </DialogosProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
