'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, TOTALES, NOMBRES, ICONOS,
  minutosAHora, formatFechaCorta, agruparParaVista
} from '../../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';
const tabCls = (activo) => `rounded-lg px-3.5 py-1.5 text-xs font-semibold border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const HORAS_OPCIONES = (() => {
  const out = [];
  for (let m = 8 * 60; m <= 22.5 * 60; m += 30) out.push(minutosAHora(m));
  return out;
})();

export default function SalasZoomPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [vista, setVista] = useState('grilla');
  const [diaSala, setDiaSala] = useState('LUNES');

  const [textoImportar, setTextoImportar] = useState('');
  const [msgImportar, setMsgImportar] = useState(null);
  const [accion, setAccion] = useState(null);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarDatos();
  }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, rf] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados')
      ]);
      const dc = await rc.json();
      const df = await rf.json();
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
    } finally {
      setCargandoDatos(false);
    }
  }

  const vistaAgrupada = useMemo(() => agruparParaVista(clases), [clases]);
  const diaHoy = DIAS_JS[new Date().getDay()];

  async function importar() {
    setMsgImportar(null);
    const res = await fetchAutenticado('/api/clases/importar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: textoImportar })
    });
    const data = await res.json();
    if (!res.ok) { setMsgImportar({ tipo: 'error', texto: data.error }); return; }
    setMsgImportar({ tipo: 'ok', texto: `Se agregaron ${data.agregadas} clase(s).${data.errores.length ? ' ' + data.errores.length + ' línea(s) con error.' : ''}` });
    setTextoImportar('');
    cargarDatos();
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">🎥 Salas Zoom</h1>
      <p className="text-textSec text-sm mb-5">
        Horario semanal de las 8 salas — cargar, ver disponibilidad, y reservar.
        {!puedeEditar && ' Tu rol (Colaborador) solo puede ver, no puede cargar ni reservar.'}
      </p>

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-2">1. Cargar horario</h2>
          <p className="text-xs text-textSec mb-2.5">Formato: <b>DÍA HH:MM CÓDIGO NÚMERO Sala N</b> — una clase por línea.</p>
          <textarea
            value={textoImportar} onChange={(e) => setTextoImportar(e.target.value)}
            placeholder={'LUNES 18:00 CDEP 15 Sala 3\nMARTES 10:00 CEQUI 14 Sala 2'}
            className={`${inputCls} min-h-[110px] font-mono text-xs resize-y`}
          />
          <div className="mt-2.5">
            <button className={btnCls} onClick={importar}>Importar</button>
          </div>
          {msgImportar && (
            <p className={`text-xs mt-2 ${msgImportar.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msgImportar.texto}</p>
          )}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">2. Ver horario</h2>
        <div className="flex gap-2 mb-4">
          <button className={tabCls(vista === 'grilla')} onClick={() => setVista('grilla')}>Grilla semanal</button>
          <button className={tabCls(vista === 'porSala')} onClick={() => setVista('porSala')}>Vista por sala</button>
          <button className={tabCls(vista === 'estado')} onClick={() => setVista('estado')}>Estado ahora</button>
        </div>

        {cargandoDatos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : vista === 'grilla' ? (
          <VistaGrilla vista={vistaAgrupada} diaHoy={diaHoy} onClick={puedeEditar ? (c) => setAccion({ clase: c }) : null} />
        ) : vista === 'porSala' ? (
          <VistaPorSala vista={vistaAgrupada} diaSala={diaSala} setDiaSala={setDiaSala} />
        ) : (
          <VistaEstado vista={vistaAgrupada} diaHoy={diaHoy} />
        )}
      </div>

      {puedeEditar && (
        <PanelReservar fetchAutenticado={fetchAutenticado} onReservado={cargarDatos} />
      )}

      {accion && (
        <ModalAccion clase={accion.clase} onCerrar={() => setAccion(null)} fetchAutenticado={fetchAutenticado} onCambio={cargarDatos} />
      )}
    </div>
  );
}

function VistaGrilla({ vista, diaHoy, onClick }) {
  const horas = [...new Set(vista.map((c) => c.horaMin))].sort((a, b) => a - b);
  const diasUsados = DIAS.filter((d) => vista.some((c) => c.dia === d));
  if (horas.length === 0) return <p className="text-textSec text-sm">No hay clases cargadas.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="text-[11.5px] text-textSec uppercase px-1.5 py-2 border-b border-border text-center">Hora</th>
            {diasUsados.map((d) => (
              <th key={d} className={`text-[11.5px] uppercase px-1.5 py-2 border-b border-border text-center ${d === diaHoy ? 'text-accentTeal' : 'text-text'}`}>
                {d}{d === diaHoy ? ' · hoy' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((h) => (
            <tr key={h}>
              <td className="border border-border align-top p-1 font-mono text-textSec whitespace-nowrap">{minutosAHora(h)}</td>
              {diasUsados.map((d) => {
                const items = vista.filter((c) => c.dia === d && c.horaMin === h);
                return (
                  <td key={d} className="border border-border align-top p-1 min-w-[100px]">
                    {items.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onClick && onClick(c)}
                        className={`bg-gradient-to-br from-accentPurple to-accentMagenta rounded-md px-2 py-1 text-[11.5px] font-bold text-white mb-1 ${onClick ? 'cursor-pointer' : ''} ${c.pasada ? 'opacity-45 line-through' : ''}`}
                      >
                        {ICONOS[c.codigo] || ''} {c.label}
                        <span className="block font-medium text-[10px] opacity-85">{c.sala}</span>
                        {c.numero && (
                          <span className="block font-medium text-[9.5px] opacity-80">
                            Clase {c.serieTotal > 1 ? c.serieIndex : c.numero}{TOTALES[c.codigo] ? ' de ' + TOTALES[c.codigo] : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VistaPorSala({ vista, diaSala, setDiaSala }) {
  const diasUsados = DIAS.filter((d) => vista.some((c) => c.dia === d));
  const DIA_MIN = 9 * 60, DIA_MAX = 22.5 * 60, span = DIA_MAX - DIA_MIN;

  return (
    <div>
      <div className="mb-3.5">
        <label className={labelCls}>Día</label>
        <select value={diaSala} onChange={(e) => setDiaSala(e.target.value)} className={`${inputCls} w-52`}>
          {(diasUsados.length ? diasUsados : DIAS).map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      {SALAS.map((sala) => {
        const ocupaciones = vista.filter((c) => c.dia === diaSala && c.sala === sala);
        return (
          <div key={sala} className="grid grid-cols-[110px_1fr] gap-2.5 items-center mb-2">
            <div className="text-xs font-semibold">{sala}</div>
            <div className="relative h-[30px] bg-bg border border-border rounded-md">
              {ocupaciones.map((c) => {
                const inicio = c.horaMin - BUFFER_MIN, fin = c.horaMin + c.duracion;
                const left = Math.max(0, (inicio - DIA_MIN) / span * 100);
                const width = Math.min(100 - left, (fin - inicio) / span * 100);
                return (
                  <div
                    key={c.id} title={`${c.label} — abre ${minutosAHora(inicio)}`}
                    className={`absolute top-0.5 bottom-0.5 rounded text-white text-[10.5px] font-bold flex items-center px-1.5 overflow-hidden ${c.pasada ? 'bg-textMuted' : 'bg-gradient-to-r from-accentPurple to-accentMagenta'}`}
                    style={{ left: left + '%', width: width + '%' }}
                  >
                    {c.label}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VistaEstado({ vista, diaHoy }) {
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-textSec mb-1">Hoy {diaHoy.toLowerCase()}, {minutosAHora(horaActual)} hs.</p>
      {SALAS.map((sala) => {
        const ocupHoy = vista.filter((c) => c.dia === diaHoy && c.sala === sala)
          .map((c) => ({ ...c, inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }))
          .sort((a, b) => a.inicio - b.inicio);
        const actual = ocupHoy.find((o) => horaActual >= o.inicio && horaActual < o.fin);
        const proxima = ocupHoy.find((o) => o.inicio > horaActual);
        return (
          <div key={sala} className={`rounded-lg px-3.5 py-2.5 border ${actual ? 'bg-dangerBg border-dangerText/30' : 'bg-successBg border-successText/25'}`}>
            <div className="font-bold text-sm">{sala}</div>
            <div className="text-xs text-textSec">
              {actual
                ? `Ocupada por ${actual.label} — se desocupa a las ${minutosAHora(actual.fin)}`
                : proxima
                  ? `Libre ahora — próxima clase hoy a las ${minutosAHora(proxima.horaMin)}`
                  : 'Libre el resto del día'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PanelReservar({ fetchAutenticado, onReservado }) {
  const [fecha, setFecha] = useState('');
  const [horaTxt, setHoraTxt] = useState('18:00');
  const [codigo, setCodigo] = useState('CO');
  const [edicion, setEdicion] = useState('1');
  const [numero, setNumero] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [msg, setMsg] = useState(null);

  async function consultar() {
    setMsg(null); setResultado(null);
    if (!fecha) { setMsg({ tipo: 'error', texto: 'Elegí la fecha.' }); return; }
    const res = await fetchAutenticado('/api/clases/reservar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, horaTxt, codigo, edicion, numero, cantidad })
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setResultado(data);
  }

  async function reservarEn(sala) {
    const res = await fetchAutenticado('/api/clases/reservar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, horaTxt, codigo, edicion, numero, cantidad, sala })
    });
    const data = await res.json();
    if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
    setMsg({ tipo: 'ok', texto: `Reservado en ${sala} (${data.agregadas} clase(s)).${data.corridas?.length ? ' Se corrieron por feriado: ' + data.corridas.join('; ') : ''}` });
    setResultado(null);
    onReservado();
  }

  return (
    <div className={boxCls}>
      <h2 className="text-sm font-semibold mb-3">3. Buscar disponibilidad / Reservar</h2>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
        <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Hora</label>
          <select value={horaTxt} onChange={(e) => setHoraTxt(e.target.value)} className={inputCls}>
            {HORAS_OPCIONES.map((h) => <option key={h}>{h}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Curso</label>
          <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className={inputCls}>
            {Object.keys(NOMBRES).filter((c) => c !== 'O').map((c) => <option key={c} value={c}>{ICONOS[c]} {c} — {NOMBRES[c]}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>Edición</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Número (1ª clase)</label><input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="ej: 1" className={inputCls} /></div>
        <div><label className={labelCls}>Cantidad</label><input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)} className={inputCls} /></div>
      </div>
      <button className={btnCls} onClick={consultar}>Buscar disponibilidad</button>
      {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}

      {resultado && (
        <div className="mt-3.5">
          <div className={`px-3.5 py-2.5 rounded-lg mb-3 font-semibold text-sm ${resultado.libres.length ? 'bg-successBg text-successText' : 'bg-dangerBg text-dangerText'}`}>
            {resultado.libres.length ? `Sí hay lugar — ${resultado.libres.length} sala(s) libre(s)` : 'No hay lugar — las 8 salas están ocupadas'}
          </div>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))' }}>
            {SALAS.map((s) => {
              const ocupada = resultado.ocupadas.find((o) => o.sala === s);
              return (
                <div key={s} className={`bg-bg border border-border rounded-lg p-3 ${ocupada ? 'opacity-70' : ''}`}>
                  <div className="font-semibold text-sm">● {s}</div>
                  <div className="text-[11.5px] text-textSec mb-2">
                    {ocupada ? `Ocupada por ${ocupada.label} (libera ${minutosAHora(ocupada.libera)})` : 'Libre en ese horario'}
                  </div>
                  <button disabled={!!ocupada} className={`${btnCls} w-full`} onClick={() => reservarEn(s)}>
                    {ocupada ? 'Ocupada' : 'Reservar acá'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const MOTIVOS = [
  { id: 'salud', label: '🩺 Problemas de salud del docente' },
  { id: 'conectividad', label: '🌐 Problemas de conectividad' },
  { id: 'ausencia', label: '🎓 Ausencia de estudiantes' },
  { id: 'evento', label: '🏟️ Evento institucional' },
  { id: 'feriado_extra', label: '📅 Feriado extraordinario' },
  { id: 'otro', label: '✏️ Otro' }
];

function ModalAccion({ clase, onCerrar, fetchAutenticado, onCambio }) {
  const [paso, setPaso] = useState('menu');
  const [nuevaSala, setNuevaSala] = useState('');
  const [motivoId, setMotivoId] = useState('salud');
  const [obs, setObs] = useState('');
  const [err, setErr] = useState('');

  async function cambiarSala() {
    setErr('');
    const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevaSala })
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error); return; }
    onCambio(); onCerrar();
  }
  async function cancelar() {
    const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setErr(data.error); return; }
    onCambio(); onCerrar();
  }
  async function postergar() {
    const res = await fetchAutenticado('/api/clases/postergar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clase.id, motivoId, observaciones: obs })
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error); return; }
    onCambio(); onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="mt-0 mb-1 text-base font-semibold">{clase.label}{clase.edicion ? ' · Edición ' + clase.edicion : ''}</h3>
        <p className="text-textSec text-xs mb-3.5">
          {clase.dia} {minutosAHora(clase.horaMin)} · {clase.sala}{clase.fecha ? ' · ' + formatFechaCorta(clase.fecha) : ''}
        </p>
        {err && <p className="text-dangerText text-xs mb-2.5">{err}</p>}

        {paso === 'menu' && (
          <div className="flex flex-col gap-2">
            <button className={`${btnSecCls} text-left`} onClick={() => setPaso('sala')}>🔁 Cambiar sala</button>
            <button className={`${btnSecCls} text-left disabled:opacity-40`} disabled={!clase.fecha} onClick={() => setPaso('postergar')}>
              ⏰ Postergar clase{!clase.fecha ? ' (necesita fecha)' : ''}
            </button>
            <button className={`${btnSecCls} text-left text-dangerText`} onClick={() => setPaso('cancelar')}>🗑️ Cancelar clase</button>
            <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
          </div>
        )}

        {paso === 'sala' && (
          <div>
            <label className={labelCls}>Nueva sala</label>
            <select value={nuevaSala} onChange={(e) => setNuevaSala(e.target.value)} className={`${inputCls} mb-3`}>
              <option value="">Elegí una sala</option>
              {SALAS.filter((s) => s !== clase.sala).map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className={btnCls} disabled={!nuevaSala} onClick={cambiarSala}>Cambiar</button>
            </div>
          </div>
        )}

        {paso === 'cancelar' && (
          <div>
            <p className="text-sm mb-3">¿Seguro que querés cancelar esta clase? No se puede deshacer.</p>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className="bg-dangerText text-white rounded-lg px-4 py-2 text-sm font-semibold" onClick={cancelar}>Sí, cancelar</button>
            </div>
          </div>
        )}

        {paso === 'postergar' && (
          <div>
            <label className={labelCls}>Motivo</label>
            <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} className={`${inputCls} mb-2.5`}>
              {MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <label className={labelCls}>Observaciones (opcional)</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)} className={`${inputCls} mb-3`} />
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className={btnCls} onClick={postergar}>Postergar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
