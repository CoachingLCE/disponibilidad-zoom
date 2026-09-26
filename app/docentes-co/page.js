'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta, SALAS, buscarPeriodoCO, colorPorSala } from '../../lib/salasLogic';
import { DOCENTES_CO_DEFAULT } from '../../lib/docentesCODefaults';

const CUATRIMESTRES_CO = [
  { id: '1', label: '1er cuatrimestre (clases 1-16)' },
  { id: '2', label: '2do cuatrimestre (clases 17-32)' },
  { id: '3', label: '3er cuatrimestre (clases 33-48)' }
];

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';
const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const CLAVE_FILTRO_GUARDADO = 'docentes-co-filtro-preferido';

function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Activa: hoy cae dentro de Desde-Hasta (o no tiene Hasta todavía). Futura: arranca después de hoy. Finalizada: ya terminó. */
function estadoDe(periodo, hoyISO) {
  if (!periodo) return 'finalizada';
  if (periodo.desde && periodo.desde > hoyISO) return 'futura';
  if (!periodo.hasta || periodo.hasta >= hoyISO) return 'activa';
  return 'finalizada';
}

/** Para el brillo de fila del Historial completo: "activo" = todavía no finalizó (sin
    Hasta, o Hasta en el futuro/hoy); "viejo" = finalizó hace más de 1 año; "reciente" =
    finalizó hace entre 1 día y 1 año. */
function bandaFinalizacion(hastaISO) {
  if (!hastaISO) return 'activo';
  const dias = (new Date() - new Date(hastaISO + 'T00:00:00')) / (1000 * 60 * 60 * 24);
  if (dias < 1) return 'activo';
  if (dias > 365) return 'viejo';
  return 'reciente';
}

export default function DocentesCOPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = usuario?.puedeEditarDocentesCO;

  const [asignaciones, setAsignaciones] = useState([]);
  const [clases, setClases] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('activa');

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  // El filtro elegido queda guardado en este navegador — la próxima vez que entrás,
  // arranca donde lo dejaste (por defecto, "Activas", que es lo más usado día a día).
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_FILTRO_GUARDADO);
      if (guardado) setFiltroEstado(guardado);
    } catch { /* ignorar */ }
  }, []);
  function cambiarFiltro(valor) {
    setFiltroEstado(valor);
    try { localStorage.setItem(CLAVE_FILTRO_GUARDADO, valor); } catch { /* ignorar */ }
  }

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const [res, resClases] = await Promise.all([fetchAutenticado('/api/docentes-co'), fetchAutenticado('/api/clases')]);
      const data = await res.json();
      if (res.ok) setAsignaciones(data.asignaciones); else setError(data.error);
      try { const dc = await resClases.json(); if (resClases.ok) setClases(dc.clases || []); } catch { /* no bloquea el resto */ }
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  // La Sala de cada edición de C.O. se carga en Salas Zoom (pestaña Clases), no en Docentes
  // C.O. — ese campo "Sala" del período casi nunca se completa a mano. Se toma de cualquier
  // clase real ya agendada de esa edición que sí tenga sala (la más reciente si hay varias),
  // para no mostrar "Sin definir" cuando la sala en realidad ya está cargada en otro lado.
  const salaPorEdicionCO = useMemo(() => {
    const porEdicion = {};
    clases.filter((c) => c.codigo === 'CO' && c.numero && c.sala).forEach((c) => {
      const actual = porEdicion[c.numero];
      if (!actual || (c.fecha || '') > (actual.fecha || '')) porEdicion[c.numero] = c;
    });
    return Object.fromEntries(Object.entries(porEdicion).map(([ed, c]) => [ed, c.sala]));
  }, [clases]);

  // Los 170 períodos que Diego pasó (edición 1 a 58) están siempre disponibles acá en
  // el código — no dependen de que se hayan importado bien al Sheet. Se identifican por
  // edición+fecha de inicio: si alguien edita uno de estos (aunque cambie docente/staff/
  // hasta/observaciones) y lo guarda, la versión del Sheet pisa a la fija automáticamente.
  const asignacionesCombinadas = useMemo(() => {
    const clavesSheet = new Set(asignaciones.map((a) => `${a.edicion}|${a.desde}`));
    const fijos = DOCENTES_CO_DEFAULT
      .filter((a) => !clavesSheet.has(`${a.edicion}|${a.desde}`))
      .map((a, idx) => ({ ...a, id: `fijo-doc-${idx}`, esFijo: true }));
    return [...fijos, ...asignaciones].map((a) => ({ ...a, sala: a.sala || salaPorEdicionCO[a.edicion] || '' }));
  }, [asignaciones, salaPorEdicionCO]);

  const hoyISO = toISO(new Date());

  // Período vigente de cada edición = el que cubre hoy (Desde <= hoy <= Hasta, con
  // buscarPeriodoCO — la misma función que ya usan Inicio e Incidencias para completar
  // docente/staff), y si ninguno cubre hoy, el de "Desde" más reciente entre todos.
  // Antes se elegía directamente el de "Desde" más reciente sin mirar si ya había arrancado
  // — y como varias ediciones tienen sus 2-3 períodos cargados de entrada desde el vamos
  // (planificación a futuro), el período todavía no arrancado con el "Desde" más lejano
  // "ganaba" y tapaba al que realmente está en curso ahora mismo (ver Edición 54: el
  // período que arranca en 2027 quedaba como "vigente" en vez del que va de 27/08/2026 a
  // 10/12/2026, que es el que de verdad cubre la fecha de hoy).
  const vigentesPorEdicion = useMemo(() => {
    const ediciones = [...new Set(asignacionesCombinadas.map((a) => a.edicion))];
    return ediciones
      .map((ed) => buscarPeriodoCO(asignacionesCombinadas, ed, hoyISO))
      .filter(Boolean)
      .map((a) => ({ ...a, estado: estadoDe(a, hoyISO) }));
  }, [asignacionesCombinadas, hoyISO]);

  // Ordenadas para que la interacción diaria sea más rápida: activas primero (lo que se
  // consulta todo el tiempo), después futuras, y las finalizadas al final — y dentro de cada
  // grupo, de la edición más reciente a la más vieja (edición más alta primero: la Edición 1
  // es la más antigua de todas).
  const ORDEN_ESTADO = { activa: 0, futura: 1, finalizada: 2 };
  const vigentesOrdenadas = useMemo(() => {
    return [...vigentesPorEdicion].sort((a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || parseInt(b.edicion, 10) - parseInt(a.edicion, 10)
    );
  }, [vigentesPorEdicion]);

  const vigentesFiltradas = filtroEstado === 'todas' ? vigentesOrdenadas : vigentesOrdenadas.filter((a) => a.estado === filtroEstado);

  const cantidades = useMemo(() => ({
    activa: vigentesPorEdicion.filter((a) => a.estado === 'activa').length,
    futura: vigentesPorEdicion.filter((a) => a.estado === 'futura').length,
    finalizada: vigentesPorEdicion.filter((a) => a.estado === 'finalizada').length,
    todas: vigentesPorEdicion.length
  }), [vigentesPorEdicion]);

  // Se ordena por edición (de mayor a menor) y, dentro de cada edición, por Desde (del
  // período más reciente al más viejo). De paso se calcula, para cada fila, en qué posición
  // del grupo de su edición está (0 = más reciente) y cuántos períodos tiene ese grupo —
  // el campo "Cuatrimestre" casi nunca se carga a mano, así que se deriva de esa posición:
  // el período más viejo del grupo es el 1er cuatrimestre, el siguiente el 2do, y así.
  const historialOrdenado = useMemo(() => {
    const ordenado = [...asignacionesCombinadas].sort((a, b) =>
      parseInt(b.edicion, 10) - parseInt(a.edicion, 10) || (b.desde || '').localeCompare(a.desde || '')
    );
    let inicioGrupo = 0;
    return ordenado.map((a, i) => {
      const esInicioGrupo = i === 0 || ordenado[i - 1].edicion !== a.edicion;
      if (esInicioGrupo) inicioGrupo = i;
      let tamanoGrupo = 1;
      while (ordenado[inicioGrupo + tamanoGrupo] && ordenado[inicioGrupo + tamanoGrupo].edicion === a.edicion) tamanoGrupo++;
      const posEnGrupo = i - inicioGrupo;
      // Cuatrimestre calculado: 1 para el más viejo del grupo, subiendo hasta tamanoGrupo
      // para el más nuevo. Si el período ya trae un cuatrimestre cargado a mano, se respeta ese.
      const cuatrimestreCalculado = tamanoGrupo - posEnGrupo;
      return { ...a, esInicioGrupo, tamanoGrupo, cuatrimestreCalculado };
    });
  }, [asignacionesCombinadas]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1300px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Docentes y Staff de C.O</h1>
      <p className="text-textSec text-sm mb-4">
        Quién da clase y quién hace staff en cada edición de Coaching Ontológico, y en qué período.
        {!puedeEditar && ' Solo podés ver — la edición está reservada.'}
        {puedeEditar && ' Para cargar un período nuevo, andá a Agregar actividad (Salas Zoom) y elegí el tipo "Período docente C.O.".'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <div className={boxCls}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold">Ediciones</h2>
          <div className="flex flex-wrap gap-1.5">
            <button className={chipCls(filtroEstado === 'activa')} onClick={() => cambiarFiltro('activa')}>🟢 Activas ({cantidades.activa})</button>
            <button className={chipCls(filtroEstado === 'futura')} onClick={() => cambiarFiltro('futura')}>🔵 Futuras ({cantidades.futura})</button>
            <button className={chipCls(filtroEstado === 'finalizada')} onClick={() => cambiarFiltro('finalizada')}>⚪ Finalizadas ({cantidades.finalizada})</button>
            <button className={chipCls(filtroEstado === 'todas')} onClick={() => cambiarFiltro('todas')}>Todas ({cantidades.todas})</button>
          </div>
        </div>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : vigentesFiltradas.length === 0 ? (
          <p className="text-textSec text-sm">No hay ediciones en este filtro.</p>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
            {vigentesFiltradas.map((a) => (
              <div
                key={a.edicion}
                onClick={() => puedeEditar && setSeleccionado(a)}
                className={`bg-bg border border-border rounded-lg p-3 ${puedeEditar ? 'cursor-pointer hover:border-accentTeal' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">Edición {a.edicion}°</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    a.estado === 'activa' ? 'bg-successBg text-successText' : a.estado === 'futura' ? 'bg-infoBg text-infoText' : 'bg-surface2 text-textMuted'
                  }`}>
                    {a.estado === 'activa' ? '🟢 Activa' : a.estado === 'futura' ? '🔵 Futura' : '⚪ Finalizada'}
                  </span>
                </div>
                <p className="text-xs text-textMuted flex flex-wrap items-center gap-x-1">
                  <span>{a.dia} · {a.horario}</span>
                  {a.sala && (
                    <span className="inline-flex items-center gap-1.5">
                      <span>·</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(a.sala).dot} shrink-0`} />
                      <span className={colorPorSala(a.sala).text}>{a.sala}</span>
                    </span>
                  )}
                </p>
                <p className="text-xs text-textSec mt-1">Docente: {a.docente || '—'}</p>
                <p className="text-xs text-textSec">Staff: {a.staff || '—'}</p>
                {a.cuatrimestre && (
                  <p className="text-[11px] text-textMuted mt-1">
                    {CUATRIMESTRES_CO.find((c) => c.id === String(a.cuatrimestre))?.label || `${a.cuatrimestre}° cuatrimestre`}
                  </p>
                )}
                <p className="text-[11px] text-textMuted mt-1">{formatFechaCorta(a.desde)} – {a.hasta ? formatFechaCorta(a.hasta) : 'en curso'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Historial completo (todos los períodos)</h2>
        {historialOrdenado.length === 0 ? <p className="text-textSec text-sm">Sin historial todavía.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Edición</th><th className="p-1.5">Día</th><th className="p-1.5">Horario</th><th className="p-1.5">Sala</th>
                  <th className="p-1.5">Cuatrimestre</th>
                  <th className="p-1.5">Desde</th><th className="p-1.5">Hasta</th>
                  <th className="p-1.5">Docente</th><th className="p-1.5">Staff</th><th className="p-1.5">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {historialOrdenado.map((a, i) => {
                  // esInicioGrupo, tamanoGrupo y cuatrimestreCalculado ya vienen calculados
                  // en el useMemo de historialOrdenado.
                  const { esInicioGrupo, tamanoGrupo } = a;
                  // El color de "vigencia" (activo/reciente/viejo) se calcula una sola vez por
                  // edición, con el período más reciente del grupo — y se pinta solo en la celda
                  // de Edición (que ya ocupa las N filas del grupo con rowSpan), para que se vea
                  // como una única línea continua de un color en vez de partirse en un segmento
                  // por período con un corte de color en cada borde de fila.
                  let claseBandaGrupo = '';
                  if (esInicioGrupo) {
                    const banda = bandaFinalizacion(a.hasta);
                    claseBandaGrupo = banda === 'viejo' ? 'fila-periodo-viejo' : banda === 'reciente' ? 'fila-periodo-reciente' : 'fila-periodo-activo';
                  }
                  // Además del color de vigencia (que se pinta una sola vez por grupo, en la
                  // celda de Edición), cada FILA individual se atenúa si ese período puntual
                  // ya terminó — pedido de Diego: los períodos finalizados tienen que verse
                  // menos, no con el mismo peso visual que el período en curso.
                  const filaTerminada = estadoDe(a, hoyISO) === 'finalizada';
                  return (
                  <tr
                    key={i}
                    onClick={() => puedeEditar && setSeleccionado(a)}
                    className={`border-b border-border ${puedeEditar ? 'cursor-pointer hover:bg-bg' : ''} ${esInicioGrupo ? 'fila-grupo-nuevo' : ''} ${filaTerminada ? 'fila-periodo-terminada' : ''}`}
                  >
                    {esInicioGrupo && (
                      <td className={`p-1.5 align-top font-semibold ${claseBandaGrupo}`} rowSpan={tamanoGrupo}>{a.edicion}°</td>
                    )}
                    <td className="p-1.5">{a.dia}</td>
                    <td className="p-1.5">{a.horario}</td>
                    <td className="p-1.5">
                      {a.sala ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(a.sala).dot} shrink-0`} />
                          <span className={colorPorSala(a.sala).text}>{a.sala}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-1.5">{(a.cuatrimestre || a.cuatrimestreCalculado) ? `${a.cuatrimestre || a.cuatrimestreCalculado}°` : '—'}</td>
                    <td className="p-1.5">{formatFechaCorta(a.desde)}</td>
                    <td className="p-1.5">{formatFechaCorta(a.hasta)}</td>
                    <td className="p-1.5">{a.docente || '—'}</td>
                    <td className="p-1.5">{a.staff || '—'}</td>
                    <td className="p-1.5">{a.observaciones || '—'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {seleccionado && (
        <ModalEditarPeriodo item={seleccionado} onCerrar={() => setSeleccionado(null)} fetchAutenticado={fetchAutenticado} onCambio={cargar} />
      )}
    </div>
  );
}

function ModalEditarPeriodo({ item, onCerrar, fetchAutenticado, onCambio }) {
  const [campos, setCampos] = useState({
    edicion: item.edicion, dia: item.dia, horario: item.horario, desde: item.desde, hasta: item.hasta,
    docente: item.docente, staff: item.staff, sala: item.sala || '', cuatrimestre: item.cuatrimestre || '',
    observaciones: item.observaciones
  });
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [err, setErr] = useState('');

  function set(campo, valor) { setCampos((p) => ({ ...p, [campo]: valor })); }

  async function guardar() {
    setErr(''); setGuardando(true);
    try {
      let res;
      if (item.esFijo) {
        // Este período todavía no existe como fila real en el Sheet — guardarlo lo crea
        // (y a partir de ahí ya queda editable/eliminable como cualquier otro).
        res = await fetchAutenticado('/api/docentes-co', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos)
        });
      } else {
        res = await fetchAutenticado(`/api/docentes-co/${encodeURIComponent(item.id)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos)
        });
      }
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
    setErr(''); setEliminando(true);
    try {
      const res = await fetchAutenticado(`/api/docentes-co/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
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
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">Editar período — Edición {item.edicion}°</h3>
        {item.esFijo && <p className="text-[11px] text-textMuted mb-3">Este período viene precargado — al guardar, se crea como registro editable.</p>}
        {err && <p className="text-dangerText text-xs mb-2.5">{err}</p>}

        {!confirmarEliminar ? (
          <>
            <label className={labelCls}>Edición</label><input value={campos.edicion} onChange={(e) => set('edicion', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Día</label><input value={campos.dia} onChange={(e) => set('dia', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Horario</label><input value={campos.horario} onChange={(e) => set('horario', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Desde</label><input type="date" value={campos.desde} onChange={(e) => set('desde', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Hasta</label><input type="date" value={campos.hasta} onChange={(e) => set('hasta', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Docente</label><input value={campos.docente} onChange={(e) => set('docente', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Staff</label><input value={campos.staff} onChange={(e) => set('staff', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Sala</label>
            <select value={campos.sala} onChange={(e) => set('sala', e.target.value)} className={`${inputCls} mb-2.5`}>
              <option value="">Sin definir</option>
              {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className={labelCls}>Cuatrimestre</label>
            <select value={campos.cuatrimestre} onChange={(e) => set('cuatrimestre', e.target.value)} className={`${inputCls} mb-2.5`}>
              <option value="">Sin definir</option>
              {CUATRIMESTRES_CO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label className={labelCls}>Observaciones</label><input value={campos.observaciones} onChange={(e) => set('observaciones', e.target.value)} className={`${inputCls} mb-3`} />
            <div className="flex gap-2 flex-wrap">
              <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
              {!item.esFijo && <button className={`${btnSecCls} text-dangerText`} onClick={() => setConfirmarEliminar(true)}>Eliminar</button>}
              <button className={btnCls} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm mb-3">¿Seguro que querés eliminar este período? No se puede deshacer.</p>
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
