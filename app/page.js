'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../lib/useSession';
import { tienePermisoEditarCronograma } from '../lib/permisos';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, ICONOS, NOMBRES, TOTALES,
  minutosAHora, formatFechaCorta, calcularAlertas, calcularFormaciones, colorFormacion, colorPorSala, calcularEdicionesFinalizadas,
  calcularNumeroSesion, toISO, buscarPeriodoCO
} from '../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../lib/cronogramaHistorico';
import { CREDENCIALES_ZOOM_DEFAULT } from '../lib/credencialesZoomDefaults';
import { DOCENTES_CO_DEFAULT } from '../lib/docentesCODefaults';

const cardCls = 'bg-surface2 border border-border rounded-xl p-4';
const sectionCls = 'bg-surface2 border border-border rounded-xl p-5 mb-4';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

// buscarPeriodoCO (Para Coaching Ontológico, el docente/staff no vive en la clase en sí —
// se carga aparte, por período, en Docentes C.O.) ahora vive en lib/salasLogic.js para
// poder reusarla también desde /incidencias.

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

// Estado de una clase puntual respecto de la hora actual, para el cartel de la tarjeta en
// "Agenda de hoy" — siempre da un estado, para que ninguna tarjeta quede sin cartel:
// "proximamente" antes de que arranque (con un aviso extra en los últimos 30'), "en-vivo"
// mientras dura, "finalizando" en los últimos 15' antes de terminar, y "finalizada" una vez
// que ya terminó.
function estadoDeAgenda(horaMin, duracion) {
  if (horaMin == null) return null;
  const ahora = new Date();
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const inicio = horaMin, fin = horaMin + (duracion || 90);
  if (minAhora >= fin) return 'finalizada';
  if (minAhora >= fin - 15 && minAhora < fin) return 'finalizando';
  if (minAhora >= inicio && minAhora < fin) return 'en-vivo';
  return 'proximamente';
}

export default function InicioPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [docentesCO, setDocentesCO] = useState([]);
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
      const [rc, rf, ra, rp, rd] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/actividades'),
        fetchAutenticado('/api/postergaciones'),
        fetchAutenticado('/api/docentes-co')
      ]);
      const [dc, df, da, dp, dd] = await Promise.all([rc.json(), rf.json(), ra.json(), rp.json(), rd.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (ra.ok) setActividades(da.actividades);
      if (rp.ok) setPostergaciones(dp.postergaciones);
      if (rd.ok) setDocentesCO(dd.asignaciones);
    } finally {
      setCargandoDatos(false);
    }
  }

  // Mismo criterio que la pantalla Docentes C.O.: los períodos fijos del código quedan
  // disponibles siempre, y si el Sheet ya tiene cargado ese mismo período (edición+desde)
  // con cambios, el del Sheet pisa al fijo.
  const asignacionesCODisponibles = useMemo(() => {
    const clavesSheet = new Set(docentesCO.map((a) => `${a.edicion}|${a.desde}`));
    const fijos = DOCENTES_CO_DEFAULT.filter((a) => !clavesSheet.has(`${a.edicion}|${a.desde}`));
    return [...fijos, ...docentesCO];
  }, [docentesCO]);
  const alertasConflictos = useMemo(() => calcularAlertas(clases, feriados), [clases, feriados]);
  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);
  // Avisa cuando a una edición en curso le quedan exactamente 2 clases para terminar —
  // así el equipo puede empezar a coordinar el cierre (certificación, próxima edición, etc.)
  // con un poco de anticipación en vez de enterarse el día de la última clase.
  const alertasPorFinalizar = useMemo(() => (
    formaciones
      .filter((f) => f.estado === 'En proceso' && f.total && f.total - f.cargadas === 2)
      .map((f) => ({
        tipo: 'aviso',
        texto: `Finaliza en breve: ${NOMBRES[f.codigo] || f.codigo} edición ${f.numero} — va por la clase ${f.cargadas} de ${f.total}.`
      }))
  ), [formaciones]);
  // Avisa cuando a una edición todavía sin ninguna clase dictada (cargadas === 0) le quedan
  // 15 días o menos para su primera clase — para poder ir coordinando antes de que arranque.
  const alertasPorComenzar = useMemo(() => {
    const hoyDia = new Date(); hoyDia.setHours(0, 0, 0, 0);
    return formaciones
      .filter((f) => f.fechaInicio && f.cargadas === 0)
      .map((f) => {
        const diasFaltan = Math.round((new Date(f.fechaInicio + 'T00:00:00') - hoyDia) / 86400000);
        return { f, diasFaltan };
      })
      .filter(({ diasFaltan }) => diasFaltan >= 0 && diasFaltan <= 15)
      .map(({ f, diasFaltan }) => ({
        tipo: 'aviso',
        texto: diasFaltan === 0
          ? `Hoy comienza: ${NOMBRES[f.codigo] || f.codigo} edición ${f.numero} (${formatFechaCorta(f.fechaInicio)}).`
          : `En ${diasFaltan} día${diasFaltan === 1 ? '' : 's'} comienza: ${NOMBRES[f.codigo] || f.codigo} edición ${f.numero} (${formatFechaCorta(f.fechaInicio)}).`
      }));
  }, [formaciones]);
  const alertas = useMemo(
    () => [...alertasConflictos, ...alertasPorFinalizar, ...alertasPorComenzar],
    [alertasConflictos, alertasPorFinalizar, alertasPorComenzar]
  );

  // Clases reservadas "sin sala" desde Salas Zoom (para no perder el lugar en el cronograma
  // cuando en el momento no había ninguna libre, o simplemente se decidió elegirla después) —
  // quedan acá hasta que alguien con permiso les asigna una sala de verdad.
  const pendientesSala = useMemo(
    () => clases.filter((c) => c.pendienteSala).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')),
    [clases]
  );
  const puedeAsignarSala = tienePermisoEditarCronograma(usuario);

  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyISO = ahora.toISOString().slice(0, 10);

  // OJO: antes esto miraba "vista" (agrupado por día de la semana + hora + sala, sin
  // importar la fecha puntual) — como agruparParaVista colapsa toda una serie recurrente en
  // UNA fila representativa, terminaba marcando una sala "ocupada" solo porque hoy es el
  // mismo día de la semana que esa serie, sin chequear si la clase de HOY puntual ya pasó
  // (Diego reportó salas marcadas ocupadas con las clases de hoy ya finalizadas). Ahora se
  // mira directamente la clase real con fecha de HOY en esa sala.
  let ocupadasAhora = 0;
  SALAS.forEach((sala) => {
    const ocupHoy = clases.filter((c) => c.fecha === hoyISO && c.sala === sala)
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
      horaMin: c.horaMin, duracion: c.duracion, sala: c.sala, esFormacion: true,
      docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
    }));
    // Clases del horario recurrente (Grilla de Salas Zoom, sin fecha puntual todavía):
    // se muestran igual, proyectadas a su próxima fecha real según el día que les toca.
    const deClasesRecurrentes = clases.filter((c) => !c.fecha && c.dia && noFinalizada(c)).map((c) => ({
      id: c.id, fecha: proximaFechaParaDia(c.dia), dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.numero, numeroSesion: null, total: TOTALES[c.codigo] || null,
      horaMin: c.horaMin, duracion: c.duracion, sala: c.sala, esFormacion: true,
      docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
    })).filter((c) => c.fecha);
    // Mismo criterio que en Cronograma: las Formación históricas se excluyen acá,
    // porque ya están representadas (con sala real) en deClases.
    const deOtras = actividades.filter((a) => a.fecha && a.tipo !== 'Formación').map((a) => ({
      id: a.id, fecha: a.fecha, dia: a.dia, curso: '', nombreCurso: a.nombreCurso || a.tipo, tipo: a.tipo,
      edicion: '', numero: '', horaMin: a.horaMin, duracion: 90, sala: a.sala || '', esFormacion: false,
      docente: a.docente || '', staff: '', tematica: a.tematica || '', observaciones: a.observaciones || ''
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
            <Metrica valor={alertasConflictos.length} label="Incidencias activas" acento={alertasConflictos.length > 0 ? 'danger' : undefined} />
            <Metrica valor={formacionesEnCurso} label="Formaciones activas" />
          </div>

          {pendientesSala.length > 0 && (
            <TarjetaPendientesSala
              pendientes={pendientesSala}
              puedeAsignar={puedeAsignarSala}
              fetchAutenticado={fetchAutenticado}
              onAsignado={cargarTodo}
            />
          )}

          <div data-tour="agenda-hoy" className={sectionCls}>
            <h2 className="text-sm font-semibold mb-1">Agenda de hoy</h2>
            <p className="text-xs text-textMuted mb-3">{formatFechaCorta(hoyISO)}</p>
            {agendaHoy.length === 0 ? (
              <p className="text-textSec text-sm py-2">Sin actividades cargadas para hoy.</p>
            ) : (
              <div data-tour="tarjetas-clases" className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {agendaHoy.map((a, i) => {
                  const estadoAgenda = estadoDeAgenda(a.horaMin, a.duracion);
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  return (
                    <button key={i} onClick={() => setSeleccionado(a)}
                      className={`text-left border-l-4 ${color ? color.border : 'border-infoText/40'} border-t border-r border-b border-border rounded-lg p-3 transition-colors hover:border-accentTeal/60 hover:bg-bg/40`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-textSec">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {estadoAgenda === 'en-vivo' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 en-vivo-badge">🔴 EN VIVO</span>
                        )}
                        {estadoAgenda === 'proximamente' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 proximamente-badge">🕐 PRÓXIMAMENTE</span>
                        )}
                        {estadoAgenda === 'finalizando' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 finalizando-badge">⏳ FINALIZANDO</span>
                        )}
                        {estadoAgenda === 'finalizada' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 finalizada-badge">✓ FINALIZADA</span>
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
                      {a.sala && (
                        <p className="text-xs flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(a.sala).dot} shrink-0`} />
                          <span className={colorPorSala(a.sala).text}>{a.sala}</span>
                        </p>
                      )}
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
                {alertas.map((a, i) => {
                  const cls = `rounded-lg px-3 py-2 text-xs font-medium ${a.tipo === 'warn' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'}`;
                  // Los conflictos de sala/feriado (tipo "warn") tienen su detalle completo en
                  // /incidencias — clickeable para ir directo ahí en vez de solo avisar acá.
                  return a.tipo === 'warn' ? (
                    <Link key={i} href="/incidencias" className={`${cls} block hover:brightness-125 transition-[filter]`}>
                      {a.texto} <span className="underline">Ver detalle →</span>
                    </Link>
                  ) : (
                    <div key={i} className={cls}>{a.texto}</div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-2">Próximas clases</h2>
            {proximas.length === 0 ? (
              <p className="text-textSec text-sm py-1">No hay próximas actividades cargadas.</p>
            ) : (
              <TablaProximas items={proximas} onClick={setSeleccionado} asignacionesCO={asignacionesCODisponibles} />
            )}
          </div>
        </>
      )}
      {seleccionado && (
        <ModalDetalleInicio
          item={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          puedeEditar={puedeEditar}
          asignacionesCO={asignacionesCODisponibles}
          formaciones={formaciones}
          onGuardado={cargarTodo}
        />
      )}
    </div>
  );
}

function ModalDetalleInicio({ item, onCerrar, puedeEditar, asignacionesCO, formaciones, onGuardado }) {
  const { fetchAutenticado } = useSession();
  const [editando, setEditando] = useState(false);
  const [docE, setDocE] = useState(item.docente || '');
  const [staffE, setStaffE] = useState(item.staff || '');
  const [salaE, setSalaE] = useState(item.sala || '');
  const [horaE, setHoraE] = useState(item.horaMin != null ? minutosAHora(item.horaMin) : '');
  const [tematicaE, setTematicaE] = useState(item.tematica || '');
  const [observacionesE, setObservacionesE] = useState(item.observaciones || '');
  const [guardando, setGuardando] = useState(false);
  const idReunion = CREDENCIALES_ZOOM_DEFAULT.find((c) => c.sala === item.sala)?.idReunion;
  // En Coaching Ontológico el docente/staff no se carga por clase — se carga por período
  // en Docentes C.O. Si la clase puntual no tiene el dato, se busca ahí antes de mostrar "—".
  const periodoCO = item.curso === 'CO' && item.edicion ? buscarPeriodoCO(asignacionesCO || [], item.edicion, item.fecha) : null;
  const docenteMostrar = item.docente || periodoCO?.docente || '';
  const staffMostrar = item.staff || periodoCO?.staff || '';
  const observacionesMostrar = item.observaciones || periodoCO?.observaciones || '';
  const usoPeriodoCO = !!periodoCO && (!item.docente || !item.staff) && (!!periodoCO.docente || !!periodoCO.staff);
  // Fecha de inicio de la formación (primera clase con fecha de esta misma edición) — viene
  // de calcularFormaciones, que ya agrupa toda la agenda por curso+edición para Formaciones.
  const formacionInfo = item.esFormacion ? (formaciones || []).find((f) => f.codigo === item.curso && String(f.numero) === String(item.edicion)) : null;
  // Convierte "HH:MM" a minutos para mandarlo al PATCH (que espera nuevaHoraMin en minutos).
  function horaAMinutos(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  async function guardarTodo() {
    if (!item.id) return;
    setGuardando(true);
    try {
      const nuevaHoraMin = horaAMinutos(horaE);
      const body = { docente: docE, tematica: tematicaE, observaciones: observacionesE };
      if (item.esFormacion) body.staff = staffE;
      if (salaE && salaE !== item.sala) body.nuevaSala = salaE;
      if (nuevaHoraMin != null && nuevaHoraMin !== item.horaMin) body.nuevaHoraMin = nuevaHoraMin;
      const r = await fetchAutenticado(`/api/clases/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { setEditando(false); if (onGuardado) await onGuardado(); }
      else { const d = await r.json().catch(() => ({})); alert(d.error || 'No se pudo guardar.'); }
    } finally { setGuardando(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">
          {item.esFormacion ? `${item.nombreCurso}${item.edicion ? ' · Edición ' + item.edicion : ''}` : item.tipo}
        </h3>
        {!item.esFormacion && <p className="text-textSec text-xs mb-4">{item.nombreCurso}</p>}
        <div className="space-y-1.5 text-sm mb-4">
          <Fila label={item.esFormacion ? 'Fecha de la clase' : 'Fecha'} valor={formatFechaCorta(item.fecha)} />
          {item.esFormacion && formacionInfo?.fechaInicio && (
            <Fila label="Fecha de inicio de la formación" valor={formatFechaCorta(formacionInfo.fechaInicio)} />
          )}
          {item.esFormacion && item.numeroSesion && item.total && (
            <Fila label="Clase" valor={`${item.numeroSesion} de ${item.total}`} />
          )}
          {editando ? (
            <>
              <div className="flex items-center justify-between gap-2"><span className="text-textMuted">Horario</span><input className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={horaE} onChange={(e) => setHoraE(e.target.value)} placeholder="HH:MM" /></div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Sala</span>
                <select className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={salaE} onChange={(e) => setSalaE(e.target.value)}>
                  <option value="">— Sin sala —</option>
                  {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between gap-2"><span className="text-textMuted">Docente</span><input className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={docE} onChange={(e) => setDocE(e.target.value)} placeholder="Docente" /></div>
              {item.esFormacion && <div className="flex items-center justify-between gap-2"><span className="text-textMuted">Staff</span><input className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={staffE} onChange={(e) => setStaffE(e.target.value)} placeholder="Staff" /></div>}
              {!item.esFormacion && <div className="flex items-center justify-between gap-2"><span className="text-textMuted">Temática</span><input className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={tematicaE} onChange={(e) => setTematicaE(e.target.value)} placeholder="Temática" /></div>}
              <div className="flex items-center justify-between gap-2"><span className="text-textMuted">Observaciones</span><input className="flex-1 bg-bg border border-border rounded-lg px-2 py-1 text-sm max-w-[200px]" value={observacionesE} onChange={(e) => setObservacionesE(e.target.value)} placeholder="Observaciones" /></div>
              <p className="text-[10.5px] text-textMuted">La fecha y el curso/edición no se editan desde acá — para eso usá "Cambiar sala, postergar o cancelar esta clase" o cargala de nuevo.</p>
            </>
          ) : (
            <>
              <Fila label="Horario" valor={item.horaMin != null ? minutosAHora(item.horaMin) : '—'} />
              <Fila
                label="Sala"
                valor={item.sala ? <Link href="/credenciales-zoom" className="text-infoText underline">{item.sala}</Link> : '—'}
              />
              {idReunion && <Fila label="ID de reunión" valor={idReunion} />}
              <Fila label="Docente" valor={docenteMostrar || '—'} />
              {item.esFormacion && <Fila label="Staff" valor={staffMostrar || '—'} />}
              {!item.esFormacion && <Fila label="Temática" valor={item.tematica || '—'} />}
              <Fila label="Observaciones" valor={observacionesMostrar || '—'} />
            </>
          )}
        </div>
        {puedeEditar && item.esFormacion && item.id && (
          editando ? (
            <div className="flex gap-2 mb-3">
              <button className={btnCls} onClick={guardarTodo} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              <button className={btnSecCls} onClick={() => {
                setEditando(false); setDocE(item.docente || ''); setStaffE(item.staff || '');
                setSalaE(item.sala || ''); setHoraE(item.horaMin != null ? minutosAHora(item.horaMin) : '');
                setTematicaE(item.tematica || ''); setObservacionesE(item.observaciones || '');
              }}>Cancelar</button>
            </div>
          ) : (
            <button className={`${btnSecCls} mb-3`} onClick={() => setEditando(true)}>✏️ Editar</button>
          )
        )}
        {usoPeriodoCO && (
          <p className="text-[10.5px] text-textMuted mb-3">
            Docente/staff según el período cargado en <Link href="/docentes-co" className="underline">Docentes C.O.</Link> — esta clase puntual no tiene el dato propio.
          </p>
        )}
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

// Qué tan pronto arranca una clase, para el brillo de la fila en "Próximas clases":
// mañana (dentro de 24hs), entre 24 y 48hs, o más lejos (sin brillo).
function bandaProximidad(fecha, horaMin) {
  if (!fecha) return null;
  const inicio = new Date(fecha + 'T00:00:00');
  if (horaMin != null) inicio.setMinutes(inicio.getMinutes() + horaMin);
  const horas = (inicio - new Date()) / (1000 * 60 * 60);
  if (horas < 0) return null;
  if (horas <= 24) return 'manana';
  if (horas <= 48) return 'pronto';
  return null;
}

function TablaProximas({ items, onClick, asignacionesCO }) {
  if (!items.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border text-textMuted text-left">
            <th className="py-1.5 pr-2 pl-2 font-semibold whitespace-nowrap">Fecha</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Día</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Hora de inicio</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Hora de finalización</th>
            <th className="py-1.5 pr-2 font-semibold">Curso</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Nº Clase</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Sala</th>
            <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Docente</th>
            <th className="py-1.5 pl-2 font-semibold whitespace-nowrap">Staff</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => {
            const color = a.esFormacion ? colorFormacion(a.curso) : null;
            const dia = a.dia || (a.fecha ? fechaToDia(a.fecha) : '');
            const banda = bandaProximidad(a.fecha, a.horaMin);
            // Coaching Ontológico no carga docente/staff por clase, sino por período en
            // Docentes C.O. — mismo fallback que ya usa el modal de detalle, para no mostrar
            // "—" cuando el dato en realidad está cargado (solo que en otro lado).
            const periodoCO = a.curso === 'CO' && a.edicion ? buscarPeriodoCO(asignacionesCO || [], a.edicion, a.fecha) : null;
            const docenteMostrar = a.docente || periodoCO?.docente || '';
            const staffMostrar = a.staff || periodoCO?.staff || '';
            return (
              <tr
                key={a.id}
                onClick={() => onClick(a)}
                className={`border-b border-border/60 last:border-0 cursor-pointer hover:bg-bg/40 ${banda === 'manana' ? 'fila-manana' : banda === 'pronto' ? 'fila-pronto' : ''}`}
              >
                <td className="py-1.5 pr-2 pl-2 text-textMuted whitespace-nowrap align-top">{formatFechaCorta(a.fecha)}</td>
                <td className="py-1.5 pr-2 text-textMuted whitespace-nowrap align-top">{dia ? dia.charAt(0) + dia.slice(1).toLowerCase() : '—'}</td>
                <td className="py-1.5 pr-2 font-mono text-textSec whitespace-nowrap align-top">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</td>
                <td className="py-1.5 pr-2 font-mono text-textSec whitespace-nowrap align-top">{a.horaMin != null ? minutosAHora(a.horaMin + (a.duracion || 90)) : '—'}</td>
                <td className="py-1.5 pr-2 align-top">
                  <div className="flex items-center gap-1.5">
                    {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />}
                    <span className={color ? color.text : ''}>
                      {a.nombreCurso}
                      {a.esFormacion && a.edicion ? ` · Edición ${a.edicion}` : ''}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 pr-2 text-textMuted whitespace-nowrap align-top">
                  {a.esFormacion && a.numeroSesion && a.total ? `Clase ${a.numeroSesion} de ${a.total}` : '—'}
                </td>
                <td className="py-1.5 pr-2 whitespace-nowrap align-top">
                  {a.sala ? (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(a.sala).dot} shrink-0`} />
                      <span className={colorPorSala(a.sala).text}>{a.sala}</span>
                    </span>
                  ) : <span className="text-textMuted">—</span>}
                </td>
                <td className="py-1.5 pr-2 text-textMuted whitespace-nowrap align-top">{docenteMostrar || '—'}</td>
                <td className="py-1.5 pl-2 text-textMuted whitespace-nowrap align-top">{staffMostrar || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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

// Clases reservadas sin sala (ver Salas Zoom → "Guardar sin sala") — cualquiera que entra a
// Inicio las ve, pero solo quien tiene permiso de editar el cronograma (Admin, SuperAdmin,
// Educativo) puede completarles la sala acá mismo, sin tener que ir a buscarlas a otro lado.
function TarjetaPendientesSala({ pendientes, puedeAsignar, fetchAutenticado, onAsignado }) {
  const [asignando, setAsignando] = useState(null); // id de la clase que se está editando
  const [salaElegida, setSalaElegida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar(id) {
    if (!salaElegida) return;
    setGuardando(true); setError('');
    try {
      const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevaSala: salaElegida })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setAsignando(null); setSalaElegida('');
      onAsignado();
    } catch (e) {
      setError('Error de conexión: ' + (e.message || 'no se pudo contactar al servidor.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className={`${sectionCls} border-warningText/40`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">⏳ Pendientes de asignar sala</h2>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warningBg text-warningText">{pendientes.length}</span>
      </div>
      <p className="text-xs text-textMuted mb-3">Se guardaron sin elegir sala todavía — {puedeAsignar ? 'completala acá.' : 'alguien con permiso tiene que completarles la sala.'}</p>
      <div className="flex flex-col gap-2">
        {pendientes.map((c) => (
          <div key={c.id} className="bg-bg border border-border rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <span className="font-semibold">{NOMBRES[c.codigo] || c.codigo}{c.numero ? ' · Edición ' + c.numero : ''}</span>
              <span className="text-textMuted text-xs ml-2">
                {c.fecha ? formatFechaCorta(c.fecha) : diaCapitalizado(c.dia) + ' (recurrente)'} · {minutosAHora(c.horaMin)}
                {c.docente ? ' · ' + c.docente : ''}
              </span>
            </div>
            {puedeAsignar && (
              asignando === c.id ? (
                <div className="flex items-center gap-1.5">
                  <select value={salaElegida} onChange={(e) => setSalaElegida(e.target.value)} className="bg-surface2 border border-border rounded-lg px-2 py-1 text-xs">
                    <option value="">Elegí sala…</option>
                    {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button disabled={!salaElegida || guardando} onClick={() => confirmar(c.id)} className={`${btnCls} px-3 py-1 text-xs`}>
                    {guardando ? 'Guardando…' : 'Confirmar'}
                  </button>
                  <button onClick={() => { setAsignando(null); setSalaElegida(''); setError(''); }} className={btnSecCls}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => { setAsignando(c.id); setSalaElegida(''); setError(''); }} className={btnSecCls}>Asignar sala</button>
              )
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-dangerText text-xs mt-2">{error}</p>}
    </div>
  );
}
