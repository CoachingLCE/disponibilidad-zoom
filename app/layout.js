import { SessionProvider } from '../lib/useSession';
import VersionBadge from '../components/VersionBadge';

export const metadata = {
  title: 'Cronograma ILCE',
  description: 'Gestión de formaciones, actividades y disponibilidad de salas'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#12181f', color: '#e8edf2', fontFamily: '-apple-system, sans-serif' }}>
        <SessionProvider>
          {children}
          <VersionBadge />
        </SessionProvider>
      </body>
    </html>
  );
}
