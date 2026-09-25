'use client';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/useSession';
import { puedeVerComoOtro, tienePermisoEditarCM, tienePermisoEditarDocentesCO } from '../lib/permisos';

/**
 * "Ver como": un Admin/SuperAdmin puede previsualizar la app tal cual la ve otra persona
 * (por ejemplo un Colaborador o Educativo), sin cerrar su propia sesión — sirve para revisar
 * qué ve y qué puede tocar cada rol antes de darle un permiso o de explicarle algo. Mientras
 * dura la previsualización, cualquier intento de guardar/borrar se corta solo (ver
 * fetchAutenticado en useSession.js) — es solo para mirar, no para actuar en nombre de otro.
 */
export default function VerComo() {
  const { usuarioReal, verComo, setVerComo, fetchAutenticado } = useSession();
  const [abierto, setAbierto] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const cajaRef = useRef(null);

  useEffect(() => {
    function alHacerClicAfuera(e) {
      if (cajaRef.current && !cajaRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener('mousedown', alHacerClicAfuera);
    return () => document.removeEventListener('mousedown', alHacerClicAfuera);
  }, []);

  if (!puedeVerComoOtro(usuarioReal)) return null;

  async function abrir() {
    setAbierto((a) => !a);
    if (personas.length || cargando) return;
    setCargando(true);
    try {
      const res = await fetchAutenticado('/api/usuarios');
      const data = await res.json();
      if (res.ok) {
        setPersonas(
          (data.usuarios || [])
            .filter((u) => u.activo && u.email.toLowerCase() !== usuarioReal.email.toLowerCase())
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
        );
      }
    } catch {
      // silencioso: si falla, el desplegable queda vacío y se puede reintentar abriéndolo de nuevo
    } finally {
      setCargando(false);
    }
  }

  function elegir(persona) {
    // El objeto de sesión real trae, además de email/nombre/roles, un par de permisos
    // puntuales por persona (no por rol) ya calculados al hacer login — para que "Ver como"
    // sea fiel a lo que esa persona realmente ve, se calculan acá con el mismo criterio
    // (lib/permisos.js) en vez de dejarlos sin definir.
    setVerComo({
      ...persona,
      puedeEditarCM: tienePermisoEditarCM(persona),
      puedeEditarDocentesCO: tienePermisoEditarDocentesCO(persona)
    });
    setAbierto(false);
    setBusqueda('');
  }

  if (verComo) {
    return (
      <div className="flex items-center gap-1.5 bg-infoBg border border-infoText/40 rounded-lg pl-2.5 pr-1 h-8 text-xs font-semibold text-infoText whitespace-nowrap">
        👁 {verComo.nombre}
        <button onClick={() => setVerComo(null)} title="Salir del modo vista" className="w-5 h-5 flex items-center justify-center rounded hover:bg-infoText/20">✕</button>
      </div>
    );
  }

  const personasFiltradas = busqueda.trim()
    ? personas.filter((p) => `${p.nombre} ${p.roles.join(' ')}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : personas;

  return (
    <div className="relative" ref={cajaRef}>
      <button
        onClick={abrir}
        className="h-8 flex items-center gap-1 px-3 rounded-lg text-xs font-medium bg-surface2 border border-border text-textSec hover:text-text hover:border-accentTeal whitespace-nowrap"
      >
        👁 Ver como… <span className="text-[9px]">▾</span>
      </button>
      {abierto && (
        <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-surface2 border border-border rounded-lg shadow-lg z-50 py-1">
          <div className="px-2 pb-1.5 sticky top-0 bg-surface2">
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-bg border border-border rounded-md px-2 py-1 text-xs"
            />
          </div>
          {cargando ? (
            <p className="px-3 py-2 text-xs text-textMuted">Cargando…</p>
          ) : personasFiltradas.length === 0 ? (
            <p className="px-3 py-2 text-xs text-textMuted">Sin resultados.</p>
          ) : (
            personasFiltradas.map((p) => (
              <button
                key={p.email}
                onClick={() => elegir(p)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-bg flex flex-col"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-textMuted text-[10.5px]">{p.roles.join(', ')}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
