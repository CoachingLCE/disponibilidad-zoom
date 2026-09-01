'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { TIPOS_CM, colorCM } from '../../lib/coloresCM';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const DIAS_LABEL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const HORAS = Array.from({ length: 9 }, (_, i) => 9 + i); // 9 a 17
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
  const [semanaOffset, setSemanaOffset] = useState(0);

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState(9);
  const [tipo, setTipo] = useState(TIPOS_CM[0].id);
  const [detalle, setDetalle] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

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
