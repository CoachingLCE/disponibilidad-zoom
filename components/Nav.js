'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Search } from 'lucide-react';
import { useSession } from '../lib/useSession';
import ThemeSelector from './ThemeSelector';
import AccionesRapidas from './AccionesRapidas';
import CambiarPasswordModal from './CambiarPasswordModal';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cronograma', label: 'Cronograma' },
  { href: '/cronograma-cm', label: 'Cronograma CM' },
  { href: '/formaciones', label: 'Formaciones' },
  { href: '/docentes-co', label: 'Docentes C.O' },
  { href: '/salas-zoom', label: 'Salas Zoom' },
  { href: '/info-tecnica', label: 'Info. técnica' },
  { href: '/incidencias', label: 'Incidencias' },
  { href: '/analisis', label: 'Análisis' },
  { href: '/accesos', label: 'Accesos', soloAdmin: true }
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
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  if (!usuario || pathname === '/login' || pathname === '/setup-password') return null;

  const puedeVerAccesos = (usuario.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));
  const links = LINKS.filter((l) => !l.soloAdmin || puedeVerAccesos);

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-4 no-print">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <Link href="/" className="text-sm font-bold shrink-0">Cronograma ILCE</Link>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSelector />
          <Link href="/buscar" title="Buscar"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              pathname === '/buscar'
                ? 'bg-accentPurple text-white'
                : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
            }`}>
            <Search size={15} />
          </Link>
          <Link href="/herramientas" title="Herramientas"
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              pathname === '/herramientas'
                ? 'bg-accentPurple text-white'
                : 'bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal'
            }`}>
            <Wrench size={15} />
          </Link>
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
        {links.map((l) => itemNav(l.href, l.label, pathname))}
      </nav>

      <AccionesRapidas />

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
    </div>
  );
}
