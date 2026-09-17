'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../lib/useSession';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, ICONOS, NOMBRES, TOTALES,
  minutosAHora, formatFechaCorta, agruparParaVista, calcularAlertas, calcularFormaciones, colorFormacion, ESTADOS, calcularEdicionesFinalizadas,
  calcularNumeroSesion, toISO
} from '../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../lib/cronogramaHistorico';
import { CREDENCIALES_ZOOM_DEFAULT } from '../lib/credencialesZoomDefaults';

const cardCls = 'bg-surface2 border border-border rounded-xl p-4';
const sectionCls = 'bg-surface2 border border-border rounded-xl p-5 mb-4';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

/** Lunes y domingo (ISO) de la semana que contiene `fechaBase`. */
function rangoSemana(fechaBase) {
  const d = new Date(fechaBase);
  const diaSemana = d.getDay(); // 0=domingo..6=sábado
  const diffALunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() + diffALunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { inicio: toISO(lunes), fin: toISO(domingo) };
}

function diaCapitalizado(dia) {
  if (!dia) return '';
  return dia.charAt(0) + dia.slice(1).toLowerCase();
}

export default function InicioPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarTodo();
  }, [usuario]);

  async function cargarTodo() {
    setCargandoDatos(true);
    try {
      const [rc, rf, ra, rp] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/actividades'),
        fetchAutenticado('/api/postergaciones')
      ]);
      const [dc, df, da, dp] = await Promise.all([rc.json(), rf.json(), ra.json(), rp.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (ra.ok) setActividades(da.actividades);
      if (rp.ok) setPostergaciones(dp.postergaciones);
    } finally {
      setCargandoDatos(false);
    }
  }

  const vista = useMemo(() => agruparParaVista(clases), [clases]);
  const alertas = useMemo(() => calcularAlertas(clases, feriados), [clases, feriados]);
  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  const ahora = new Date();
  const diaHoy = DIAS_JS[ahora.getDay()];
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyISO = ahora.toISOString().slice(0, 10);

  let ocupadasAhora = 0;
  SALAS.forEach((sala) => {
    const ocupHoy = vista.filter((c) => c.dia === diaHoy && c.sala === sala)
      .map((c) => ({ inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }));
    if (ocupHoy.some((o) => horaActual >= o.inicio && horaActual < o.fin)) ocupadasAhora++;
  });
  const libresAhora = SALAS.length - ocupadasAhora;

  // Se calcula una sola vez (no depende de nada que cambie) — mismas ediciones que
  // Formaciones ya detecta como "Finalizó" a partir del histórico real, para que las dos
  // pantallas digan lo mismo y una clase de un curso ya terminado no siga apareciendo acá.
  const edicionesFinalizadas = useMemo(() => calcularEdicionesFinalizadas(CRONOGRAMA_HISTORICO), []);

  const actividadesTodas = useMemo(() => {
    function toISO(d) {
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    // Para una clase del horario recurrente (sin fecha puntual), calcula la próxima fecha
    // real en la que cae según su día de la semana — hoy si coincide, si no el próximo.
    function proximaFechaParaDia(diaClase) {
      const idxObjetivo = DIAS_JS.indexOf(diaClase);
      if (idxObjetivo === -1) return null;
      const idxHoy = ahora.getDay();
      let diff = idxObjetivo - idxHoy;
      if (diff < 0) diff += 7;
      const d = new Date(ahora);
      d.setDate(ahora.getDate() + diff);
      return toISO(d);
    }

    const noFinalizada = (c) => !edicionesFinalizadas.has(`${c.codigo}|${c.numero}`);
    // El campo Numero de la clase identifica la EDICIÓN (ej: "CO 51"), no qué sesión
    // semanal es dentro de ella — calcularNumeroSesion cuenta la posición real entre las
    // clases con fecha de esa misma edición (mismo criterio que ya usa Cronograma), para
    // no mostrar "Clase 51 de 48" para la edición 51.
    const sesionPorId = calcularNumeroSesion(clases);

    // OJO: el campo Edicion de la clase quedó pisado en "1" desde que se armó el Sheet —
    // el número de edición real que el staff sí actualiza es el campo Numero (mismo
    // criterio ya usado en Cronograma). Por eso acá edicion se toma de c.numero.
    const deClasesConFecha = clases.filter((c) => c.fecha && noFinalizada(c)).map((c) => ({
      id: c.id, fecha: c.fecha, dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.numero, numeroSesion: sesionPorId[c.id] || null, total: TOTALES[c.codigo] || null,
      horaMin: c.horaMin, sala: c.sala, esFormacion: true,
      docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
    }));
    // Clases del horario recurrente (Grilla de Salas Zoom, sin fecha puntual todavía):
    // se muestran igual, proyectadas a su próxima fecha real según el día que les toca.
    const deClasesRecurrentes = clases.filter((c) => !c.fecha && c.dia && noFinalizada(c)).map((c) => ({
      id: c.id, fecha: proximaFechaParaDia(c.dia), dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.numero, numeroSesion: null, total: TOTALES[c.codigo] || null,
      horaMin: c.horaMin, sala: c.sala, esFormacion: true,
      docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
    })).filter((c) => c.fecha);
    // Mismo criterio que en Cronograma: las Formación históricas se excluyen acá,
    // porque ya están representadas (con sala real) en deClases.
    const deOtras = actividades.filter((a) => a.fecha && a.tipo !== 'Formación').map((a) => ({
      id: a.id, fecha: a.fecha, dia: a.dia, curso: '', nombreCurso: a.nombreCurso || a.tipo, tipo: a.tipo,
      edicion: '', numero: '', horaMin: a.horaMin, sala: a.sala || '', esFormacion: false,
      docente: a.docente || '', tematica: a.tematica || '', observaciones: a.observaciones || ''
    }));
    return deClasesConFecha.concat(deClasesRecurrentes, deOtras).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  }, [clases, actividades, edicionesFinalizadas]);

  const agendaHoy = actividadesTodas.filter((a) => a.fecha === hoyISO).sort((a, b) => (a.horaMin || 0) - (b.horaMin || 0));
  const proximas = actividadesTodas
    .filter((a) => a.fecha > hoyISO || (a.fecha === hoyISO && a.horaMin != null && a.horaMin > horaActual))
    .slice(0, 20);

  // Ediciones cuya última clase (Nº total) cae dentro de la semana actual (lunes a domingo).
  const { inicio: inicioSemana, fin: finSemana } = rangoSemana(ahora);
  const sesionPorIdSemana = calcularNumeroSesion(clases);
  const formacionesFinalizanSemana = clases
    .filter((c) => c.fecha && c.fecha >= inicioSemana && c.fecha <= finSemana)
    .filter((c) => TOTALES[c.codigo] && sesionPorIdSemana[c.id] === TOTALES[c.codigo])
    .map((c) => ({
      codigo: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo, edicion: c.numero,
      total: TOTALES[c.codigo], fecha: c.fecha, dia: c.dia, horaMin: c.horaMin, sala: c.sala
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  const proximaClase = agendaHoy.find((a) => a.horaMin > horaActual) || proximas[0] || null;
  const formacionesEnCurso = formaciones.filter((f) => f.estado === 'En proceso').length;
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-16">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">HOY</h1>
        <p className="text-textSec text-sm mt-0.5">
          {agendaHoy.length} clase{agendaHoy.length !== 1 ? 's' : ''} · {ocupadasAhora} sala{ocupadasAhora !== 1 ? 's' : ''} ocupada{ocupadasAhora !== 1 ? 's' : ''} · {libresAhora} disponible{libresAhora !== 1 ? 's' : ''}
        </p>
      </div>

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <>
          <div data-tour="inicio-panel" className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <Metrica valor={agendaHoy.length} label="Clases hoy" />
            <Metrica
              valor={proximaClase ? minutosAHora(proximaClase.horaMin) : '—'}
              label={proximaClase ? `Próxima: ${proximaClase.nombreCurso}` : 'Próxima clase'}
              chico
            />
            <Metrica valor={`${ocupadasAhora}/${SALAS.length}`} label="Salas ocupadas" acento={ocupadasAhora > 0 ? 'warning' : undefined} />
            <Metrica valor={libresAhora} label="Salas disponibles" acento="success" />
            <Metrica valor={alertas.length} label="Incidencias activas" acento={alertas.length > 0 ? 'danger' : undefined} />
            <Metrica valor={formacionesEnCurso} label="Formaciones activas" />
          </div>

          <div data-tour="agenda-hoy" className={sectionCls}>
            <h2 className="text-sm font-semibold mb-1">Agenda de hoy</h2>
            <p className="text-xs text-textMuted mb-3">{formatFechaCorta(hoyISO)}</p>
            {agendaHoy.length === 0 ? (
              <p className="text-textSec text-sm py-2">Sin actividades cargadas para hoy.</p>
            ) : (
              <div data-tour="tarjetas-clases" className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {agendaHoy.map((a, i) => {
                  const enCurso = a.horaMin != null && horaActual >= a.horaMin - BUFFER_MIN && horaActual < a.horaMin + 90;
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  return (
                    <button key={i} onClick={() => setSeleccionado(a)}
                      className={`text-left border-l-4 ${color ? color.border : 'border-infoText/40'} border-t border-r border-b border-border rounded-lg p-3 transition-colors hover:border-accentTeal/60 hover:bg-bg/40`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-textSec">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {enCurso && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADOS.enCurso.bg} ${ESTADOS.enCurso.text}`}>
                            {ESTADOS.enCurso.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {color && <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />}
                        <span className={`text-sm font-medium truncate ${color ? color.text : ''}`}>{ICONOS[a.curso] || ''} {a.nombreCurso}</span>
                      </div>
                      {a.esFormacion && a.edicion && (
                        <p className="text-xs text-textMuted">
                          <span className="text-textSec font-semibold">Curso:</span> {a.curso}
                          <span className="mx-1.5">·</span>
                          <span className="text-textSec font-semibold">Edición:</span> {a.edicion}
                        </p>
                      )}
                      {a.esFormacion && a.numeroSesion && a.total && (
                        <p className="text-xs text-textMuted">Clase {a.numeroSesion} de {a.total}</p>
                      )}
                      {a.sala && <p className="text-xs text-textMuted">{a.sala}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {formacionesFinalizanSemana.length > 0 && (
            <div className={sectionCls}>
              <h2 className="text-sm font-semibold mb-1">Formaciones que finalizan esta semana</h2>
              <p className="text-xs text-textMuted mb-3">{formatFechaCorta(inicioSemana)} al {formatFechaCorta(finSemana)}</p>
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {formacionesFinalizanSemana.map((f, i) => {
                  const color = colorFormacion(f.codigo);
                  return (
                    <div key={i} className={`border-l-4 ${color ? color.border : 'border-infoText/40'} border-t border-r border-b border-border rounded-lg p-3`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {color && <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />}
                        <span className={`text-sm font-medium truncate ${color ? color.text : ''}`}>{ICONOS[f.codigo] || ''} {f.nombreCurso}</span>
                      </div>
                      <p className="text-xs text-textMuted">
                        <span className="text-textSec font-semibold">Edición:</span> {f.edicion}
                      </p>
                      <p className="text-xs text-textMuted">Clase {f.total} de {f.total}</p>
                      <p className="text-xs text-textMuted">{diaCapitalizado(f.dia)} {formatFechaCorta(f.fecha)} · {f.horaMin != null ? minutosAHora(f.horaMin) : '—'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-2">Alertas activas</h2>
            {alertas.length === 0 ? (
              <p className="text-textSec text-sm py-1">Sin conflictos detectados por ahora.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {alertas.map((a, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 text-xs font-medium ${a.tipo === 'warn' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'}`}>
                    {a.texto}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-2">Próximas clases</h2>
            {proximas.length === 0 ? (
              <p className="text-textSec text-sm py-1">No hay próximas actividades cargadas.</p>
            ) : (
              <div className="grid gap-x-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))' }}>
                {proximas.map((a, i) => {
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  return (
                    <button key={i} onClick={() => setSeleccionado(a)}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-border/60 last:border-0 text-left w-full hover:bg-bg/40 rounded-md px-1 -mx-1 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] text-textMuted w-[72px] shrink-0">{formatFechaCorta(a.fecha)}</span>
                        <span className="font-mono text-[11px] text-textSec w-9 shrink-0">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />}
                        <span className={`text-xs truncate ${color ? color.text : ''}`}>
                          {a.nombreCurso}
                          {a.esFormacion && a.edicion ? ` · Ed. ${a.edicion}` : ''}
                          {a.esFormacion && a.numeroSesion && a.total ? ` · Clase ${a.numeroSesion} de ${a.total}` : ''}
                        </span>
                      </div>
                      {a.sala && <span className="text-[11px] text-textMuted shrink-0">{a.sala}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      {seleccionado && <ModalDetalleInicio item={seleccionado} onCerrar={() => setSeleccionado(null)} puedeEditar={puedeEditar} />}
    </div>
  );
}

function ModalDetalleInicio({ item, onCerrar, puedeEditar }) {
  const idReunion = CREDENCIALES_ZOOM_DEFAULT.find((c) => c.sala === item.sala)?.idReunion;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">
          {item.esFormacion ? `${item.curso} ${item.edicion || ''}` : item.tipo}
        </h3>
        <p className="text-textSec text-xs mb-4">{item.nombreCurso}</p>
        <div className="space-y-1.5 text-sm mb-4">
          <Fila label="Fecha" valor={formatFechaCorta(item.fecha)} />
          <Fila label="Horario" valor={item.horaMin != null ? minutosAHora(item.horaMin) : '—'} />
          <Fila
            label="Sala"
            valor={item.sala ? <Link href="/credenciales-zoom" className="text-infoText underline">{item.sala}</Link> : '—'}
          />
          {idReunion && <Fila label="ID de reunión" valor={idReunion} />}
          {item.esFormacion && item.numeroSesion && item.total && (
            <Fila label="Clase" valor={`${item.numeroSesion} de ${item.total}`} />
          )}
          <Fila label="Docente" valor={item.docente || '—'} />
          {item.esFormacion && <Fila label="Staff" valor={item.staff || '—'} />}
          {!item.esFormacion && <Fila label="Temática" valor={item.tematica || '—'} />}
          <Fila label="Observaciones" valor={item.observaciones || '—'} />
        </div>
        {puedeEditar && (
          <div className="flex flex-col gap-2 mb-3">
            {item.esFormacion && (
              <Link
                href="/salas-zoom" onClick={onCerrar} style={{ textDecoration: 'none' }}
                className={`${btnSecCls} text-center`}
              >
                🔁 Cambiar sala, postergar o cancelar esta clase →
              </Link>
            )}
            <Link
              href="/salas-zoom" onClick={onCerrar} style={{ textDecoration: 'none' }}
              className={`${btnCls} text-center`}
            >
              + Agregar actividad →
            </Link>
          </div>
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

function Metrica({ valor, label, acento, chico }) {
  const color = {
    success: 'text-successText', warning: 'text-warningText', danger: 'text-dangerText'
  }[acento] || 'text-text';
  return (
    <div className={cardCls}>
      <div className={`${chico ? 'text-lg' : 'text-2xl'} font-bold ${color}`}>{valor}</div>
      <div className="text-[11px] text-textSec mt-0.5 truncate">{label}</div>
    </div>
  );
}
