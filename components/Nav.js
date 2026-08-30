'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '../lib/useSession';
import ThemeSelector from './ThemeSelector';
import AccionesRapidas from './AccionesRapidas';
import CambiarPasswordModal from './CambiarPasswordModal';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cronograma', label: 'Cronograma' },
  { href: '/cronograma-cm', label: 'Cronograma CM' },
  { href: '/formaciones', label: 'Formaciones' },
  { href: '/salas-zoom', label: 'Salas Zoom' },
  { href: '/incidencias', label: 'Incidencias' },
  { href: '/analisis', label: 'Análisis' }
];

function itemNav(href, label, pathname) {
  return (
    <Link
      key={href}
      href={href}
      className={`h-8 flex items-center px-3.5 rounded-lg text-[13px] font-medium border whitespace-nowrap transition-colors ${
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
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  if (!usuario || pathname === '/login' || pathname === '/setup-password') return null;

  function buscar(e) {
    e.preventDefault();
    if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-4 no-print">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <Link href="/" className="text-sm font-bold shrink-0">Cronograma ILCE</Link>

        <form onSubmit={buscar} className="flex-1 min-w-[140px] max-w-xs">
          <input
            type="text" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-surface2 border border-border rounded-lg h-8 px-3 text-xs"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSelector />
          {usuario && (
            <div className="text-right text-xs leading-tight">
              <p className="font-semibold">{usuario.nombre}</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCambiandoPassword(true)} className="text-textMuted underline">Contraseña</button>
                <button onClick={logout} className="text-textMuted underline">Salir</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="mb-5 flex items-center gap-1.5 flex-wrap">
        {LINKS.map((l) => itemNav(l.href, l.label, pathname))}
      </nav>

      <AccionesRapidas />

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
    </div>
  );
}
