'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, NOMBRES, ICONOS, minutosAHora, formatFechaCorta, agruparParaVista, calcularFormaciones, colorFormacion
} from '../../lib/salasLogic';

const CLAVE_BUSQUEDAS_RECIENTES = 'cronograma-ilce-busquedas-recientes';
const CHIPS = ['Todos', 'Formaciones', 'Clases', 'Salas', 'Actividades'];

function guardarBusquedaReciente(texto) {
  try {
    const previas = JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS_RECIENTES) || '[]');
    const actualizadas = [texto, ...previas.filter((t) => t.toLowerCase() !== texto.toLowerCase())].slice(0, 6);
    localStorage.setItem(CLAVE_BUSQUEDAS_RECIENTES, JSON.stringify(actualizadas));
  } catch { /* ignorar */ }
}
function leerBusquedasRecientes() {
  try { return JSON.parse(localStorage.getItem(CLAVE_BUSQUEDAS_RECIENTES) || '[]'); } catch { return []; }
}

function Resaltado({ texto, q }) {
  if (!texto || !q) return texto || '';
  const idx = String(texto).toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return texto;
  return (
    <>
      {texto.slice(0, idx)}
      <b className="text-accentTeal">{texto.slice(idx, idx + q.length)}</b>
      {texto.slice(idx + q.length)}
    </>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={null}>
      <BuscarContenido />
    </Suspense>
  );
}

function BuscarContenido() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [chipActivo, setChipActivo] = useState('Todos');
  const [clases, setClases] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [busquedasRecientes, setBusquedasRecientes] = useState([]);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);
  useEffect(() => { setBusquedasRecientes(leerBusquedasRecientes()); }, []);

  async function cargar() {
    setCargandoDatos(true);
    try {
      const [rc, ra] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/actividades')]);
      const [dc, da] = await Promise.all([rc.json(), ra.json()]);
      if (rc.ok) setClases(dc.clases);
      if (ra.ok) setActividades(da.actividades);
    } finally { setCargandoDatos(false); }
  }

  const vista = useMemo(() => agruparParaVista(clases), [clases]);
  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  const resultados = useMemo(() => {
    const termino = q.trim().toLowerCase();
    if (!termino) return [];

    const deFormaciones = formaciones.map((f) => {
      const campos = [
        ['Formación', `${f.codigo} ${NOMBRES[f.codigo] || ''}`],
        ['Edición', f.edicion],
        ['Estado', f.estado]
      ];
      const coincidencias = campos.filter(([, v]) => (v || '').toLowerCase().includes(termino)).map(([l]) => l);
      if (coincidencias.length === 0) return null;
      const color = colorFormacion(f.codigo);
      return {
        tipo: 'Formaciones', color,
        label: `${ICONOS[f.codigo] || ''} ${f.codigo} · Edición ${f.edicion}`,
        sub: `${f.estado} · ${f.cargadas ?? '—'}/${f.total ?? '—'} clases`,
        detalle: f.proximaTxt, coincidencias, href: '/formaciones'
      };
    }).filter(Boolean);

    const deClases = vista.map((c) => {
      const campos = [
        ['Formación', `${c.codigo} ${NOMBRES[c.codigo] || ''}`],
        ['Edición', c.edicion],
        ['Número de clase', c.numero],
        ['Docente', c.docente],
        ['Sala', c.sala],
        ['Fecha', c.fecha]
      ];
      const coincidencias = campos.filter(([, v]) => (v || '').toLowerCase().includes(termino)).map(([l]) => l);
      if (coincidencias.length === 0) return null;
      const color = colorFormacion(c.codigo);
      return {
        tipo: 'Clases', color,
        label: `${c.label}${c.edicion ? ' · Ed. ' + c.edicion : ''}`,
        sub: `${c.sala} · ${c.dia} ${minutosAHora(c.horaMin)}`,
        detalle: c.docente || '', coincidencias, href: '/salas-zoom'
      };
    }).filter(Boolean);

    const deSalas = SALAS.map((s) => {
      if (!s.toLowerCase().includes(termino)) return null;
      const clasesEnSala = vista.filter((c) => c.sala === s);
      return {
        tipo: 'Salas', color: null, label: s,
        sub: `${clasesEnSala.length} clase(s) por semana`, detalle: '',
        coincidencias: ['Sala'], href: '/salas-zoom'
      };
    }).filter(Boolean);

    const deActividades = actividades.filter((a) => a.tipo !== 'Formación').map((a) => {
      const campos = [
        ['Tipo', a.tipo], ['Formación/materia', a.nombreCurso], ['Docente', a.docente],
        ['Temática', a.tematica], ['Fecha', a.fecha]
      ];
      const coincidencias = campos.filter(([, v]) => (v || '').toLowerCase().includes(termino)).map(([l]) => l);
      if (coincidencias.length === 0) return null;
      return {
        tipo: 'Actividades', color: a.curso ? colorFormacion(a.curso) : null,
        label: a.nombreCurso || a.tipo,
        sub: `${a.tipo} · ${formatFechaCorta(a.fecha)}`,
        detalle: a.horaMin != null ? minutosAHora(a.horaMin) : '', coincidencias, href: '/cronograma'
      };
    }).filter(Boolean).slice(0, 20);

    return [...deFormaciones, ...deClases, ...deSalas, ...deActividades];
  }, [q, vista, formaciones, actividades]);

  const resultadosFiltrados = chipActivo === 'Todos' ? resultados : resultados.filter((r) => r.tipo === chipActivo);

  function buscar(texto) {
    setQ(texto);
    if (texto.trim().length >= 2) {
      guardarBusquedaReciente(texto.trim());
      setBusquedasRecientes(leerBusquedasRecientes());
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Buscar</h1>
      <p className="text-textSec text-sm mb-4">Formación, edición, número de clase, docente, sala, fecha o estado — por ejemplo "CO 43" o "Sala 2".</p>

      <input
        type="text" value={q} onChange={(e) => buscar(e.target.value)} autoFocus
        placeholder="Buscar…"
        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm mb-3"
      />

      {q.trim().length >= 2 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {CHIPS.map((c) => (
            <button key={c} onClick={() => setChipActivo(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                chipActivo === c ? 'bg-gradient-to-r from-accentPurple to-accentMagenta border-transparent text-white' : 'bg-surface2 border-border text-textSec hover:text-text'
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : q.trim().length < 2 ? (
        busquedasRecientes.length === 0 ? (
          <p className="text-textMuted text-sm">Empezá a escribir para buscar.</p>
        ) : (
          <div>
            <p className="text-xs font-semibold text-textSec mb-2">Últimas búsquedas</p>
            <div className="flex flex-wrap gap-2">
              {busquedasRecientes.map((b) => (
                <button key={b} onClick={() => setQ(b)}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface2 border border-border text-textSec hover:text-text">
                  {b}
                </button>
              ))}
            </div>
          </div>
        )
      ) : resultadosFiltrados.length === 0 ? (
        <p className="text-textSec text-sm">No encontramos resultados para tu búsqueda.</p>
      ) : (
        <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))' }}>
          {resultadosFiltrados.map((r, i) => (
            <div
              key={i}
              onClick={() => router.push(r.href)}
              className={`bg-surface2 border-l-4 ${r.color ? r.color.border : 'border-border'} border-t border-r border-b border-border rounded-xl px-4 py-3 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-accentPurple/40`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-[10px] font-bold text-textMuted uppercase">{r.tipo}</span>
                {r.detalle && <span className="text-xs text-textMuted shrink-0">{r.detalle}</span>}
              </div>
              <p className={`text-sm font-medium truncate ${r.color ? r.color.text : ''}`}><Resaltado texto={r.label} q={q} /></p>
              <p className="text-xs text-textSec mt-0.5"><Resaltado texto={r.sub} q={q} /></p>
              {r.coincidencias?.length > 0 && (
                <p className="text-[10.5px] text-infoText mt-1.5">Encontrado en: {r.coincidencias.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
