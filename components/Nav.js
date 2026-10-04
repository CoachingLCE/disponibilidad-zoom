'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Search } from 'lucide-react';
import { useSession } from '../lib/useSession';
import ThemeSelector from './ThemeSelector';
import AccionesRapidas from './AccionesRapidas';
import CambiarPasswordModal from './CambiarPasswordModal';
import Logo from './Logo';
import TourGuiado from './TourGuiado';
import VerComo from './VerComo';

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/cronograma', label: 'Cronograma' },
  { href: '/cronograma-cm', label: 'Cronograma CM' },
  { href: '/formaciones', label: 'Formaciones' },
  { href: '/masterclasses', label: 'Masterclasses' },
  { href: '/docentes-co', label: 'Docentes C.O' },
  { href: '/salas-zoom', label: 'Agregar actividad' },
  { href: '/credenciales-zoom', label: 'Credenciales Zoom' },
  { href: '/info-tecnica', label: 'Info. técnica' },
  { href: '/incidencias', label: 'Alertas y feriados' },
  { href: '/analisis', label: 'Análisis' },
  { href: '/emails', label: 'Emails' },
  { href: '/auditoria', label: 'Historial de acciones' },
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
  const { usuario, verComo, setVerComo, logout } = useSession();
  const pathname = usePathname();
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // En celular el menú se cierra solo al cambiar de pantalla y con Esc.
  useEffect(() => { setMenuAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarConEsc = (ev) => { if (ev.key === 'Escape') setMenuAbierto(false); };
    document.addEventListener('keydown', cerrarConEsc);
    return () => document.removeEventListener('keydown', cerrarConEsc);
  }, [menuAbierto]);

  if (!usuario || pathname === '/login' || pathname === '/setup-password') return null;

  const puedeVerAccesos = (usuario.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));
  const links = LINKS.filter((l) => !l.soloAdmin || puedeVerAccesos);

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-4 no-print">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo height={28} />
          <span className="text-sm font-bold text-textMuted">Cronograma</span>
        </Link>

        <div className="flex items-center gap-2 flex-wrap justify-end min-w-0">
          <VerComo />
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

      <nav className="mb-5" aria-label="Principal">
        {/* Pantallas medianas y grandes: todos los botones en una fila */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap">
          {links.map((l) => itemNav(l.href, l.label, pathname))}
        </div>

        {/* Celular: un solo botón con la pantalla actual que despliega la lista (antes eran 14
            botones apilados y toda la barra se salía de la pantalla) */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            className="w-full h-11 flex items-center justify-between px-4 rounded-xl bg-surface2 border border-border text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              {(links.find((l) => l.href === pathname) || links[0]).label}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${menuAbierto ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          {menuAbierto && (
            <div className="mt-2 grid gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`h-11 flex items-center px-3.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === l.href
                      ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white'
                      : 'text-textSec hover:bg-surface2 hover:text-text'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      {verComo && (
        <div className="flex items-center gap-2 flex-wrap bg-infoBg border border-infoText/40 text-infoText rounded-lg px-3.5 py-2 text-xs mb-4">
          👁 Modo vista — estás viendo la app como <b>{verComo.nombre}</b> ({verComo.roles.join(', ')}). No se puede guardar ni borrar nada mientras dure la previsualización.
          <button onClick={() => setVerComo(null)} className="ml-auto underline font-semibold whitespace-nowrap">Salir del modo vista</button>
        </div>
      )}

      <AccionesRapidas />

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
      <TourGuiado />
    </div>
  );
}
