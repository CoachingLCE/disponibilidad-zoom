'use client';
import { usePathname } from 'next/navigation';
import { useSession } from '../lib/useSession';

const LINKS = [
  { href: '/', label: '🏠 Inicio' },
  { href: '/cronograma', label: '📅 Cronograma' },
  { href: '/formaciones', label: '🎓 Formaciones' },
  { href: '/salas-zoom', label: '🎥 Salas Zoom' },
  { href: '/incidencias', label: '⚠️ Incidencias' },
  { href: '/analisis', label: '📊 Análisis' }
];

export default function Nav() {
  const { usuario, logout } = useSession();
  const pathname = usePathname();
  if (!usuario || pathname === '/login' || pathname === '/setup-password') return null;

  return (
    <div className="border-b border-border sticky top-0 bg-bg/95 backdrop-blur z-30">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${pathname === l.href ? 'bg-surface2 text-text' : 'text-textSec hover:text-text hover:bg-surface2'}`}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-textMuted hidden sm:inline">{usuario.nombre} · {usuario.roles.join(', ')}</span>
          <button onClick={logout} className="text-xs text-textSec border border-border rounded-lg px-2.5 py-1">Salir</button>
        </div>
      </div>
    </div>
  );
}
