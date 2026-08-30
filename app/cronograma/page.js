'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, DIAS, NOMBRES, ICONOS, DURACIONES, BUFFER_MIN, minutosAHora, formatFechaCorta, esPasada
} from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';
const chipCls = (activo) => `text-xs font-semibold px-2.5 py-1 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;
const tabCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-lg border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const TIPOS = ['Formación', 'BLOG', 'Masterclass', 'Reuniones', 'Capacitación', 'Jornada', 'Clases de apoyo', 'Auditorio', 'Caja de ideas', 'Encuentro Potencia', 'Laboratorio C.O', 'Clase especial', 'Equipo docente', 'Otro'];
const CURSOS = [
  ['CO', 'Coaching Ontológico'], ['CE', 'Coaching Educativo'], ['CEQUI', 'Coaching de Equipos'],
  ['CDEP', 'Coaching Deportivo'], ['CV', 'Coaching Vocacional'], ['OR', 'Oratoria'], ['IE', 'Inteligencia Emocional'],
  ['OTRO_Copywriting', 'Copywriting para redes sociales'], ['OTRO_Mindfulness', 'Mindfulness'],
  ['OTRO_Formador', 'Formador para formadores'], ['OTRO_PNL', 'PNL'], ['', '— Ninguno / no aplica —']
];
const HORAS_OPCIONES = (() => { const out = []; for (let m = 8 * 60; m <= 22.5 * 60; m += 30) out.push(minutosAHora(m)); return out; })();
const DIAS_SEMANA = DIAS.slice(0, 6); // Lunes a Sábado

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

export default function CronogramaPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  const [clases, setClases] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [vista, setVista] = useState('calendario'); // calendario | lista
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroSala, setFiltroSala] = useState('');
  const [filtroDia, setFiltroDia] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);

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

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, ra] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/actividades')]);
      const [dc, da] = await Promise.all([rc.json(), ra.json()]);
      if (rc.ok) setClases(dc.clases);
      if (ra.ok) {
        setActividades(da.actividades);
        if (da.actividades.length === 0 && puedeEditar) {
          try {
            await fetchAutenticado('/api/actividades/importar-historico', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: CRONOGRAMA_HISTORICO })
            });
            const ra2 = await fetchAutenticado('/api/actividades');
            const da2 = await ra2.json();
            if (ra2.ok) setActividades(da2.actividades);
          } catch { /* silencioso */ }
        }
      }
    } finally { setCargandoDatos(false); }
  }

  const { todas, totalSinFiltro } = useMemo(() => {
    const deClases = clases.filter((c) => c.fecha).map((c) => ({
      id: c.id, fecha: c.fecha, dia: c.dia, tipo: 'Formación', curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.numero, horaMin: c.horaMin, duracion: c.duracion, sala: c.sala, docente: c.docente, tematica: c.tematica,
      observaciones: c.observaciones, pasada: esPasada(c.fecha)
    }));
    const deOtras = actividades.map((a) => ({ ...a, duracion: 90, pasada: esPasada(a.fecha) }));
    const completo = deClases.concat(deOtras).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.horaMin || 0) - (a.horaMin || 0));
    let out = completo;
    if (filtroTipo) out = out.filter((a) => a.tipo === filtroTipo);
    if (filtroCurso) out = out.filter((a) => a.curso === filtroCurso);
    if (filtroSala) out = out.filter((a) => a.sala === filtroSala);
    if (filtroDia) out = out.filter((a) => a.dia === filtroDia);
    return { todas: out, totalSinFiltro: completo.length };
  }, [clases, actividades, filtroTipo, filtroCurso, filtroSala, filtroDia]);

  const tiposUsados = [...new Set(['Formación', ...actividades.map((a) => a.tipo)])];
  const cursosUsados = [...new Set(clases.map((c) => c.codigo).concat(actividades.filter((a) => a.curso).map((a) => a.curso)))];

  // --- Vista calendario: semana actual (o con offset) ---
  const lunes = lunesDeSemana(semanaOffset);
  const fechasSemana = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return toISO(d);
  });
  const hoyISO = toISO(new Date());
  const itemsSemana = todas.filter((a) => fechasSemana.includes(a.fecha));
  const horasSemana = [...new Set(itemsSemana.map((a) => a.horaMin).filter((h) => h != null))].sort((a, b) => a - b);
  const ahora = new Date();
  const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();

  // Choques: misma sala, mismo día/fecha, horarios que se pisan
  const idsConChoque = useMemo(() => {
    const set = new Set();
    const porSalaFecha = {};
    itemsSemana.forEach((a) => {
      if (!a.sala) return;
      const key = `${a.sala}|${a.fecha}`;
      (porSalaFecha[key] = porSalaFecha[key] || []).push(a);
    });
    Object.values(porSalaFecha).forEach((grupo) => {
      for (let i = 0; i < grupo.length; i++) {
        for (let j = i + 1; j < grupo.length; j++) {
          const x = grupo[i], y = grupo[j];
          const xi = x.horaMin - BUFFER_MIN, xf = x.horaMin + (x.duracion || 90);
          const yi = y.horaMin - BUFFER_MIN, yf = y.horaMin + (y.duracion || 90);
          if (xi < yf && yi < xf) { set.add(x.id || `${x.fecha}-${x.horaMin}-${x.sala}`); set.add(y.id || `${y.fecha}-${y.horaMin}-${y.sala}`); }
        }
      }
    });
    return set;
  }, [itemsSemana]);

  async function agregar() {
    setMsg(null); setResultado(null);
    if (!fecha || !horaTxt) { setMsg({ tipo: 'error', texto: 'Elegí fecha y hora.' }); return; }
    try {
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
      const res = await fetchAutenticado('/api/clases/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaTxt, codigo: curso, edicion, numero: edicion, cantidad: 1 })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setResultado(data);
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  async function reservarEn(sala) {
    try {
      const res = await fetchAutenticado('/api/clases/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaTxt, codigo: curso, edicion, numero: edicion, cantidad: 1, sala, docente, tematica, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: `Reservado en ${sala}.` });
      setResultado(null); setTematica(''); setObs('');
      cargarDatos();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Cronograma</h1>
      <p className="text-textSec text-sm mb-5">Todo lo que sucede en ILCE: Formaciones, BLOG, Masterclass, Reuniones, Capacitaciones, Jornadas y más.</p>

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
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold">Todo el cronograma</h2>
          <div className="flex gap-1.5">
            <button className={tabCls(vista === 'calendario')} onClick={() => setVista('calendario')}>Calendario</button>
            <button className={tabCls(vista === 'lista')} onClick={() => setVista('lista')}>Lista</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <button className={chipCls(filtroTipo === '')} onClick={() => setFiltroTipo('')}>Todos los tipos</button>
          {tiposUsados.map((t) => <button key={t} className={chipCls(filtroTipo === t)} onClick={() => setFiltroTipo(t)}>{t}</button>)}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button className={chipCls(filtroCurso === '')} onClick={() => setFiltroCurso('')}>Todas las formaciones</button>
          {cursosUsados.map((c) => <button key={c} className={chipCls(filtroCurso === c)} onClick={() => setFiltroCurso(c)}>{ICONOS[c] || ''} {c}</button>)}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <select value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">Todas las salas</option>
            {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroDia} onChange={(e) => setFiltroDia(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="">Todos los días</option>
            {DIAS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
          </select>
        </div>

        <p className="text-xs text-textSec mb-3">
          {totalSinFiltro} actividad(es) cargadas en total{(filtroTipo || filtroCurso || filtroSala || filtroDia) ? ` · mostrando ${todas.length} con el filtro actual` : ''}.
        </p>

        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : vista === 'calendario' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <button className={btnSecCls} onClick={() => setSemanaOffset((s) => s - 1)}>← Semana anterior</button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-textSec">{formatFechaCorta(fechasSemana[0])} – {formatFechaCorta(fechasSemana[5])}</span>
                <button className={btnSecCls} onClick={() => setSemanaOffset(0)}>Hoy</button>
              </div>
              <button className={btnSecCls} onClick={() => setSemanaOffset((s) => s + 1)}>Semana siguiente →</button>
            </div>
            {horasSemana.length === 0 ? (
              <p className="text-textSec text-sm py-4">No hay actividades cargadas esta semana.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <th className="text-[11px] text-textSec uppercase px-1.5 py-2 border-b border-border text-center">Hora</th>
                      {fechasSemana.map((f, i) => (
                        <th key={f} className={`text-[11px] uppercase px-1.5 py-2 border-b border-border text-center ${f === hoyISO ? 'text-accentTeal' : 'text-text'}`}>
                          {DIAS_SEMANA[i].charAt(0) + DIAS_SEMANA[i].slice(1).toLowerCase()}
                          <div className="text-[10px] font-normal text-textMuted">{formatFechaCorta(f)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {horasSemana.map((h) => (
                      <tr key={h}>
                        <td className="border border-border align-top p-1 font-mono text-textSec text-xs whitespace-nowrap">{minutosAHora(h)}</td>
                        {fechasSemana.map((f) => {
                          const items = itemsSemana.filter((a) => a.fecha === f && a.horaMin === h);
                          return (
                            <td key={f} className="border border-border align-top p-1 min-w-[110px]">
                              {items.map((a, idx) => {
                                const idKey = a.id || `${a.fecha}-${a.horaMin}-${idx}`;
                                const enCurso = f === hoyISO && horaActualMin >= h - BUFFER_MIN && horaActualMin < h + (a.duracion || 90);
                                const conChoque = idsConChoque.has(a.id || `${a.fecha}-${a.horaMin}-${a.sala}`);
                                return (
                                  <div
                                    key={idKey}
                                    onClick={() => setSeleccionado(a)}
                                    className={`rounded-md px-2 py-1 text-[11px] font-semibold mb-1 cursor-pointer ${
                                      conChoque ? 'bg-dangerBg text-dangerText border border-dangerText/50'
                                      : a.tipo === 'Formación' ? 'bg-gradient-to-br from-accentPurple to-accentMagenta text-white'
                                      : 'bg-infoBg text-infoText'
                                    } ${enCurso ? 'ring-2 ring-accentTeal' : ''} ${a.pasada ? 'opacity-45' : ''}`}
                                  >
                                    {conChoque && '⚠ '}{a.tipo === 'Formación' ? `${a.curso} ${a.edicion || ''}` : a.tipo}
                                    <span className="block font-normal text-[10px] opacity-90">{a.sala || a.nombreCurso || ''}</span>
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
        ) : todas.length === 0 ? (
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
                  <tr key={i} onClick={() => setSeleccionado(a)} className={`border-b border-border cursor-pointer hover:bg-bg ${a.pasada ? 'opacity-45 line-through' : ''}`}>
                    <td className="p-1.5">{formatFechaCorta(a.fecha)}</td>
                    <td className="p-1.5">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        a.tipo === 'Formación' ? 'bg-successBg text-successText' : a.curso ? 'bg-infoBg text-infoText' : 'bg-surface2 text-textMuted'
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

      {seleccionado && <ModalDetalle item={seleccionado} onCerrar={() => setSeleccionado(null)} puedeEditar={puedeEditar} />}
    </div>
  );
}

function ModalDetalle({ item, onCerrar, puedeEditar }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">
          {item.tipo === 'Formación' ? `${item.curso} ${item.edicion || ''}` : item.tipo}
        </h3>
        <p className="text-textSec text-xs mb-4">{item.nombreCurso}</p>
        <div className="space-y-1.5 text-sm mb-4">
          <Fila label="Fecha" valor={formatFechaCorta(item.fecha)} />
          <Fila label="Horario" valor={item.horaMin != null ? minutosAHora(item.horaMin) : '—'} />
          <Fila label="Sala" valor={item.sala || '—'} />
          <Fila label="Docente" valor={item.docente || '—'} />
          <Fila label="Temática" valor={item.tematica || '—'} />
          <Fila label="Observaciones" valor={item.observaciones || '—'} />
        </div>
        {item.tipo === 'Formación' && puedeEditar && (
          <p className="text-xs text-textMuted mb-3">Para cambiar sala, postergar o cancelar esta clase, andá al módulo Salas Zoom.</p>
        )}
        <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
      </div>
    </div>
  );
}

function Fila({ label, valor }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-textMuted">{label}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}
