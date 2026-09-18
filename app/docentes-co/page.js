'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta } from '../../lib/salasLogic';
import { DOCENTES_CO_DEFAULT } from '../../lib/docentesCODefaults';

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

export default function DocentesCOPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = usuario?.puedeEditarDocentesCO;

  const [asignaciones, setAsignaciones] = useState([]);
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
      const res = await fetchAutenticado('/api/docentes-co');
      const data = await res.json();
      if (res.ok) setAsignaciones(data.asignaciones); else setError(data.error);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  // Los 170 períodos que Diego pasó (edición 1 a 58) están siempre disponibles acá en
  // el código — no dependen de que se hayan importado bien al Sheet. Se identifican por
  // edición+fecha de inicio: si alguien edita uno de estos (aunque cambie docente/staff/
  // hasta/observaciones) y lo guarda, la versión del Sheet pisa a la fija automáticamente.
  const asignacionesCombinadas = useMemo(() => {
    const clavesSheet = new Set(asignaciones.map((a) => `${a.edicion}|${a.desde}`));
    const fijos = DOCENTES_CO_DEFAULT
      .filter((a) => !clavesSheet.has(`${a.edicion}|${a.desde}`))
      .map((a, idx) => ({ ...a, id: `fijo-doc-${idx}`, esFijo: true }));
    return [...fijos, ...asignaciones];
  }, [asignaciones]);

  const hoyISO = toISO(new Date());

  // Período vigente de cada edición = el que tiene la fecha "Desde" más reciente
  // (con eso se decide qué docente/staff mostrar como "el actual" de esa edición).
  const vigentesPorEdicion = useMemo(() => {
    const porEdicion = {};
    asignacionesCombinadas.forEach((a) => {
      if (!porEdicion[a.edicion] || a.desde > porEdicion[a.edicion].desde) {
        porEdicion[a.edicion] = a;
      }
    });
    return Object.values(porEdicion).map((a) => ({ ...a, estado: estadoDe(a, hoyISO) }));
  }, [asignacionesCombinadas, hoyISO]);

  // Ordenadas para que la interacción diaria sea más rápida: activas primero (lo que se
  // consulta todo el tiempo), después futuras, y las finalizadas al final.
  const ORDEN_ESTADO = { activa: 0, futura: 1, finalizada: 2 };
  const vigentesOrdenadas = useMemo(() => {
    return [...vigentesPorEdicion].sort((a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || parseInt(a.edicion, 10) - parseInt(b.edicion, 10)
    );
  }, [vigentesPorEdicion]);

  const vigentesFiltradas = filtroEstado === 'todas' ? vigentesOrdenadas : vigentesOrdenadas.filter((a) => a.estado === filtroEstado);

  const cantidades = useMemo(() => ({
    activa: vigentesPorEdicion.filter((a) => a.estado === 'activa').length,
    futura: vigentesPorEdicion.filter((a) => a.estado === 'futura').length,
    finalizada: vigentesPorEdicion.filter((a) => a.estado === 'finalizada').length,
    todas: vigentesPorEdicion.length
  }), [vigentesPorEdicion]);

  const historialOrdenado = [...asignacionesCombinadas].sort((a, b) => parseInt(b.edicion, 10) - parseInt(a.edicion, 10) || (b.desde || '').localeCompare(a.desde || ''));

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
                <p className="text-xs text-textMuted">{a.dia} · {a.horario}</p>
                <p className="text-xs text-textSec mt-1">Docente: {a.docente || '—'}</p>
                <p className="text-xs text-textSec">Staff: {a.staff || '—'}</p>
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
                  <th className="p-1.5">Edición</th><th className="p-1.5">Día</th><th className="p-1.5">Horario</th>
                  <th className="p-1.5">Desde</th><th className="p-1.5">Hasta</th>
                  <th className="p-1.5">Docente</th><th className="p-1.5">Staff</th><th className="p-1.5">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {historialOrdenado.map((a, i) => (
                  <tr
                    key={i}
                    onClick={() => puedeEditar && setSeleccionado(a)}
                    className={`border-b border-border ${puedeEditar ? 'cursor-pointer hover:bg-bg' : ''}`}
                  >
                    <td className="p-1.5">{a.edicion}°</td>
                    <td className="p-1.5">{a.dia}</td>
                    <td className="p-1.5">{a.horario}</td>
                    <td className="p-1.5">{formatFechaCorta(a.desde)}</td>
                    <td className="p-1.5">{formatFechaCorta(a.hasta)}</td>
                    <td className="p-1.5">{a.docente || '—'}</td>
                    <td className="p-1.5">{a.staff || '—'}</td>
                    <td className="p-1.5">{a.observaciones || '—'}</td>
                  </tr>
                ))}
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
    docente: item.docente, staff: item.staff, observaciones: item.observaciones
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
