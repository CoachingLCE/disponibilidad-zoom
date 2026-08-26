'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta, calcularAlertas } from '../../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1 text-xs';

export default function IncidenciasPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const [fFecha, setFFecha] = useState('');
  const [fMotivo, setFMotivo] = useState('');
  const [fBloquea, setFBloquea] = useState(true);
  const [msgFeriado, setMsgFeriado] = useState(null);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, rf, rp] = await Promise.all([
        fetchAutenticado('/api/clases'), fetchAutenticado('/api/feriados'), fetchAutenticado('/api/postergaciones')
      ]);
      const [dc, df, dp] = await Promise.all([rc.json(), rf.json(), rp.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (rp.ok) setPostergaciones(dp.postergaciones);
    } finally { setCargandoDatos(false); }
  }

  const alertas = useMemo(() => calcularAlertas(clases, feriados), [clases, feriados]);

  async function crearFeriado() {
    setMsgFeriado(null);
    if (!fFecha || !fMotivo) { setMsgFeriado({ tipo: 'error', texto: 'Completá fecha y motivo.' }); return; }
    const res = await fetchAutenticado('/api/feriados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: fFecha, motivo: fMotivo, bloquea: fBloquea })
    });
    const data = await res.json();
    if (!res.ok) { setMsgFeriado({ tipo: 'error', texto: data.error }); return; }
    setMsgFeriado({ tipo: 'ok', texto: 'Feriado agregado.' });
    setFFecha(''); setFMotivo('');
    cargarDatos();
  }

  async function eliminarFeriado(id) {
    const res = await fetchAutenticado(`/api/feriados/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) cargarDatos();
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">⚠️ Incidencias</h1>
      <p className="text-textSec text-sm mb-5">Feriados, clases postergadas y conflictos automáticos.</p>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">📅 Feriados</h2>
        {puedeEditar && (
          <div className="mb-4">
            <div className="grid gap-2.5 mb-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
              <div><label className={labelCls}>Fecha</label><input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} className={inputCls} /></div>
              <div><label className={labelCls}>Motivo</label><input value={fMotivo} onChange={(e) => setFMotivo(e.target.value)} placeholder="ej: Día del Docente" className={inputCls} /></div>
              <div><label className={labelCls}>Estado</label>
                <select value={fBloquea ? 'si' : 'no'} onChange={(e) => setFBloquea(e.target.value === 'si')} className={inputCls}>
                  <option value="si">🔒 Bloquea</option>
                  <option value="no">👁️ Informativo</option>
                </select>
              </div>
            </div>
            <button className={btnCls} onClick={crearFeriado}>➕ Agregar feriado</button>
            {msgFeriado && <p className={`text-xs mt-2 ${msgFeriado.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msgFeriado.texto}</p>}
          </div>
        )}
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : feriados.length === 0 ? (
          <p className="text-textSec text-sm">No hay feriados cargados.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead><tr className="border-b border-border text-textSec text-left"><th className="p-1.5">Fecha</th><th className="p-1.5">Motivo</th><th className="p-1.5">Estado</th><th></th></tr></thead>
            <tbody>
              {[...feriados].sort((a, b) => a.fecha.localeCompare(b.fecha)).map((f) => (
                <tr key={f.id} className="border-b border-border">
                  <td className="p-1.5">{formatFechaCorta(f.fecha)}</td>
                  <td className="p-1.5">{f.motivo}</td>
                  <td className="p-1.5">{f.bloquea ? '🔒 Bloquea' : '👁️ Informativo'}</td>
                  <td className="p-1.5">{puedeEditar && <button className={btnSecCls} onClick={() => eliminarFeriado(f.id)}>🗑️</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">🟡 Clases postergadas</h2>
        {postergaciones.length === 0 ? <p className="text-textSec text-sm">Todavía no se postergó ninguna clase.</p> : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-textSec text-left">
                <th className="p-1.5">Formación</th><th className="p-1.5">Clase</th><th className="p-1.5">Original</th>
                <th className="p-1.5">Nueva</th><th className="p-1.5">Motivo</th><th className="p-1.5">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {postergaciones.map((p, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-1.5">{p.codigo} {p.edicion}</td>
                  <td className="p-1.5">{p.numero}</td>
                  <td className="p-1.5">{formatFechaCorta(p.fechaOriginal)}</td>
                  <td className="p-1.5">{formatFechaCorta(p.fechaNueva)}</td>
                  <td className="p-1.5">{p.motivo}</td>
                  <td className="p-1.5">{p.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">🚨 Panel de conflictos</h2>
        {alertas.length === 0 ? <p className="text-textSec text-sm">✔ Sin conflictos detectados por ahora.</p> : (
          <div className="flex flex-col gap-1.5">
            {alertas.map((a, i) => (
              <div key={i} className={`rounded-lg px-3 py-2 text-xs font-semibold ${a.tipo === 'warn' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'}`}>
                ⚠ {a.texto}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
