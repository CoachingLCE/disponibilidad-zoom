import './globals.css';
import { SessionProvider } from '../lib/useSession';
import VersionBadge from '../components/VersionBadge';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Cronograma ILCE',
  description: 'Gestión de formaciones, actividades y disponibilidad de salas'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" data-theme="dark">
      <body className="min-h-screen bg-bg text-text">
        <SessionProvider>
          <Nav />
          {children}
          <VersionBadge />
        </SessionProvider>
      </body>
    </html>
  );
}
