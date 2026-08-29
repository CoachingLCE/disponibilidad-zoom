'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, NOMBRES, ICONOS, minutosAHora, formatFechaCorta, esPasada
} from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const chipCls = (activo) => `text-xs font-semibold px-2.5 py-1 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const TIPOS = ['Formación', 'BLOG', 'Masterclass', 'Reuniones', 'Capacitación', 'Jornada', 'Clases de apoyo', 'Auditorio', 'Caja de ideas', 'Encuentro Potencia', 'Laboratorio C.O', 'Clase especial', 'Equipo docente', 'Otro'];
const CURSOS = [
  ['CO', 'Coaching Ontológico'], ['CE', 'Coaching Educativo'], ['CEQUI', 'Coaching de Equipos'],
  ['CDEP', 'Coaching Deportivo'], ['CV', 'Coaching Vocacional'], ['OR', 'Oratoria'], ['IE', 'Inteligencia Emocional'],
  ['OTRO_Copywriting', 'Copywriting para redes sociales'], ['OTRO_Mindfulness', 'Mindfulness'],
  ['OTRO_Formador', 'Formador para formadores'], ['OTRO_PNL', 'PNL'], ['', '— Ninguno / no aplica —']
];
const HORAS_OPCIONES = (() => { const out = []; for (let m = 8 * 60; m <= 22.5 * 60; m += 30) out.push(minutosAHora(m)); return out; })();

export default function CronogramaPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  const [clases, setClases] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');

  const [fecha, setFecha] = useState('');
  const [tipo, setTipo] = useState('Formación');
  const [curso, setCurso] = useState('CO');
  const [edicion, setEdicion] = useState('');
  const [horaTxt, setHoraTxt] = useState('18:00');
  const [docente, setDocente] = useState('');
  const [tematica, setTematica] = useState('');
  const [obs, setObs] = useState('');
  const [msg, setMsg] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [msgHistorico, setMsgHistorico] = useState(null);
  const [importandoHistorico, setImportandoHistorico] = useState(false);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, ra] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/actividades')]);
      const [dc, da] = await Promise.all([rc.json(), ra.json()]);
      if (rc.ok) setClases(dc.clases);
      if (ra.ok) setActividades(da.actividades);
    } finally { setCargandoDatos(false); }
  }

  const { todas, totalSinFiltro } = useMemo(() => {
    const deClases = clases.filter((c) => c.fecha).map((c) => ({
      fecha: c.fecha, tipo: 'Formación', curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.numero, horaMin: c.horaMin, sala: c.sala, docente: c.docente, tematica: c.tematica,
      observaciones: c.observaciones, pasada: esPasada(c.fecha)
    }));
    const deOtras = actividades.map((a) => ({ ...a, sala: '', pasada: esPasada(a.fecha) }));
    const completo = deClases.concat(deOtras).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.horaMin || 0) - (a.horaMin || 0));
    let out = completo;
    if (filtroTipo) out = out.filter((a) => a.tipo === filtroTipo);
    if (filtroCurso) out = out.filter((a) => a.curso === filtroCurso);
    return { todas: out, totalSinFiltro: completo.length };
  }, [clases, actividades, filtroTipo, filtroCurso]);

  const tiposUsados = [...new Set(['Formación', ...actividades.map((a) => a.tipo)])];
  const cursosUsados = [...new Set(clases.map((c) => c.codigo).concat(actividades.filter((a) => a.curso).map((a) => a.curso)))];

  async function agregar() {
    setMsg(null); setResultado(null);
    if (!fecha || !horaTxt) { setMsg({ tipo: 'error', texto: 'Elegí fecha y hora.' }); return; }

    if (tipo !== 'Formación') {
      const res = await fetchAutenticado('/api/actividades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, tipo, curso, edicion, horaTxt, docente, tematica, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: `"${tipo}" agregado al cronograma.` });
      setTematica(''); setObs('');
      cargarDatos();
      return;
    }

    // Formación: consulta disponibilidad primero
    const res = await fetchAutenticado('/api/clases/reservar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, horaTxt, codigo: curso, edicion, numero: edicion, cantidad: 1 })
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setResultado(data);
  }

  async function reservarEn(sala) {
    const res = await fetchAutenticado('/api/clases/reservar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, horaTxt, codigo: curso, edicion, numero: edicion, cantidad: 1, sala, docente, tematica, observaciones: obs })
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: `Reservado en ${sala}.` });
    setResultado(null); setTematica(''); setObs('');
    cargarDatos();
  }

  async function importarHistorico() {
    setImportandoHistorico(true);
    setMsgHistorico(null);
    try {
      const res = await fetchAutenticado('/api/actividades/importar-historico', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: CRONOGRAMA_HISTORICO })
      });
      const data = await res.json();
      if (!res.ok) { setMsgHistorico({ tipo: 'error', texto: data.error }); return; }
      setMsgHistorico({ tipo: 'ok', texto: `Se importaron ${data.agregadas} actividad(es) históricas (2023-2027).${data.omitidas ? ' ' + data.omitidas + ' ya existían, no se duplicaron.' : ''}` });
      cargarDatos();
    } catch {
      setMsgHistorico({ tipo: 'error', texto: 'Error de conexión.' });
    } finally {
      setImportandoHistorico(false);
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">📅 Cronograma</h1>
      <p className="text-textSec text-sm mb-5">Todo lo que sucede en ILCE: Formaciones, BLOG, Masterclass, Reuniones, Capacitaciones, Jornadas y más.</p>

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-2">📦 Importar histórico (2023-2027)</h2>
          <p className="text-xs text-textSec mb-2.5">
            Trae de una las 375 actividades históricas (Formaciones, BLOG, Masterclass, Reuniones, etc.) que ya estaban cargadas en el prototipo — quedan como referencia, sin tocar el sistema de salas. Se puede correr más de una vez sin duplicar.
          </p>
          <button className={btnCls} disabled={importandoHistorico} onClick={importarHistorico}>
            {importandoHistorico ? 'Importando…' : 'Importar histórico'}
          </button>
          {msgHistorico && <p className={`text-xs mt-2 ${msgHistorico.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msgHistorico.texto}</p>}
        </div>
      )}

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Nueva actividad</h2>
          <div className="grid gap-2.5 mb-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Curso/Materia</label>
              <select value={curso} onChange={(e) => setCurso(e.target.value)} className={inputCls}>
                {CURSOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Edición/Número</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} placeholder="ej: 15" className={inputCls} /></div>
            <div><label className={labelCls}>Horario</label>
              <select value={horaTxt} onChange={(e) => setHoraTxt(e.target.value)} className={inputCls}>
                {HORAS_OPCIONES.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="mb-2.5"><label className={labelCls}>Temática</label><input value={tematica} onChange={(e) => setTematica(e.target.value)} className={inputCls} /></div>
          <div className="mb-3"><label className={labelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} /></div>
          <button className={btnCls} onClick={agregar}>Agregar al cronograma</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}

          {resultado && (
            <div className="mt-3.5">
              <div className={`px-3.5 py-2.5 rounded-lg mb-3 font-semibold text-sm ${resultado.libres.length ? 'bg-successBg text-successText' : 'bg-dangerBg text-dangerText'}`}>
                {resultado.libres.length ? `Sí hay lugar — ${resultado.libres.length} sala(s) libre(s)` : 'No hay lugar'}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))' }}>
                {SALAS.map((s) => {
                  const ocupada = resultado.ocupadas.find((o) => o.sala === s);
                  return (
                    <button key={s} disabled={!!ocupada} className={`${btnCls} text-xs`} onClick={() => reservarEn(s)}>
                      {ocupada ? `${s} (ocupada)` : `Reservar en ${s}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-1">Todo el cronograma</h2>
        <p className="text-xs text-textSec mb-3">
          {totalSinFiltro} actividad(es) cargadas en total{(filtroTipo || filtroCurso) ? ` · mostrando ${todas.length} con el filtro actual` : ''}.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button className={chipCls(filtroTipo === '')} onClick={() => setFiltroTipo('')}>Todos los tipos</button>
          {tiposUsados.map((t) => <button key={t} className={chipCls(filtroTipo === t)} onClick={() => setFiltroTipo(t)}>{t}</button>)}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button className={chipCls(filtroCurso === '')} onClick={() => setFiltroCurso('')}>Todas las formaciones</button>
          {cursosUsados.map((c) => <button key={c} className={chipCls(filtroCurso === c)} onClick={() => setFiltroCurso(c)}>{ICONOS[c] || ''} {c}</button>)}
        </div>

        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : todas.length === 0 ? (
          <p className="text-textSec text-sm">No hay actividades que coincidan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Fecha</th><th className="p-1.5">Tipo</th><th className="p-1.5">Curso/Edición</th>
                  <th className="p-1.5">Horario</th><th className="p-1.5">Sala</th><th className="p-1.5">Docente</th>
                  <th className="p-1.5">Temática</th><th className="p-1.5">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {todas.map((a, i) => (
                  <tr key={i} className={`border-b border-border ${a.pasada ? 'opacity-45 line-through' : ''}`}>
                    <td className="p-1.5">{formatFechaCorta(a.fecha)}</td>
                    <td className="p-1.5">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        a.tipo === 'Formación'
                          ? 'bg-successBg text-successText'
                          : a.curso
                            ? 'bg-infoBg text-infoText'
                            : 'bg-surface2 text-textMuted'
                      }`}>
                        {a.tipo}
                      </span>
                    </td>
                    <td className="p-1.5">{a.nombreCurso || '—'}{a.edicion ? ' · ' + a.edicion : ''}</td>
                    <td className="p-1.5">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</td>
                    <td className="p-1.5">{a.sala || '—'}</td>
                    <td className="p-1.5">{a.docente || '—'}</td>
                    <td className="p-1.5">{a.tematica || '—'}</td>
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
