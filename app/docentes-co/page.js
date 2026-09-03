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

export default function DocentesCOPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = usuario?.puedeEditarDocentesCO;

  const [asignaciones, setAsignaciones] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);

  const [edicion, setEdicion] = useState('');
  const [dia, setDia] = useState('');
  const [horario, setHorario] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [docente, setDocente] = useState('');
  const [staff, setStaff] = useState('');
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

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

  async function agregar() {
    setMsg(null);
    if (!edicion.trim()) { setMsg({ tipo: 'error', texto: 'Elegí la edición.' }); return; }
    setGuardando(true);
    try {
      const res = await fetchAutenticado('/api/docentes-co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edicion: edicion.trim(), dia, horario, desde, hasta, docente, staff, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Período guardado.' });
      setDocente(''); setStaff(''); setObs(''); setDesde(''); setHasta('');
      cargar();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setGuardando(false);
    }
  }

  // Los 170 períodos que Diego pasó (edición 1 a 58) están siempre disponibles acá en
  // el código — no dependen de que se hayan importado bien al Sheet. Lo que se agregue
  // desde la app se suma aparte, sin duplicar lo fijo (mismo criterio que Campañas/
  // Enlaces de Cronograma CM e Info. técnica).
  const asignacionesCombinadas = useMemo(() => {
    const clavesSheet = new Set(asignaciones.map((a) => `${a.edicion}|${a.desde}|${a.hasta}|${a.docente}`));
    const fijos = DOCENTES_CO_DEFAULT
      .filter((a) => !clavesSheet.has(`${a.edicion}|${a.desde}|${a.hasta}|${a.docente}`))
      .map((a, idx) => ({ ...a, id: `fijo-doc-${idx}`, esFijo: true }));
    return [...fijos, ...asignaciones];
  }, [asignaciones]);

  // Período vigente de cada edición = el que tiene la fecha "Desde" más reciente.
  const vigentesPorEdicion = useMemo(() => {
    const porEdicion = {};
    asignacionesCombinadas.forEach((a) => {
      if (!porEdicion[a.edicion] || a.desde > porEdicion[a.edicion].desde) {
        porEdicion[a.edicion] = a;
      }
    });
    return Object.values(porEdicion).sort((a, b) => parseInt(a.edicion, 10) - parseInt(b.edicion, 10));
  }, [asignacionesCombinadas]);

  const historialOrdenado = [...asignacionesCombinadas].sort((a, b) => parseInt(b.edicion, 10) - parseInt(a.edicion, 10) || (b.desde || '').localeCompare(a.desde || ''));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1300px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Docentes y Staff de C.O</h1>
      <p className="text-textSec text-sm mb-4">
        Quién da clase y quién hace staff en cada edición de Coaching Ontológico, y en qué período.
        {!puedeEditar && ' Solo podés ver — la edición está reservada.'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Nuevo período</h2>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
            <div><label className={labelCls}>Edición</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} placeholder="ej: 45" className={inputCls} /></div>
            <div><label className={labelCls}>Día</label><input value={dia} onChange={(e) => setDia(e.target.value)} placeholder="Martes" className={inputCls} /></div>
            <div><label className={labelCls}>Horario</label><input value={horario} onChange={(e) => setHorario(e.target.value)} placeholder="19:00 a 21:00" className={inputCls} /></div>
          </div>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
            <div><label className={labelCls}>Desde</label><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Hasta</label><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Staff</label><input value={staff} onChange={(e) => setStaff(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="mb-3"><label className={labelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} /></div>
          <button className={btnCls} disabled={guardando} onClick={agregar}>{guardando ? 'Guardando…' : 'Guardar período'}</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Período vigente por edición</h2>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : vigentesPorEdicion.length === 0 ? (
          <p className="text-textSec text-sm">Todavía no hay nada cargado.</p>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
            {vigentesPorEdicion.map((a) => (
              <div key={a.edicion} className="bg-bg border border-border rounded-lg p-3">
                <p className="text-sm font-semibold">Edición {a.edicion}°</p>
                <p className="text-xs text-textMuted">{a.dia} · {a.horario}</p>
                <p className="text-xs text-textSec mt-1">Docente: {a.docente || '—'}</p>
                <p className="text-xs text-textSec">Staff: {a.staff || '—'}</p>
                <p className="text-[11px] text-textMuted mt-1">{formatFechaCorta(a.desde)} – {formatFechaCorta(a.hasta) || 'en curso'}</p>
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
                  <tr key={i} className="border-b border-border">
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
    </div>
  );
}
