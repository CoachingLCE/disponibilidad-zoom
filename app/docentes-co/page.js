'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta } from '../../lib/salasLogic';

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
  const [docente, setDocente] = useState('');
  const [staff, setStaff] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
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
        body: JSON.stringify({ edicion: edicion.trim(), docente, staff, fechaAsignacion: fecha, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Asignación guardada.' });
      setDocente(''); setStaff(''); setObs('');
      cargar();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setGuardando(false);
    }
  }

  // Asignación vigente de cada edición = la más reciente por fecha.
  const vigentesPorEdicion = useMemo(() => {
    const porEdicion = {};
    asignaciones.forEach((a) => {
      if (!porEdicion[a.edicion] || a.fechaAsignacion > porEdicion[a.edicion].fechaAsignacion) {
        porEdicion[a.edicion] = a;
      }
    });
    return Object.values(porEdicion).sort((a, b) => parseInt(a.edicion, 10) - parseInt(b.edicion, 10));
  }, [asignaciones]);

  const historialOrdenado = [...asignaciones].sort((a, b) => b.fechaAsignacion.localeCompare(a.fechaAsignacion));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Docentes y Staff de C.O</h1>
      <p className="text-textSec text-sm mb-4">
        Quién da clase y quién hace staff en cada edición de Coaching Ontológico.
        {!puedeEditar && ' Solo podés ver — la edición está reservada.'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Nueva asignación</h2>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <div><label className={labelCls}>Edición</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} placeholder="ej: 45" className={inputCls} /></div>
            <div><label className={labelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Staff</label><input value={staff} onChange={(e) => setStaff(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="mb-3"><label className={labelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} /></div>
          <button className={btnCls} disabled={guardando} onClick={agregar}>{guardando ? 'Guardando…' : 'Guardar asignación'}</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Asignación vigente por edición</h2>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : vigentesPorEdicion.length === 0 ? (
          <p className="text-textSec text-sm">Todavía no hay asignaciones cargadas.</p>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))' }}>
            {vigentesPorEdicion.map((a) => (
              <div key={a.edicion} className="bg-bg border border-border rounded-lg p-3">
                <p className="text-sm font-semibold">Edición {a.edicion}</p>
                <p className="text-xs text-textSec mt-1">Docente: {a.docente || '—'}</p>
                <p className="text-xs text-textSec">Staff: {a.staff || '—'}</p>
                <p className="text-[11px] text-textMuted mt-1">Desde {formatFechaCorta(a.fechaAsignacion)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Historial completo de asignaciones</h2>
        {historialOrdenado.length === 0 ? <p className="text-textSec text-sm">Sin historial todavía.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Edición</th><th className="p-1.5">Docente</th><th className="p-1.5">Staff</th>
                  <th className="p-1.5">Fecha</th><th className="p-1.5">Observaciones</th><th className="p-1.5">Cargado por</th>
                </tr>
              </thead>
              <tbody>
                {historialOrdenado.map((a, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-1.5">{a.edicion}</td>
                    <td className="p-1.5">{a.docente || '—'}</td>
                    <td className="p-1.5">{a.staff || '—'}</td>
                    <td className="p-1.5">{formatFechaCorta(a.fechaAsignacion)}</td>
                    <td className="p-1.5">{a.observaciones || '—'}</td>
                    <td className="p-1.5">{a.usuario}</td>
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
