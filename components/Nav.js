'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '../lib/useSession';
import ThemeSelector from './ThemeSelector';

const LINKS = [
  { href: '/', label: '🏠 Inicio' },
  { href: '/cronograma', label: '📅 Cronograma' },
  { href: '/formaciones', label: '🎓 Formaciones' },
  { href: '/salas-zoom', label: '🎥 Salas Zoom' },
  { href: '/incidencias', label: '⚠️ Incidencias' },
  { href: '/analisis', label: '📊 Análisis' }
];

function itemNav(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-9 flex items-center px-4 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${
        pathname === href
          ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent'
          : 'bg-surface2 border-border text-textSec hover:text-text hover:border-accentTeal'
      }`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const { usuario, logout } = useSession();
  const pathname = usePathname();

  if (!usuario || pathname === '/login' || pathname === '/setup-password') return null;

  return (
    <div className="max-w-5xl mx-auto px-6 pt-6 no-print">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <p className="text-accentTeal uppercase text-xs tracking-widest font-semibold mb-1">Instituto ILCE</p>
          <h1 className="text-2xl font-bold">Cronograma ILCE</h1>
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelector />
          {usuario && (
            <div className="text-right text-sm ml-2">
              <p className="font-semibold">{usuario.nombre}</p>
              <p className="text-textSec text-xs">{usuario.roles.join(', ')}</p>
              <button onClick={logout} className="text-xs text-textMuted underline mt-1">
                Salir
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="mb-6 flex items-center gap-2 flex-wrap">
        {LINKS.map((l) => itemNav(l.href, l.label, pathname))}
      </nav>
    </div>
  );
}
