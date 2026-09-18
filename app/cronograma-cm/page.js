'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { TIPOS_CM, colorCM } from '../../lib/coloresCM';
import { CAMPANAS_DEFAULT, ENLACES_DEFAULT, CATEGORIAS_RECURSOS, normalizarCategoria, labelCategoria } from '../../lib/cmDefaults';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';
const chipToggleCls = (activo) => `text-[11px] font-semibold px-2.5 py-1 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS = Array.from({ length: 11 }, (_, i) => 9 + i); // 9 a 19
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function lunesDeSemana(offset) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const dia = hoy.getDay();
  const diffLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes + offset * 7);
  return lunes;
}

function diaDesdeFecha(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00');
  const idxSemana = (d.getDay() + 6) % 7; // 0=lunes
  return idxSemana < 5 ? DIAS_SEMANA[idxSemana] : (idxSemana === 5 ? 'SABADO' : 'DOMINGO');
}

export default function CronogramaCMPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditarCM = usuario?.puedeEditarCM;

  const [actividades, setActividades] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [errorExtras, setErrorExtras] = useState(null);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [vista, setVista] = useState('semana'); // 'semana' | 'mes'

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(9);
  const [tipo, setTipo] = useState(TIPOS_CM[0].id);
  const [detalle, setDetalle] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);

  const [campanas, setCampanas] = useState([]);
  const [enlaces, setEnlaces] = useState([]);
  const [notas, setNotas] = useState([]);
  const [nuevaCampana, setNuevaCampana] = useState({ titulo: '', fecha: '', descripcion: '' });
  const [nuevoEnlace, setNuevoEnlace] = useState({ categoria: CATEGORIAS_RECURSOS[0].id, titulo: '', url: '', descripcion: '' });
  const [mostrarFormRecurso, setMostrarFormRecurso] = useState(false);
  const [editandoEnlace, setEditandoEnlace] = useState(null);
  const [busquedaRecursos, setBusquedaRecursos] = useState('');
  const [categoriaRecursos, setCategoriaRecursos] = useState('');
  const [clicsRecursos, setClicsRecursos] = useState({});
  const [copiadoId, setCopiadoId] = useState(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [colorNota, setColorNota] = useState('amarillo');
  const [verCampanasPasadas, setVerCampanasPasadas] = useState(false);

  // Cuántas veces se clickeó "Abrir" cada recurso, guardado en este navegador — sirve
  // para armar "Más utilizados" con datos reales de uso (no es un contador compartido
  // entre todo el equipo, solo de quien está mirando esta pantalla).
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('ilce_recursos_clics') || '{}');
      setClicsRecursos(guardado);
    } catch { /* localStorage no disponible — se sigue sin contador */ }
  }, []);
  function registrarClicRecurso(titulo) {
    setClicsRecursos((prev) => {
      const next = { ...prev, [titulo]: (prev[titulo] || 0) + 1 };
      try { localStorage.setItem('ilce_recursos_clics', JSON.stringify(next)); } catch { /* ignorar */ }
      return next;
    });
  }
  async function copiarEnlace(url, id) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId((p) => (p === id ? null : p)), 1500);
    } catch { /* portapapeles no disponible */ }
  }

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) { cargar(); cargarExtras(); } }, [usuario]);

  async function cargarExtras() {
    setErrorExtras(null);
    try {
      const rc = await fetchAutenticado('/api/cronograma-cm/campanas');
      const dc = await rc.json();
      if (rc.ok) setCampanas(dc.campanas); else setErrorExtras((p) => (p ? p + ' | ' : '') + 'Campañas: ' + dc.error);
    } catch (e) {
      setErrorExtras((p) => (p ? p + ' | ' : '') + 'Campañas: error de conexión (' + e.message + ')');
    }

    try {
      const re = await fetchAutenticado('/api/cronograma-cm/enlaces');
      const de = await re.json();
      if (re.ok) setEnlaces(de.enlaces); else setErrorExtras((p) => (p ? p + ' | ' : '') + 'Enlaces: ' + de.error);
    } catch (e) {
      setErrorExtras((p) => (p ? p + ' | ' : '') + 'Enlaces: error de conexión (' + e.message + ')');
    }

    try {
      const rn = await fetchAutenticado('/api/cronograma-cm/notas');
      const dn = await rn.json();
      if (rn.ok) setNotas(dn.notas); else setErrorExtras((p) => (p ? p + ' | ' : '') + 'Notas: ' + dn.error);
    } catch (e) {
      setErrorExtras((p) => (p ? p + ' | ' : '') + 'Notas: error de conexión (' + e.message + ')');
    }
  }

  // Las campañas y enlaces que Diego pasó están siempre disponibles acá en el código —
  // ya no dependen de que se hayan importado bien al Sheet. Lo que se agregue desde la
  // app (formulario de abajo) se suma sin duplicar lo fijo.
  const campanasCombinadas = useMemo(() => {
    const hoyISO = new Date().toISOString().slice(0, 10);
    const titulosSheet = new Set(campanas.map((c) => c.titulo));
    const fijas = CAMPANAS_DEFAULT.filter((c) => !titulosSheet.has(c.titulo)).map((c, i) => ({ ...c, id: `fijo-camp-${i}`, esFijo: true }));
    return [...fijas, ...campanas].map((c) => ({ ...c, pasada: !!c.fecha && c.fecha < hoyISO }));
  }, [campanas]);
  const campanasVisibles = useMemo(
    () => verCampanasPasadas ? campanasCombinadas : campanasCombinadas.filter((c) => !c.pasada),
    [campanasCombinadas, verCampanasPasadas]
  );
  const cantidadPasadas = campanasCombinadas.filter((c) => c.pasada).length;
  const enlacesCombinados = useMemo(() => {
    const titulosSheet = new Set(enlaces.map((e) => e.titulo));
    const fijos = ENLACES_DEFAULT.filter((e) => !titulosSheet.has(e.titulo)).map((e, i) => ({ ...e, id: `fijo-link-${i}`, esFijo: true }));
    return [...fijos, ...enlaces].map((e) => ({ ...e, categoriaId: normalizarCategoria(e.categoria) }));
  }, [enlaces]);
  const enlacesFiltrados = useMemo(() => {
    const q = busquedaRecursos.trim().toLowerCase();
    return enlacesCombinados.filter((e) => {
      if (categoriaRecursos && e.categoriaId !== categoriaRecursos) return false;
      if (!q) return true;
      return e.titulo.toLowerCase().includes(q) || labelCategoria(e.categoriaId).toLowerCase().includes(q);
    });
  }, [enlacesCombinados, busquedaRecursos, categoriaRecursos]);
  // "Más utilizados": primero los que ya tienen clics reales registrados en este navegador
  // (ordenados por cantidad), y si todavía no hay ninguno, arrancan los marcados como
  // destacados a mano — así la sección nunca aparece vacía el primer día.
  const masUtilizados = useMemo(() => {
    const conClics = enlacesCombinados.filter((e) => clicsRecursos[e.titulo] > 0)
      .sort((a, b) => (clicsRecursos[b.titulo] || 0) - (clicsRecursos[a.titulo] || 0));
    if (conClics.length >= 4) return conClics.slice(0, 6);
    const destacados = enlacesCombinados.filter((e) => e.destacado && !conClics.includes(e));
    return [...conClics, ...destacados].slice(0, 6);
  }, [enlacesCombinados, clicsRecursos]);

  async function agregarCampana() {
    if (!nuevaCampana.titulo.trim()) return;
    const res = await fetchAutenticado('/api/cronograma-cm/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaCampana)
    });
    if (res.ok) { setNuevaCampana({ titulo: '', fecha: '', descripcion: '' }); cargarExtras(); }
  }
  async function eliminarCampana(id) {
    const res = await fetchAutenticado(`/api/cronograma-cm/campanas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) cargarExtras();
  }
  async function agregarEnlace() {
    if (!nuevoEnlace.titulo.trim()) return;
    const res = await fetchAutenticado('/api/cronograma-cm/enlaces', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoEnlace)
    });
    if (res.ok) {
      setNuevoEnlace({ categoria: CATEGORIAS_RECURSOS[0].id, titulo: '', url: '', descripcion: '' });
      setMostrarFormRecurso(false);
      cargarExtras();
    }
  }
  async function guardarEdicionEnlace() {
    if (!editandoEnlace || !editandoEnlace.titulo.trim()) return;
    const res = await fetchAutenticado(`/api/cronograma-cm/enlaces/${encodeURIComponent(editandoEnlace.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria: editandoEnlace.categoria, titulo: editandoEnlace.titulo,
        url: editandoEnlace.url, descripcion: editandoEnlace.descripcion
      })
    });
    if (res.ok) { setEditandoEnlace(null); cargarExtras(); }
  }
  async function eliminarEnlace(id) {
    const res = await fetchAutenticado(`/api/cronograma-cm/enlaces/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) cargarExtras();
  }
  async function agregarNota() {
    if (!nuevaNota.trim()) return;
    const res = await fetchAutenticado('/api/cronograma-cm/notas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: nuevaNota, color: colorNota })
    });
    if (res.ok) { setNuevaNota(''); cargarExtras(); }
  }
  async function eliminarNota(id) {
    const res = await fetchAutenticado(`/api/cronograma-cm/notas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) cargarExtras();
  }

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const res = await fetchAutenticado('/api/cronograma-cm');
      const data = await res.json();
      if (res.ok) setActividades(data.actividades); else setError(data.error);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  async function agregar() {
    setMsg(null);
    if (!fecha) { setMsg({ tipo: 'error', texto: 'Elegí la fecha.' }); return; }
    setGuardando(true);
    try {
      const dia = diaDesdeFecha(fecha);
      const res = await fetchAutenticado('/api/cronograma-cm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, dia, horaMin: hora * 60, tipo, detalle })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Agregado.' });
      setDetalle('');
      cargar();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setGuardando(false);
    }
  }

  const lunes = lunesDeSemana(semanaOffset);
  const fechasSemana = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return toISO(d);
  });
  const mesLabel = useMemo(() => {
    const meses = new Set(fechasSemana.map((f) => new Date(f + 'T00:00:00').getMonth()));
    const anio = new Date(fechasSemana[0] + 'T00:00:00').getFullYear();
    return [...meses].map((m) => MESES[m]).join(' / ') + ' ' + anio;
  }, [fechasSemana]);

  const porCelda = useMemo(() => {
    const mapa = {};
    actividades.filter((a) => fechasSemana.includes(a.fecha)).forEach((a) => {
      const h = a.horaMin != null ? Math.floor(a.horaMin / 60) : null;
      const key = `${a.fecha}|${h}`;
      (mapa[key] = mapa[key] || []).push(a);
    });
    return mapa;
  }, [actividades, fechasSemana]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Cronograma CM</h1>
      <p className="text-textSec text-sm mb-4">
        Cronograma de redes y comunidad, semana a semana.
        {!puedeEditarCM && ' Solo podés ver — la edición está reservada.'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}
      {errorExtras && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{errorExtras}</div>}

      {puedeEditarCM && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Agregar actividad</h2>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Hora</label>
              <select value={hora} onChange={(e) => setHora(parseInt(e.target.value, 10))} className={inputCls}>
                {HORAS.map((h) => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                {TIPOS_CM.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Detalle (opcional)</label><input value={detalle} onChange={(e) => setDetalle(e.target.value)} className={inputCls} /></div>
          </div>
          <button className={btnCls} disabled={guardando} onClick={agregar}>{guardando ? 'Guardando…' : 'Agregar'}</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
        </div>
      )}

      <div className={boxCls}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-textMuted font-semibold">Vista:</span>
          <button className={chipToggleCls(vista === 'semana')} onClick={() => setVista('semana')}>Semana</button>
          <button className={chipToggleCls(vista === 'mes')} onClick={() => setVista('mes')}>Mes</button>
        </div>

        {vista === 'semana' ? (
          <>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <button className={btnSecCls} onClick={() => setSemanaOffset((s) => s - 1)}>← Semana anterior</button>
              <div className="text-center">
                <p className="text-sm font-semibold">{mesLabel}</p>
                <button className={btnSecCls} onClick={() => setSemanaOffset(0)}>Hoy</button>
              </div>
              <button className={btnSecCls} onClick={() => setSemanaOffset((s) => s + 1)}>Semana siguiente →</button>
            </div>

            {cargandoDatos ? (
              <p className="text-textSec text-sm">Cargando…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[11px] text-textSec uppercase px-1.5 py-2 border-b border-border text-center">Horario</th>
                      {fechasSemana.map((f, i) => (
                        <th key={f} className="text-[11px] uppercase px-1.5 py-2 border-b border-border text-center">
                          {DIAS_LABEL[i]} {new Date(f + 'T00:00:00').getDate()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HORAS.map((h) => (
                      <tr key={h}>
                        <td className="border border-border align-top p-1 font-mono text-textSec text-xs text-center">{h}</td>
                        {fechasSemana.map((f) => {
                          const items = porCelda[`${f}|${h}`] || [];
                          return (
                            <td key={f} className="border border-border align-top p-1 min-w-[130px]">
                              {items.map((a) => {
                                const color = colorCM(a.tipo);
                                return (
                                  <div
                                    key={a.id}
                                    onClick={() => puedeEditarCM && setSeleccionada(a)}
                                    className={`rounded-md px-2 py-1 text-[11px] font-semibold mb-1 border-l-2 ${color.bg} ${color.text} ${color.border} ${puedeEditarCM ? 'cursor-pointer' : ''}`}
                                  >
                                    {a.tipo}
                                    {a.detalle && <span className="block font-normal text-[10px] opacity-80">{a.detalle}</span>}
                                  </div>
                                );
                              })}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : cargandoDatos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : (
          <VistaMesCM actividades={actividades} onClick={(a) => puedeEditarCM && setSeleccionada(a)} puedeEditarCM={puedeEditarCM} />
        )}
      </div>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Referencia de tipos</h2>
        <div className="flex flex-wrap gap-2">
          {TIPOS_CM.map((t) => (
            <span key={t.id} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${t.bg} ${t.text} ${t.border}`}>
              {t.id}
            </span>
          ))}
        </div>
      </div>

      <div className={boxCls}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold">📅 Campañas 2026</h2>
          <div className="flex gap-1.5">
            <button className={chipToggleCls(!verCampanasPasadas)} onClick={() => setVerCampanasPasadas(false)}>Vigentes</button>
            <button className={chipToggleCls(verCampanasPasadas)} onClick={() => setVerCampanasPasadas(true)}>Todas{cantidadPasadas > 0 ? ` (+${cantidadPasadas} pasadas)` : ''}</button>
          </div>
        </div>
        {campanasVisibles.length === 0 ? <p className="text-textSec text-sm mb-3">{verCampanasPasadas ? 'Sin campañas cargadas.' : 'No hay campañas vigentes — mirá "Todas" para ver las que ya pasaron.'}</p> : (
          <div className="flex flex-col gap-2 mb-3">
            {campanasVisibles.map((c) => (
              <div key={c.id} className={`bg-bg border border-border rounded-lg px-3 py-2 flex items-start justify-between gap-3 ${c.pasada ? 'opacity-60' : ''}`}>
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                    {c.titulo}
                    {c.fecha && <span className="text-textMuted font-normal"> — {c.fecha.split('-').reverse().slice(0, 2).join('/')}</span>}
                    {c.pasada && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface2 text-textMuted border border-border">Ya pasó</span>}
                  </p>
                  {c.descripcion && <p className="text-xs text-textSec mt-0.5">{c.descripcion}</p>}
                </div>
                {puedeEditarCM && !c.esFijo && <button className={btnSecCls} onClick={() => eliminarCampana(c.id)}>Eliminar</button>}
              </div>
            ))}
          </div>
        )}
        {puedeEditarCM && (
          <div className="border-t border-border pt-3">
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
              <input placeholder="Título" value={nuevaCampana.titulo} onChange={(e) => setNuevaCampana((p) => ({ ...p, titulo: e.target.value }))} className={inputCls} />
              <input type="date" value={nuevaCampana.fecha} onChange={(e) => setNuevaCampana((p) => ({ ...p, fecha: e.target.value }))} className={inputCls} />
              <input placeholder="Descripción (opcional)" value={nuevaCampana.descripcion} onChange={(e) => setNuevaCampana((p) => ({ ...p, descripcion: e.target.value }))} className={inputCls} />
            </div>
            <button className={btnSecCls} onClick={agregarCampana}>+ Agregar campaña</button>
          </div>
        )}
      </div>

      <div className={boxCls}>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
          <div>
            <h2 className="text-base font-semibold">Centro de recursos</h2>
            <p className="text-xs text-textSec mt-0.5">Encontrá, compartí y gestioná los recursos de ILCE.</p>
          </div>
          {puedeEditarCM && (
            <button className={btnCls} onClick={() => setMostrarFormRecurso((v) => !v)}>+ Agregar recurso</button>
          )}
        </div>

        <div className="relative my-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted text-sm">🔎</span>
          <input
            placeholder="Buscar recurso..."
            value={busquedaRecursos}
            onChange={(e) => setBusquedaRecursos(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <button className={chipToggleCls(categoriaRecursos === '')} onClick={() => setCategoriaRecursos('')}>Todas</button>
          {CATEGORIAS_RECURSOS.map((c) => (
            <button key={c.id} className={chipToggleCls(categoriaRecursos === c.id)} onClick={() => setCategoriaRecursos(c.id)}>{c.label}</button>
          ))}
        </div>

        {puedeEditarCM && mostrarFormRecurso && (
          <div className="bg-bg border border-border rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold mb-2">Nuevo recurso</p>
            <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
              <select value={nuevoEnlace.categoria} onChange={(e) => setNuevoEnlace((p) => ({ ...p, categoria: e.target.value }))} className={inputCls}>
                {CATEGORIAS_RECURSOS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input placeholder="Título" value={nuevoEnlace.titulo} onChange={(e) => setNuevoEnlace((p) => ({ ...p, titulo: e.target.value }))} className={inputCls} />
              <input placeholder="URL" value={nuevoEnlace.url} onChange={(e) => setNuevoEnlace((p) => ({ ...p, url: e.target.value }))} className={inputCls} />
            </div>
            <input placeholder="Descripción (opcional)" value={nuevoEnlace.descripcion} onChange={(e) => setNuevoEnlace((p) => ({ ...p, descripcion: e.target.value }))} className={`${inputCls} mb-2`} />
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setMostrarFormRecurso(false)}>Cancelar</button>
              <button className={btnCls} onClick={agregarEnlace}>Guardar recurso</button>
            </div>
          </div>
        )}

        {!busquedaRecursos && masUtilizados.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-textSec mb-2">⭐ Más utilizados</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))' }}>
              {masUtilizados.map((e) => (
                <TarjetaRecurso
                  key={'destacado-' + e.id} e={e} puedeEditarCM={puedeEditarCM} copiadoId={copiadoId}
                  onAbrir={() => registrarClicRecurso(e.titulo)} onCopiar={() => copiarEnlace(e.url, 'destacado-' + e.id)}
                  onEditar={() => setEditandoEnlace(e)} onEliminar={() => eliminarEnlace(e.id)}
                />
              ))}
            </div>
          </div>
        )}

        {enlacesFiltrados.length === 0 ? (
          <p className="text-textSec text-sm">Ningún recurso coincide con la búsqueda.</p>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))' }}>
            {enlacesFiltrados.map((e) => (
              <TarjetaRecurso
                key={e.id} e={e} puedeEditarCM={puedeEditarCM} copiadoId={copiadoId}
                onAbrir={() => registrarClicRecurso(e.titulo)} onCopiar={() => copiarEnlace(e.url, e.id)}
                onEditar={() => setEditandoEnlace(e)} onEliminar={() => eliminarEnlace(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      {editandoEnlace && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditandoEnlace(null)}>
          <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-3">Editar recurso</h3>
            <div className="flex flex-col gap-2.5 mb-3">
              <div>
                <label className={labelCls}>Categoría</label>
                <select value={editandoEnlace.categoria} onChange={(e) => setEditandoEnlace((p) => ({ ...p, categoria: e.target.value }))} className={inputCls}>
                  {CATEGORIAS_RECURSOS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Título</label><input value={editandoEnlace.titulo} onChange={(e) => setEditandoEnlace((p) => ({ ...p, titulo: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>URL</label><input value={editandoEnlace.url} onChange={(e) => setEditandoEnlace((p) => ({ ...p, url: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>Descripción (opcional)</label><input value={editandoEnlace.descripcion || ''} onChange={(e) => setEditandoEnlace((p) => ({ ...p, descripcion: e.target.value }))} className={inputCls} /></div>
            </div>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setEditandoEnlace(null)}>Cancelar</button>
              <button className={btnCls} onClick={guardarEdicionEnlace}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">📝 Notas</h2>
        <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))' }}>
          {notas.map((n) => {
            const coloresNota = {
              amarillo: 'bg-yellow-300/15 border-yellow-300/40 text-yellow-100',
              rosa: 'bg-pink-300/15 border-pink-300/40 text-pink-100',
              celeste: 'bg-cyan-300/15 border-cyan-300/40 text-cyan-100',
              verde: 'bg-lime-300/15 border-lime-300/40 text-lime-100'
            };
            return (
              <div key={n.id} className={`border rounded-lg p-3 ${coloresNota[n.color] || coloresNota.amarillo}`}>
                <p className="text-sm whitespace-pre-wrap">{n.texto}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] opacity-70">{n.autor}</span>
                  {puedeEditarCM && <button className="text-[10px] opacity-70" onClick={() => eliminarNota(n.id)}>Eliminar</button>}
                </div>
              </div>
            );
          })}
        </div>
        {puedeEditarCM && (
          <div className="border-t border-border pt-3">
            <textarea rows={2} placeholder="Escribí una nota…" value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} className={`${inputCls} mb-2`} />
            <div className="flex items-center gap-2">
              <select value={colorNota} onChange={(e) => setColorNota(e.target.value)} className={`${inputCls} w-auto`}>
                <option value="amarillo">Amarillo</option>
                <option value="rosa">Rosa</option>
                <option value="celeste">Celeste</option>
                <option value="verde">Verde</option>
              </select>
              <button className={btnSecCls} onClick={agregarNota}>+ Agregar nota</button>
            </div>
          </div>
        )}
      </div>

      {seleccionada && (
        <ModalEditarCM
          actividad={seleccionada}
          onCerrar={() => setSeleccionada(null)}
          fetchAutenticado={fetchAutenticado}
          onCambio={cargar}
        />
      )}
    </div>
  );
}

function VistaMesCM({ actividades, onClick, puedeEditarCM }) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());

  const primerDiaMes = new Date(anio, mes, 1);
  const ultimoDiaMes = new Date(anio, mes + 1, 0);

  function irAMes(deltaMeses) {
    const destino = new Date(anio, mes + deltaMeses, 1);
    setAnio(destino.getFullYear());
    setMes(destino.getMonth());
  }

  // Arranca en el lunes de la semana que contiene el día 1, termina en el domingo de la
  // semana que contiene el último día — igual que la vista de mes de Cronograma.
  const diaSemanaPrimero = primerDiaMes.getDay();
  const offsetInicio = diaSemanaPrimero === 0 ? -6 : 1 - diaSemanaPrimero;
  const inicio = new Date(primerDiaMes); inicio.setDate(primerDiaMes.getDate() + offsetInicio);

  const dias = [];
  let cursor = new Date(inicio);
  while (cursor <= ultimoDiaMes || cursor.getDay() !== 1) {
    dias.push(toISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (dias.length > 42) break; // salvavidas, nunca debería hacer falta
  }

  const hoyISO = toISO(new Date());
  const porDia = {};
  actividades.forEach((a) => { if (a.fecha) (porDia[a.fecha] = porDia[a.fecha] || []).push(a); });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button className={btnSecCls} onClick={() => irAMes(-1)}>← Mes anterior</button>
        <span className="text-sm font-semibold">{MESES[mes]} {anio}</span>
        <button className={btnSecCls} onClick={() => irAMes(1)}>Mes siguiente →</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-[10.5px] text-textMuted text-center font-semibold pb-1">{d}</div>
        ))}
        {dias.map((f) => {
          const esDelMes = new Date(f + 'T00:00:00').getMonth() === mes;
          const items = (porDia[f] || []).sort((a, b) => (a.horaMin || 0) - (b.horaMin || 0));
          return (
            <div key={f} className={`border border-border rounded-lg p-1.5 min-h-[70px] ${esDelMes ? '' : 'opacity-30'} ${f === hoyISO ? 'ring-1 ring-accentTeal' : ''}`}>
              <p className="text-[10.5px] text-textMuted mb-1">{new Date(f + 'T00:00:00').getDate()}</p>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((a) => {
                  const color = colorCM(a.tipo);
                  return (
                    <div
                      key={a.id}
                      onClick={() => onClick(a)}
                      className={`text-[9.5px] px-1 py-0.5 rounded truncate ${color.bg} ${color.text} ${puedeEditarCM ? 'cursor-pointer' : ''}`}
                      title={a.detalle ? `${a.tipo} — ${a.detalle}` : a.tipo}
                    >
                      {a.tipo}
                    </div>
                  );
                })}
                {items.length > 3 && <p className="text-[9.5px] text-textMuted">+{items.length - 3} más</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TarjetaRecurso({ e, puedeEditarCM, copiadoId, onAbrir, onCopiar, onEditar, onEliminar }) {
  const copiado = copiadoId != null;
  return (
    <div className="group relative bg-bg border border-border rounded-xl p-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-textMuted">{labelCategoria(e.categoriaId)}</span>
      <p className="text-sm font-semibold truncate" title={e.titulo}>{e.titulo}</p>
      {e.descripcion && <p className="text-[11px] text-textSec line-clamp-2">{e.descripcion}</p>}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        {e.url ? (
          <a href={e.url} target="_blank" rel="noopener noreferrer" onClick={onAbrir} className="text-infoText text-xs font-semibold hover:underline">
            Abrir →
          </a>
        ) : <span className="text-textMuted text-xs">Sin URL</span>}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {puedeEditarCM && !e.esFijo && (
            <button title="Editar" className="text-textMuted hover:text-text text-xs" onClick={onEditar}>✎</button>
          )}
          {e.url && (
            <button title="Copiar enlace" className="text-textMuted hover:text-text text-xs" onClick={onCopiar}>
              {copiado ? '✓' : '⧉'}
            </button>
          )}
          {puedeEditarCM && !e.esFijo && (
            <button title="Eliminar" className="text-textMuted hover:text-dangerText text-xs" onClick={onEliminar}>✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalEditarCM({ actividad, onCerrar, fetchAutenticado, onCambio }) {
  const [fecha, setFecha] = useState(actividad.fecha);
  const [hora, setHora] = useState(actividad.horaMin != null ? Math.floor(actividad.horaMin / 60) : 9);
  const [tipo, setTipo] = useState(actividad.tipo);
  const [detalle, setDetalle] = useState(actividad.detalle || '');
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [err, setErr] = useState('');

  async function guardar() {
    setErr('');
    if (!fecha) { setErr('Elegí la fecha.'); return; }
    setGuardando(true);
    try {
      const res = await fetchAutenticado(`/api/cronograma-cm/${encodeURIComponent(actividad.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, dia: diaDesdeFecha(fecha), horaMin: hora * 60, tipo, detalle })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (e) {
      setErr('Error de conexión: ' + (e.message || 'no se pudo contactar al servidor.'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    setErr('');
    setEliminando(true);
    try {
      const res = await fetchAutenticado(`/api/cronograma-cm/${encodeURIComponent(actividad.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (e) {
      setErr('Error de conexión: ' + (e.message || 'no se pudo contactar al servidor.'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Editar actividad</h3>
        {err && <p className="text-dangerText text-xs mb-3">{err}</p>}

        {!confirmarEliminar ? (
          <>
            <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
              <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Hora</label>
                <select value={hora} onChange={(e) => setHora(parseInt(e.target.value, 10))} className={inputCls}>
                  {HORAS.map((h) => <option key={h} value={h}>{h}:00</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                  {TIPOS_CM.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Detalle (opcional)</label><input value={detalle} onChange={(e) => setDetalle(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
              <button className={`${btnSecCls} text-dangerText`} onClick={() => setConfirmarEliminar(true)}>Eliminar</button>
              <button className={btnCls} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm mb-3">¿Seguro que querés eliminar esta actividad? No se puede deshacer.</p>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setConfirmarEliminar(false)}>Volver</button>
              <button className="bg-dangerText text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={eliminando} onClick={eliminar}>
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
