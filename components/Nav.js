'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wrench, Search, Plus, Home, CalendarDays, Megaphone, Mic, GraduationCap, Users, AlertTriangle, BarChart3, Mail, Clock, KeyRound, Video, Info, Layers } from 'lucide-react';
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

// ---- Barra lateral (escritorio) -------------------------------------------------------------
// Pedido de Diego (04/10/2026): navegación "más estética y prolija". En pantallas grandes (>= lg) los
// destinos pasan a una barra lateral fija con grupos; en tablet siguen los botones en fila y en
// celular el menú desplegable.
const ICONOS = {
  '/': Home, '/cronograma': CalendarDays, '/cronograma-cm': Megaphone, '/masterclasses': Mic, '/formaciones': GraduationCap,
  '/docentes-co': Users, '/credenciales-zoom': Video, '/info-tecnica': Info, '/incidencias': AlertTriangle, '/analisis': BarChart3,
  '/emails': Mail, '/auditoria': Clock, '/accesos': KeyRound
};
const GRUPOS_LATERAL = [
  { titulo: null, hrefs: ['/'] },
  { titulo: 'Agenda', hrefs: ['/cronograma', '/cronograma-cm', '/masterclasses', '/formaciones', '/docentes-co'] },
  { titulo: 'Control', hrefs: ['/incidencias', '/analisis', '/emails', '/auditoria'] },
  { titulo: 'Configuración', hrefs: ['/credenciales-zoom', '/info-tecnica', '/accesos'] }
];
function ItemLateral({ href, label, pathname }) {
  const activo = pathname === href;
  const Ico = ICONOS[href] || Layers;
  return (
    <Link href={href} aria-current={activo ? 'page' : undefined}
      className={`relative flex items-center gap-2.5 h-8 px-3 rounded-lg text-[14px] transition-colors ${
        activo ? 'bg-accentPurple/15 text-accentMagenta font-semibold' : 'text-textSec hover:text-text hover:bg-surface2 font-medium'
      }`}>
      {activo && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accentMagenta" />}
      <Ico size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

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

  // Deja lugar a la barra lateral en pantallas grandes (ver .con-menu-lateral en globals.css).
  useEffect(() => {
    document.body.classList.add('con-menu-lateral');
    return () => document.body.classList.remove('con-menu-lateral');
  }, []);

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

  const porHref = Object.fromEntries(links.map((l) => [l.href, l]));

  return (
    <>
    {/* BARRA LATERAL — solo escritorio (>= lg) */}
    <aside aria-label="Navegación principal" className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col border-r border-border bg-surface no-print">
      <div className="px-5 pt-4 pb-2.5">
        <Link href="/" aria-label="Ir al Inicio"><Logo height={30} /></Link>
        <p className="mt-1.5 text-[12px] font-semibold tracking-[0.14em] uppercase text-textMuted">Cronograma</p>
      </div>
      <div className="px-4 pb-3">
        <Link href="/salas-zoom"
          className={`flex items-center justify-center gap-2 h-10 rounded-lg text-[14px] font-semibold text-white bg-gradient-to-r from-accentPurple to-accentMagenta shadow-sm transition-opacity ${pathname === '/salas-zoom' ? 'ring-2 ring-accentTeal ring-offset-2 ring-offset-surface' : 'hover:opacity-90'}`}>
          <Plus size={16} aria-hidden="true" /> Agregar actividad
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {GRUPOS_LATERAL.map((g, i) => {
          const items = g.hrefs.map((h) => porHref[h]).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <div key={g.titulo || i} className="space-y-0.5">
              {g.titulo && <p className="px-3 mb-1 text-[12px] uppercase tracking-[0.12em] font-semibold text-textMuted">{g.titulo}</p>}
              {items.map((l) => <ItemLateral key={l.href} href={l.href} label={l.label} pathname={pathname} />)}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="w-9 h-9 rounded-full bg-accentPurple/15 text-accentMagenta font-bold flex items-center justify-center text-[14px] shrink-0">
            {(usuario.nombre || '?').trim().charAt(0).toUpperCase()}
          </span>
          <p className="text-[13px] font-semibold leading-tight truncate min-w-0 flex-1">{usuario.nombre}</p>
        </div>
        <div className="mt-2 flex gap-4 text-[12px]">
          <button onClick={() => setCambiandoPassword(true)} className="text-textMuted hover:text-text underline">Contraseña</button>
          <button onClick={logout} className="text-textMuted hover:text-text underline">Salir</button>
        </div>
      </div>
    </aside>

    <div className="max-w-[1440px] mx-auto px-6 pt-4 no-print">
      <div className="flex items-center justify-between lg:justify-end mb-3 gap-3 flex-wrap">
        <Link href="/" className="flex items-center gap-2 shrink-0 lg:hidden">
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
            <div className="text-right text-xs leading-tight lg:hidden">
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
        <div className="hidden md:flex lg:hidden items-center gap-1.5 flex-wrap">
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
           Modo vista — estás viendo la app como <b>{verComo.nombre}</b> ({verComo.roles.join(', ')}). No se puede guardar ni borrar nada mientras dure la previsualización.
          <button onClick={() => setVerComo(null)} className="ml-auto underline font-semibold whitespace-nowrap">Salir del modo vista</button>
        </div>
      )}

      <AccionesRapidas />

      {cambiandoPassword && <CambiarPasswordModal onCerrar={() => setCambiandoPassword(false)} />}
      <TourGuiado />
    </div>
    </>
  );
}
