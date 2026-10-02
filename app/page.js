'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../lib/useSession';
import { tienePermisoEditarCronograma } from '../lib/permisos';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, ICONOS, NOMBRES, TOTALES,
  minutosAHora, formatFechaCorta, calcularAlertas, calcularFormacionesEnriquecidas, colorFormacion, colorPorSala, calcularEdicionesFinalizadas,
  calcularNumeroSesion, toISO, buscarPeriodoCO, edicionRealDeClase, entradasFuturasFormacionSinLive, calcularFechaFinCurso
} from '../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../lib/cronogramaHistorico';
import { CREDENCIALES_ZOOM_DEFAULT } from '../lib/credencialesZoomDefaults';
import { DOCENTES_CO_DEFAULT } from '../lib/docentesCODefaults';
import { FECHAS_INICIO_REALES } from '../lib/fechasInicioReales';

// Pedido de Diego: las tarjetas de métricas de arriba de Inicio ocupaban demasiado
// espacio para lo que muestran — de p-4 (16px) a px-2.5 py-2 (10px/8px) baja la altura y
// el ancho mínimo bastante más del 20-30% pedido, sin quedar apretado.
const metricaCls = 'bg-surface2 border border-border rounded-lg px-2.5 py-2';
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
  const [formacionesManual, setFormacionesManual] = useState([]);
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
      const [rc, rf, ra, rp, rd, rfm] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/actividades'),
        fetchAutenticado('/api/postergaciones'),
        fetchAutenticado('/api/docentes-co'),
        fetchAutenticado('/api/formaciones')
      ]);
      const [dc, df, da, dp, dd, dfm] = await Promise.all([rc.json(), rf.json(), ra.json(), rp.json(), rd.json(), rfm.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (ra.ok) setActividades(da.actividades);
      if (rp.ok) setPostergaciones(dp.postergaciones);
      if (rd.ok) setDocentesCO(dd.asignaciones);
      if (rfm.ok) setFormacionesManual(dfm.formaciones);
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
  // Antes esta pantalla calculaba las formaciones solo desde las clases reales (sin
  // histórico/fechas confirmadas/pestaña Formaciones), mientras que la pantalla Formaciones sí
  // mezclaba las 4 fuentes — por eso una misma edición podía mostrar datos distintos según en
  // qué pantalla se la mirara. Ahora Inicio llama a la misma función compartida en
  // lib/salasLogic.js, así las dos pantallas SIEMPRE dicen lo mismo (pedido de Diego: que esta
  // información viva en un solo lugar).
  const formaciones = useMemo(
    () => calcularFormacionesEnriquecidas(clases, formacionesManual, asignacionesCODisponibles),
    [clases, formacionesManual, asignacionesCODisponibles]
  );
  // Se calcula una sola vez (no depende de nada que cambie) — mismas ediciones que
  // Formaciones ya detecta como "Finalizó" a partir del histórico real, para que las dos
  // pantallas digan lo mismo y una clase de un curso ya terminado no siga apareciendo acá.
  // Se sube acá (antes vivía más abajo) porque `alertasActividadFaltante` también la necesita.
  const edicionesFinalizadas = useMemo(() => calcularEdicionesFinalizadas(CRONOGRAMA_HISTORICO), []);
  // Sala YA conocida de una edición de C.O. por CUALQUIER fuente que la app ya usa en otros
  // lados (no solo la columna "Sala" del período de Docentes C.O. vigente): `formaciones` ya
  // mezcla, en este orden, el horario confirmado contra Zoom real (SALA_CONFIRMADA_POR_EDICION)
  // y el período vigente de Docentes C.O. — exactamente la misma sala que ya se muestra en la
  // tarjeta de esa edición en Formaciones/Cronograma/Agenda de hoy. Pedido de Diego ("SIGUE
  // APARECIENDO" / "REVISA PEDIRME TODA LA INFO PARA QUE ACA NO APAREZCA NADA"): la alerta de
  // "Falta cargar la clase" miraba SOLO el período (`a.sala`) y no esta fuente combinada, así
  // que podía seguir disparando para una edición cuya sala sí se conoce, solo que por otro
  // camino — sin necesidad de pedirle a Diego que confirme nada a mano.
  const salaConocidaPorEdicionCO = useMemo(() => {
    const out = {};
    formaciones.forEach((f) => { if (f.codigo === 'CO' && f.sala) out[f.numero] = f.sala; });
    return out;
  }, [formaciones]);
  // Avisa cuando a una edición en curso le quedan exactamente 2 clases para terminar —
  // así el equipo puede empezar a coordinar el cierre (certificación, próxima edición, etc.)
  // con un poco de anticipación en vez de enterarse el día de la última clase.
  // A pedido de Diego: la intensidad sube a medida que se acerca la última clase — 3
  // restantes es solo informativo (neutro), 2 restantes es "en breve" (amarillo, como ya
  // estaba), 1 restante ya es urgente (rojo), y si finalizó AYER puntualmente (no "hace
  // un tiempo") también es rojo, para no perder la ventana de coordinar cierre/certificación.
  const alertasPorFinalizar = useMemo(() => {
    const ayerISO = toISO(new Date(Date.now() - 86400000));
    const salientes = [];
    formaciones.forEach((f) => {
      if (!f.total) return;
      const nombre = NOMBRES[f.codigo] || f.codigo;
      if (f.estado === 'En proceso') {
        const restan = f.total - f.cargadas;
        if (restan === 3) {
          salientes.push({ tipo: 'neutro', texto: `En 3 clases finaliza: ${nombre} edición ${f.numero} — va por la clase ${f.cargadas} de ${f.total}.` });
        } else if (restan === 2) {
          salientes.push({ tipo: 'finaliza', texto: `Finaliza en breve: ${nombre} edición ${f.numero} — va por la clase ${f.cargadas} de ${f.total}.` });
        } else if (restan === 1) {
          salientes.push({ tipo: 'urgente', texto: `¡Última clase próxima!: ${nombre} edición ${f.numero} — va por la clase ${f.cargadas} de ${f.total}.` });
        }
      } else if (f.estado === 'Finalizó' && f.fechaFinal === ayerISO) {
        salientes.push({ tipo: 'urgente', texto: `Finalizó ayer: ${nombre} edición ${f.numero} — coordinar cierre (certificación, próxima edición, etc.).` });
      }
    });
    return salientes;
  }, [formaciones]);
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
        tipo: 'neutro',
        texto: diasFaltan === 0
          ? `Hoy comienza: ${NOMBRES[f.codigo] || f.codigo} edición ${f.numero} (${formatFechaCorta(f.fechaInicio)}).`
          : `En ${diasFaltan} día${diasFaltan === 1 ? '' : 's'} comienza: ${NOMBRES[f.codigo] || f.codigo} edición ${f.numero} (${formatFechaCorta(f.fechaInicio)}).`
      }));
  }, [formaciones]);
  // Avisa de las clases que se postergaron o se cancelaron ESTA semana (lunes a domingo),
  // tomando la fecha en que se hizo el cambio (FechaRegistro) — no la fecha original de la
  // clase — para que el aviso aparezca la semana en la que realmente se postergó/canceló.
  const alertasPostergaciones = useMemo(() => {
    const hoyDia = new Date(); hoyDia.setHours(0, 0, 0, 0);
    const diaSemana = hoyDia.getDay(); // 0=domingo … 6=sábado
    const inicioSemana = new Date(hoyDia);
    inicioSemana.setDate(hoyDia.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1));
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    const inicioISO = toISO(inicioSemana), finISO = toISO(finSemana);

    return postergaciones
      .filter((p) => p.fechaRegistro && p.fechaRegistro >= inicioISO && p.fechaRegistro <= finISO)
      .map((p) => {
        const nombre = NOMBRES[p.codigo] || p.codigo;
        const fueCancelada = !p.fechaNueva;
        const texto = fueCancelada
          ? `Esta semana se canceló: ${nombre} edición ${p.edicion} — clase ${p.numero} del ${formatFechaCorta(p.fechaOriginal)}${p.motivo ? ` (${p.motivo})` : ''}.`
          : `Esta semana se postergó: ${nombre} edición ${p.edicion} — clase ${p.numero} pasó del ${formatFechaCorta(p.fechaOriginal)} al ${formatFechaCorta(p.fechaNueva)}${p.motivo ? ` (${p.motivo})` : ''}.`;
        return { tipo: 'neutro', texto };
      });
  }, [postergaciones]);
  // Avisa cuando un período de Docentes C.O. ya está vigente (arrancó hoy o antes, y no
  // terminó) pero todavía no tiene ninguna clase real cargada en Salas Zoom con esa edición
  // — para no depender de acordarse de mirar Docentes C.O. a mano; el mismo cálculo de "Sala"
  // que usa esa pantalla (clase más reciente con esa edición y con sala cargada).
  const alertasActividadFaltante = useMemo(() => {
    const hoyISO = toISO(new Date());
    // Dos cosas distintas, para no decir "no tiene ninguna clase creada" cuando en realidad
    // la clase ya existe y solo le falta la sala (caso "pendienteSala" — ver TarjetaPendientesSala
    // más arriba en esta misma página, ahí se asigna).
    const existeClasePorEdicion = {}; // alguna clase (con o sin sala)
    const salaPorEdicionCO = {}; // la más reciente que además tenga sala
    // Edición real (edicionRealDeClase) — no c.numero directo, que en una edición cargada
    // "completa" (varias filas, una por clase) es el Nº de sesión, no el Nº de edición.
    clases.filter((c) => c.codigo === 'CO').forEach((c) => {
      const edicion = edicionRealDeClase(c);
      if (!edicion) return;
      existeClasePorEdicion[edicion] = true;
      if (c.sala) {
        const actual = salaPorEdicionCO[edicion];
        if (!actual || (c.fecha || '') > (actual.fecha || '')) salaPorEdicionCO[edicion] = c;
      }
    });
    // Se descartan además las ediciones que el histórico real ya marca como Finalizó (ver
    // `edicionesFinalizadas` más arriba) y cualquier período cuyo "Desde" sea tan viejo que,
    // contando la duración real de C.O. (48 clases) desde esa fecha, la edición ya tendría que
    // haber terminado hace rato — un período sin "Hasta" cargado en Docentes C.O. queda
    // "vigente" para siempre aunque la edición haya terminado hace años (ej. edición 1,
    // "vigente desde 01/01/2022" sin ningún dato más reciente cargado), y sin este chequeo eso
    // disparaba la alerta de forma permanente para una edición que ya no tiene nada pendiente.
    const vigentes = asignacionesCODisponibles.filter((a) => {
      if (!a.desde || a.desde > hoyISO) return false;
      if (a.hasta && a.hasta < hoyISO) return false;
      if (edicionesFinalizadas.has(`CO|${a.edicion}`)) return false;
      const finEstimado = calcularFechaFinCurso('CO', a.desde, TOTALES.CO);
      if (finEstimado && finEstimado < hoyISO) return false;
      return true;
    });
    // Puede haber MÁS DE UN período "vigente" para la misma edición al mismo tiempo — datos
    // superpuestos/duplicados en Docentes C.O. (ej. un período viejo sin sala y uno nuevo con
    // sala cargados los dos para el mismo rango de fechas). Evaluar cada fila por separado
    // hacía que la vieja (sin sala) igual disparara la alerta aunque la nueva (con sala) ya
    // la resolviera — se agrupa por edición primero y se usa la que tenga sala, si hay alguna.
    const porEdicion = {};
    vigentes.forEach((a) => { (porEdicion[a.edicion] = porEdicion[a.edicion] || []).push(a); });

    return Object.entries(porEdicion)
      .filter(([edicion]) => !salaPorEdicionCO[edicion])
      .map(([edicion, periodos]) => {
        const a = periodos.find((p) => p.sala) || periodos[periodos.length - 1];
        if (existeClasePorEdicion[edicion]) {
          return {
            tipo: 'actividadFaltante', accion: 'asignarSala',
            texto: `Falta asignar sala: Coaching Ontológico edición ${edicion} ya tiene la clase cargada, pero todavía sin sala — asignásela en "Salas pendientes de asignar", arriba de "Agenda de hoy".`
          };
        }
        // Si el período ya tiene sala cargada (columna "Sala" de Docentes C.O.) O si la sala
        // ya se conoce por cualquier otra fuente que la app ya usa (ver `salaConocidaPorEdicionCO`
        // más arriba — típicamente el horario confirmado contra Zoom real) y no hay ninguna
        // clase real creada, ya no hace falta avisar "Falta cargar la clase" — esa edición se
        // arma sola como clase virtual (con su sala real) vía
        // `entradasFuturasFormacionSinLive`/`calcularFormacionesEnriquecidas`, y cuenta
        // normalmente en "Salas ocupadas ahora". Pedido de Diego (02/10/2026): "YA CARGAMOS
        // TODA LA INFO DE TODAS" — esto dejó de ser una alerta real para esos casos.
        if (a.sala || salaConocidaPorEdicionCO[edicion]) return null;
        return {
          tipo: 'actividadFaltante', accion: 'cargarClase',
          texto: `Falta cargar la clase: Coaching Ontológico edición ${edicion} ya está vigente (desde el ${formatFechaCorta(a.desde)}) pero no tiene ninguna clase creada en Salas Zoom todavía.`,
          // Se manda a "Cargar actividad →" para precargar el formulario de Salas Zoom con
          // estos datos (edición, fecha de inicio, docente/staff del período vigente) — así
          // Diego solo tiene que confirmar sala/horario en vez de tipear todo de nuevo.
          prefillHref: `/salas-zoom?prefillCurso=CO&prefillEdicion=${encodeURIComponent(edicion)}&prefillFecha=${encodeURIComponent(a.desde || '')}&prefillDocente=${encodeURIComponent(a.docente || '')}&prefillStaff=${encodeURIComponent(a.staff || '')}&prefillHorario=${encodeURIComponent(a.horario || '')}`,
          // Se llevan estos datos crudos también acá (no solo en el texto) para poder armar
          // más abajo una tarjeta "de mentira" en Agenda de hoy cuando el período arranca
          // justo hoy — ver `agendaSinteticaHoy`.
          edicion, desde: a.desde, docente: a.docente || '', staff: a.staff || '', horario: a.horario || ''
        };
      })
      .filter(Boolean);
  }, [asignacionesCODisponibles, clases, edicionesFinalizadas, salaConocidaPorEdicionCO]);
  // Si un período de C.O. arranca justo HOY pero todavía no tiene clase real cargada (caso
  // de arriba, accion "cargarClase"), Diego quiere que igual aparezca en "Agenda de hoy" —
  // aunque sea sin sala — en vez de estar solamente como alerta. Se arma una tarjeta con la
  // misma forma que las reales (ver `actividadesTodas` más abajo), marcada `sinCrear: true`
  // para no llevar a "detalle de clase" (no existe todavía) sino directo al formulario
  // precargado de Salas Zoom.
  const agendaSinteticaHoy = useMemo(() => {
    const hoyISO = toISO(new Date());
    return alertasActividadFaltante
      .filter((a) => a.accion === 'cargarClase' && a.desde === hoyISO)
      .map((a) => {
        // "19.00 a 21.00 horas" → horaMin=1140, duracion=120 (best-effort; si no se puede
        // leer, queda sin hora puntual — la tarjeta igual se muestra, sin cartel de horario).
        const m = String(a.horario || '').match(/(\d{1,2})[.:hH](\d{2}).*?(\d{1,2})[.:hH](\d{2})/);
        let horaMin = null, duracion = null;
        if (m) {
          const inicio = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
          const fin = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
          if (!Number.isNaN(inicio)) horaMin = inicio;
          if (!Number.isNaN(fin) && fin > inicio) duracion = fin - inicio;
        }
        return {
          id: `sin-crear-CO-${a.edicion}`, fecha: hoyISO, dia: null, curso: 'CO', nombreCurso: NOMBRES.CO || 'Coaching Ontológico',
          edicion: a.edicion, numeroSesion: 1, total: TOTALES.CO || null, horaMin, duracion,
          sala: '', esFormacion: true, docente: a.docente, staff: a.staff, tematica: '', observaciones: '',
          sinCrear: true, prefillHref: a.prefillHref
        };
      });
  }, [alertasActividadFaltante]);
  // Pedido de Diego: separar "Alertas activas" en sub-grupos en vez de una sola lista
  // mezclada — así "Falta cargar/asignar sala" (lo urgente y accionable) no se pierde
  // entre "Finaliza en breve" de otras ediciones. Cada alerta se etiqueta con `categoria`
  // acá (sin tocar las funciones que las calculan) y el render más abajo arma una
  // sub-tabla por categoría, en este mismo orden, mostrando solo las que tengan alertas.
  const alertas = useMemo(
    () => [
      ...alertasActividadFaltante.map((a) => ({ ...a, categoria: 'cargas' })),
      ...alertasPorFinalizar.map((a) => ({ ...a, categoria: 'finalizacion' })),
      ...alertasConflictos.map((a) => ({ ...a, categoria: 'otras' })),
      ...alertasPostergaciones.map((a) => ({ ...a, categoria: 'otras' })),
      ...alertasPorComenzar.map((a) => ({ ...a, categoria: 'otras' }))
    ],
    [alertasConflictos, alertasActividadFaltante, alertasPostergaciones, alertasPorFinalizar, alertasPorComenzar]
  );
  const GRUPOS_ALERTAS = [
    { categoria: 'cargas', titulo: 'Cargas de Zoom' },
    { categoria: 'finalizacion', titulo: 'Finalización de ediciones' },
    { categoria: 'otras', titulo: 'Otras' }
  ];

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
  // OJO: antes esto era `ahora.toISOString().slice(0, 10)`, que da la fecha en UTC, no la
  // fecha LOCAL del navegador — con Argentina en UTC-3, cualquier hora local desde las 21:00
  // en adelante ya cae en el día siguiente en UTC. Eso hacía que "Agenda de hoy" mostrara el
  // día de MAÑANA (con sus clases reales) mientras las horas de esas clases se comparaban
  // contra la hora LOCAL de hoy (`horaActual`, en minutos) — la mezcla de una fecha en UTC
  // con una hora en horario local hacía que clases que todavía no pasaron (o ni empezaron)
  // aparecieran como "FINALIZADA". Ahora se usa `toISO`, la misma fecha local que ya usa el
  // resto de la app (Cronograma, Formaciones, etc.), para que fecha y hora sean consistentes.
  const hoyISO = toISO(ahora);

  // OJO: antes esto miraba "vista" (agrupado por día de la semana + hora + sala, sin
  // importar la fecha puntual) — como agruparParaVista colapsa toda una serie recurrente en
  // UNA fila representativa, terminaba marcando una sala "ocupada" solo porque hoy es el
  // mismo día de la semana que esa serie, sin chequear si la clase de HOY puntual ya pasó
  // (Diego reportó salas marcadas ocupadas con las clases de hoy ya finalizadas). Ahora se
  // mira directamente la clase real con fecha de HOY en esa sala.
  //
  // Pedido de Diego (02/10/2026): las ediciones de Coaching Ontológico sin fila real en
  // Salas Zoom pero con período de Docentes C.O. vigente (sala ya cargada ahí) también
  // tienen que ocupar su sala mientras se están dictando — si no, el contador seguía en 0
  // aunque la clase estuviera efectivamente en vivo ("CUANDO HAY CLASES OCUPADAS"). Se arma
  // la misma entrada "virtual" que ya arma `entradasFuturasFormacionSinLive` para Agenda de
  // hoy, filtrada a la de hoy y a las que ya tienen sala.
  const entradasVirtualesHoy = formaciones
    .flatMap((f) => entradasFuturasFormacionSinLive(f, hoyISO, asignacionesCODisponibles))
    .filter((a) => a.fecha === hoyISO && a.sala && a.horaMin != null);
  let ocupadasAhora = 0;
  SALAS.forEach((sala) => {
    const ocupHoy = clases.filter((c) => c.fecha === hoyISO && c.sala === sala)
      .map((c) => ({ inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }))
      .concat(entradasVirtualesHoy.filter((a) => a.sala === sala)
        .map((a) => ({ inicio: a.horaMin - BUFFER_MIN, fin: a.horaMin + a.duracion })));
    if (ocupHoy.some((o) => horaActual >= o.inicio && horaActual < o.fin)) ocupadasAhora++;
  });
  const libresAhora = SALAS.length - ocupadasAhora;

  // Fecha real de inicio de cada edición, según el histórico (mismo Excel que ya usa la
  // pantalla Formaciones para esto — ver `historicoPorEdicion` en app/formaciones/page.js).
  // El modal de detalle de acá abajo (Inicio → click en una clase) no lo tenía en cuenta y
  // por eso mostraba "—" en "Fecha de inicio de la formación" aunque ya estuviera cargada
  // en el histórico — Diego lo notó con Coaching Educativo 65 (si en Formaciones decía
  // "Inicio: 26/08/2026", acá también tiene que decirlo).
  const fechaInicioHistorico = useMemo(() => {
    const out = {};
    CRONOGRAMA_HISTORICO.filter((h) => h.tipo === 'Formación' && h.edicion && h.fecha).forEach((h) => {
      const key = `${h.curso}|${h.edicion}`;
      if (!out[key] || h.fecha < out[key]) out[key] = h.fecha;
    });
    return out;
  }, []);

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

    const noFinalizada = (c) => !edicionesFinalizadas.has(`${c.codigo}|${edicionRealDeClase(c)}`);
    // El campo Numero de la clase identifica la EDICIÓN (ej: "CO 51"), no qué sesión
    // semanal es dentro de ella — calcularNumeroSesion cuenta la posición real entre las
    // clases con fecha de esa misma edición (mismo criterio que ya usa Cronograma), para
    // no mostrar "Clase 51 de 48" para la edición 51.
    const sesionPorId = calcularNumeroSesion(clases);
    // Para una clase del horario RECURRENTE (todavía sin fecha puntual — ver más abajo) no
    // hay ninguna fila propia que contar con calcularNumeroSesion. Pero `formaciones` (mismo
    // cálculo que ya usan "Agenda de hoy"/Alertas) sí sabe cuántas clases de esa edición ya
    // se dieron (`cargadas`) contando las clases anteriores que SÍ tienen fecha — la próxima
    // en el horario recurrente es, entonces, esa cantidad + 1. Pedido de Diego: "Próximas
    // clases" mostraba "—" en Nº Clase para estas filas en vez de usar ese dato.
    const cargadasPorEdicion = {};
    formaciones.forEach((f) => { cargadasPorEdicion[`${f.codigo}|${f.numero}`] = f.cargadas; });

    // Edición real de cada clase (edicionRealDeClase, ver comentario en calcularFormaciones):
    // usa el campo Edicion cuando está cargado de verdad, y si no cae al viejo criterio
    // (Numero) — así una edición cargada "completa" (varias filas, una por clase) no se
    // parte en tantas ediciones falsas como clases tiene.
    const deClasesConFecha = clases.filter((c) => c.fecha && noFinalizada(c)).map((c) => ({
      id: c.id, fecha: c.fecha, dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: edicionRealDeClase(c), numeroSesion: sesionPorId[c.id] || null, total: TOTALES[c.codigo] || null,
      horaMin: c.horaMin, duracion: c.duracion, sala: c.sala, esFormacion: true,
      docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
    }));
    // Clases del horario recurrente (Grilla de Salas Zoom, sin fecha puntual todavía):
    // se muestran igual, proyectadas a su próxima fecha real según el día que les toca.
    const deClasesRecurrentes = clases.filter((c) => !c.fecha && c.dia && noFinalizada(c)).map((c) => {
      const edicion = edicionRealDeClase(c);
      const cargadas = cargadasPorEdicion[`${c.codigo}|${edicion}`];
      const total = TOTALES[c.codigo] || null;
      // +1 sobre lo ya dado — pero nunca más que el total (una edición al borde del cierre
      // no debería mostrar "Clase 49 de 48" por este cálculo aproximado).
      const numeroSesion = cargadas != null ? Math.min(cargadas + 1, total || cargadas + 1) : null;
      return {
        id: c.id, fecha: proximaFechaParaDia(c.dia), dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
        edicion, numeroSesion, total,
        horaMin: c.horaMin, duracion: c.duracion, sala: c.sala, esFormacion: true,
        docente: c.docente || '', staff: c.staff || '', tematica: c.tematica || '', observaciones: c.observaciones || ''
      };
    }).filter((c) => c.fecha);
    // Mismo criterio que en Cronograma: las Formación históricas se excluyen acá,
    // porque ya están representadas (con sala real) en deClases.
    const deOtras = actividades.filter((a) => a.fecha && a.tipo !== 'Formación').map((a) => ({
      id: a.id, fecha: a.fecha, dia: a.dia, curso: '', nombreCurso: a.nombreCurso || a.tipo, tipo: a.tipo,
      edicion: '', numero: '', horaMin: a.horaMin, duracion: 90, sala: a.sala || '', esFormacion: false,
      docente: a.docente || '', staff: '', tematica: a.tematica || '', observaciones: a.observaciones || ''
    }));
    // Formaciones que ya no tienen NINGUNA fila viva en Salas Zoom (ej: Coaching Deportivo,
    // que nunca se migra ahí) pero sí tienen clases pendientes según su cadencia semanal real
    // — sin esto, quedaban totalmente invisibles acá aunque estuvieran "En proceso" de verdad.
    // Pedido explícito de Diego (30/09/2026): "TODAS DEBERIAN APARECER EN HOY".
    // Coaching Ontológico queda afuera de este mecanismo genérico: ya tiene el suyo propio
    // más arriba (agendaSinteticaHoy, basado en Docentes C.O., no en la cadencia semanal
    // estimada) — sin este filtro, una edición de CO que arranca justo hoy terminaba
    // duplicada (una tarjeta por cada mecanismo, ambas iguales).
    const cubiertasPorAgendaSintetica = new Set(agendaSinteticaHoy.map((a) => `${a.curso}|${a.edicion}`));
    // Esta misma lista (actividadesTodas) alimenta tanto "Agenda de hoy" (filtra fecha ===
    // hoyISO más abajo) como "Próximas clases" (filtra fecha > hoyISO) — por eso acá hace
    // falta la SERIE COMPLETA de clases futuras de estas formaciones, no solo la de hoy.
    // Antes se generaba nada más la de hoy, y por eso cursos como Coaching Deportivo nunca
    // mostraban sus próximas clases (solo la más próxima) en "Próximas clases" del Inicio —
    // reportado por Diego con "Coaching Deportivo · Edición 14 Clase 15 de 16" faltando.
    // El dedup contra agendaSinteticaHoy solo tiene sentido para el día de hoy (es el único
    // día en que ese mecanismo puede generar una tarjeta duplicada); las clases futuras de
    // la misma edición no chocan con nada y deben quedar.
    const entradasFormacionesSinLive = formaciones
      .flatMap((f) => entradasFuturasFormacionSinLive(f, hoyISO, asignacionesCODisponibles))
      .filter((a) => !(a.fecha === hoyISO && cubiertasPorAgendaSintetica.has(`${a.curso}|${a.edicion}`)));
    return deClasesConFecha.concat(deClasesRecurrentes, deOtras, entradasFormacionesSinLive).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  }, [clases, actividades, edicionesFinalizadas, formaciones, agendaSinteticaHoy, asignacionesCODisponibles]);

  const agendaHoy = actividadesTodas.filter((a) => a.fecha === hoyISO)
    .concat(agendaSinteticaHoy)
    .sort((a, b) => (a.horaMin || 0) - (b.horaMin || 0));
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
      codigo: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo, edicion: edicionRealDeClase(c),
      total: TOTALES[c.codigo], fecha: c.fecha, dia: c.dia, horaMin: c.horaMin, sala: c.sala
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  const proximaClase = agendaHoy.find((a) => a.horaMin > horaActual) || proximas[0] || null;
  const formacionesEnCurso = formaciones.filter((f) => f.estado === 'En proceso').length;
  // Nueva métrica pedida por Diego: cuántas de las clases de hoy ya se dieron (mismo
  // criterio de "finalizada" que ya usan las tarjetas de Agenda de hoy).
  const clasesRealizadasHoy = agendaHoy.filter((a) => estadoDeAgenda(a.horaMin, a.duracion) === 'finalizada').length;
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-16">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">HOY</h1>
      </div>

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <>
          {/* Pedido de Diego: tarjetas más chicas (20-30% menos alto/ancho que antes — ver
              `metricaCls`), con el texto descriptivo más presente que el número (label
              arriba, valor abajo y no tan grande), un ícono por métrica para que se lean
              rápido, y que entren más por fila sin sensación de amontonado (de 150px a
              ~115px de ancho mínimo, gap más chico). Se suma "Clases realizadas" y se
              aclara que "Salas ocupadas" es en este momento. "Incidencias activas" se
              atenúa (opacity) cuando está en 0, en vez de tener el mismo protagonismo que
              cuando sí hay algo para revisar — sigue en la fila para no generar la duda de
              "¿por qué desapareció?", pero pasa a un segundo plano visual.
              Pedido de Diego (02/10/2026): "que entre en una línea" + "algo más premium" en
              vez de emojis — se cambian los emojis por íconos de línea (SVG, mismo trazo que
              el resto del sistema de diseño) y el label se trunca con "…" en una sola línea
              en vez de dejarlo envolver a dos — ver IconoMetrica más abajo. Se acortan además
              los dos labels más largos ("Salas disponibles en este momento" → "Salas
              disponibles ahora") para que entren sin truncarse en el ancho normal de la
              tarjeta; el de "Próxima" queda con title= para poder leer el nombre completo del
              curso al pasar el mouse si se trunca. */}
          <div data-tour="inicio-panel" className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(115px,1fr))' }}>
            <Metrica icono="clasesHoy" valor={agendaHoy.length} label="Clases hoy" />
            <Metrica icono="realizadas" valor={clasesRealizadasHoy} label="Clases realizadas" />
            <Metrica
              icono="proxima"
              valor={proximaClase ? minutosAHora(proximaClase.horaMin) : '—'}
              label={proximaClase ? `Próxima: ${proximaClase.nombreCurso}` : 'Próxima clase'}
              chico
            />
            <Metrica icono="salas" valor={`${ocupadasAhora}/${SALAS.length}`} label="Salas ocupadas ahora" acento={ocupadasAhora > 0 ? 'warning' : undefined} />
            <Metrica icono="salas" valor={libresAhora} label="Salas disponibles ahora" acento="success" />
            <Metrica icono="alerta" valor={alertasConflictos.length} label="Incidencias activas" acento={alertasConflictos.length > 0 ? 'danger' : undefined} atenuada={alertasConflictos.length === 0} />
            <Metrica icono="formaciones" valor={formacionesEnCurso} label="Formaciones activas" />
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
            <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
              Agenda de hoy
              <span className="dot-en-vivo" title="Se actualiza sola" />
            </h2>
            <p className="text-xs text-textMuted mb-3">{formatFechaCorta(hoyISO)}</p>
            {agendaHoy.length === 0 ? (
              <p className="text-textSec text-sm py-2">Sin actividades cargadas para hoy.</p>
            ) : (
              <div data-tour="tarjetas-clases" className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {agendaHoy.map((a, i) => {
                  const estadoAgenda = estadoDeAgenda(a.horaMin, a.duracion);
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  // Pedido de Diego: una clase ya finalizada no debe verse igual de "viva" que
                  // las que todavía vienen — se le baja el brillo a toda la tarjeta.
                  const yaFinalizada = estadoAgenda === 'finalizada';
                  const cardCls = `text-left border-l-4 ${color ? color.border : 'border-infoText/40'} border-t border-r border-b border-border rounded-lg p-3 transition-colors hover:border-accentTeal/60 hover:bg-bg/40 block no-underline ${yaFinalizada ? 'opacity-55' : ''}`;
                  const contenido = (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-textSec">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {/* Pedido de Diego: una edición vigente hoy pero sin clase cargada
                            todavía (ver `agendaSinteticaHoy`) igual aparece acá, sin sala —
                            con su propio cartel en vez de los de arriba (no hay clase real
                            todavía como para decir "EN VIVO"/"PRÓXIMAMENTE"). */}
                        {a.sinCrear ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-dangerBg text-dangerText">FALTA CARGAR</span>
                        ) : estadoAgenda === 'en-vivo' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 en-vivo-badge">🔴 EN VIVO</span>
                        ) : estadoAgenda === 'proximamente' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 proximamente-badge">🕐 PRÓXIMAMENTE</span>
                        ) : estadoAgenda === 'finalizando' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 finalizando-badge">⏳ FINALIZANDO</span>
                        ) : estadoAgenda === 'finalizada' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 finalizada-badge">✓ FINALIZADA</span>
                        ) : null}
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
                      {a.sinCrear && (
                        <p className="text-xs text-dangerText underline">Sin sala — cargar actividad →</p>
                      )}
                      {/* Pedido de Diego: "cómo cero clases ocupadas si se ve que hay varias en
                          vivo" — estas son formaciones sin fila en Salas Zoom (ej. Coaching
                          Deportivo y similares, que nunca se cargan ahí), así que el contador de
                          "Salas ocupadas" de arriba no las cuenta (no hay sala física que
                          ocupen). Antes la tarjeta no explicaba esto — se veía "EN VIVO" sin
                          ningún dato de sala, dando la sensación de un dato faltante en vez de
                          una diferencia real entre "está pasando ahora" y "tiene una sala
                          asignada". */}
                      {a.esFormacion && !a.sala && !a.sinCrear && (
                        <p className="text-xs text-textMuted">Sin sala asignada (no se carga en Salas Zoom)</p>
                      )}
                    </>
                  );
                  return a.sinCrear ? (
                    <Link key={i} href={a.prefillHref || '/salas-zoom'} className={cardCls}>{contenido}</Link>
                  ) : (
                    <button key={i} onClick={() => setSeleccionado(a)} className={cardCls}>{contenido}</button>
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
              <div className="flex flex-col gap-3">
                {GRUPOS_ALERTAS.map((grupo) => {
                  const items = alertas.filter((a) => a.categoria === grupo.categoria);
                  if (items.length === 0) return null;
                  return (
                    <div key={grupo.categoria}>
                      <p className="text-[10.5px] font-semibold text-textMuted uppercase tracking-wide mb-1">{grupo.titulo}</p>
                      <div className="flex flex-col gap-1.5">
                        {items.map((a, i) => {
                          // Pedido de Diego: el color/negrita tiene que llamar la atención SOLO
                          // sobre la etiqueta inicial ("Falta cargar la clase", "Finaliza en
                          // breve", etc.) — el resto de la oración (el detalle) va en texto
                          // normal, no coloreado entero como antes. Se corta en los ":" primeros
                          // (todas las alertas se arman como "Etiqueta: detalle…" — ver arriba).
                          const idxDosPuntos = a.texto.indexOf(':');
                          const etiqueta = idxDosPuntos >= 0 ? a.texto.slice(0, idxDosPuntos) : a.texto;
                          const detalle = idxDosPuntos >= 0 ? a.texto.slice(idxDosPuntos + 1).trim() : '';
                          const colorEtiqueta =
                            a.tipo === 'actividadFaltante' || a.tipo === 'urgente' ? 'text-dangerText'
                              : a.tipo === 'finaliza' ? 'text-warningText'
                              : 'text-text';
                          const colorBorde =
                            a.tipo === 'actividadFaltante' || a.tipo === 'urgente' ? 'border-dangerText/60'
                              : a.tipo === 'finaliza' ? 'border-warningText/60'
                              : 'border-border';
                          const cls = `rounded-lg pl-3 pr-3 py-2 text-xs bg-surface2 border border-border border-l-4 ${colorBorde}`;
                          const contenido = (
                            <>
                              <span className={`font-semibold ${colorEtiqueta}`}>{etiqueta}</span>
                              {detalle && <span className="text-textSec">: {detalle}</span>}
                            </>
                          );
                          // Los conflictos de sala/feriado (tipo "warn") tienen su detalle completo en
                          // /incidencias, y una actividad de C.O. sin cargar se completa desde Salas
                          // Zoom → Agregar actividad — clickeable para ir directo ahí en vez de solo avisar acá.
                          if (a.tipo === 'warn') {
                            return (
                              <Link key={i} href="/incidencias" className={`${cls} block no-underline hover:brightness-125 transition-[filter]`}>
                                {contenido} <span className="underline text-textSec">Ver detalle →</span>
                              </Link>
                            );
                          }
                          if (a.tipo === 'actividadFaltante' && a.accion === 'cargarClase') {
                            return (
                              <Link key={i} href={a.prefillHref || '/salas-zoom'} className={`${cls} block no-underline hover:brightness-125 transition-[filter]`}>
                                {contenido} <span className="underline text-textSec">Cargar actividad →</span>
                              </Link>
                            );
                          }
                          // "Falta asignar sala": la acción está en esta misma página (más arriba,
                          // en "Salas pendientes de asignar"), así que no hace falta ningún link.
                          return <div key={i} className={cls}>{contenido}</div>;
                        })}
                      </div>
                    </div>
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
          formacionesManual={formacionesManual}
          fechaInicioHistorico={fechaInicioHistorico}
          onGuardado={cargarTodo}
        />
      )}
    </div>
  );
}

function ModalDetalleInicio({ item, onCerrar, puedeEditar, asignacionesCO, formaciones, formacionesManual, fechaInicioHistorico, onGuardado }) {
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
  // Fecha de inicio de la formación: en orden de confiabilidad, 1) la corrección a mano
  // hecha desde acá o desde Cronograma (pestaña "Formaciones" del Sheet, vía /api/formaciones),
  // 2) la confirmada a mano por Diego en lib/fechasInicioReales.js, 3) el histórico real
  // (mismo Excel que ya usa la pantalla Formaciones para este mismo dato — antes faltaba
  // acá, por eso una edición como Coaching Educativo 65 mostraba "—" en este modal aunque
  // en Formaciones sí tuviera su fecha de inicio), 4) el cálculo automático de
  // calcularFormaciones (primera clase con fecha cargada de esta edición).
  const formacionInfo = item.esFormacion ? (formaciones || []).find((f) => f.codigo === item.curso && String(f.numero) === String(item.edicion)) : null;
  const fechaInicioManual = item.esFormacion && item.curso && item.edicion
    ? (formacionesManual || []).find((m) => m.codigo === item.curso && String(m.edicion) === String(item.edicion))?.fechaInicio
    : null;
  const fechaInicioReal = fechaInicioManual
    || (item.curso && item.edicion ? FECHAS_INICIO_REALES[`${item.curso}|${item.edicion}`] : null)
    || (item.curso && item.edicion ? (fechaInicioHistorico || {})[`${item.curso}|${item.edicion}`] : null)
    || formacionInfo?.fechaInicio
    || null;
  const puedeEditarFechaInicio = item.esFormacion && !!item.curso && !!item.edicion;
  const [fechaInicioE, setFechaInicioE] = useState(fechaInicioReal || '');
  // Convierte "HH:MM" a minutos para mandarlo al PATCH (que espera nuevaHoraMin en minutos).
  function horaAMinutos(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  async function guardarTodo() {
    setGuardando(true);
    try {
      if (item.id) {
        const nuevaHoraMin = horaAMinutos(horaE);
        const body = { docente: docE, tematica: tematicaE, observaciones: observacionesE };
        if (item.esFormacion) body.staff = staffE;
        if (salaE && salaE !== item.sala) body.nuevaSala = salaE;
        if (nuevaHoraMin != null && nuevaHoraMin !== item.horaMin) body.nuevaHoraMin = nuevaHoraMin;
        const r = await fetchAutenticado(`/api/clases/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'No se pudo guardar.'); }
      }
      // La fecha de inicio de la formación vive aparte (pestaña "Formaciones" del Sheet,
      // por curso+edición) — no en la clase puntual — así que va a un endpoint distinto.
      if (puedeEditarFechaInicio && fechaInicioE !== (fechaInicioReal || '')) {
        const r2 = await fetchAutenticado('/api/formaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: item.curso, edicion: item.edicion, fechaInicio: fechaInicioE }) });
        if (!r2.ok) { const d = await r2.json().catch(() => ({})); throw new Error(d.error || 'No se pudo guardar la fecha de inicio.'); }
      }
      setEditando(false);
      if (onGuardado) await onGuardado();
    } catch (e) {
      alert(e.message || 'No se pudo guardar.');
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
          {puedeEditarFechaInicio && (
            editando ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Fecha de inicio de la formación</span>
                <input type="date" className="bg-bg border border-border rounded-lg px-2 py-1 text-sm" value={fechaInicioE} onChange={(e) => setFechaInicioE(e.target.value)} />
              </div>
            ) : (
              <Fila label="Fecha de inicio de la formación" valor={fechaInicioReal ? formatFechaCorta(fechaInicioReal) : '—'} />
            )
          )}
          {item.esFormacion && item.numeroSesion && item.total && (
            <Fila label="Clase" valor={`${item.numeroSesion} de ${item.total}`} />
          )}
          {/* Pedido de Diego (02/10/2026): que el detalle diga en qué cuatrimestre está la
              clase — solo Coaching Ontológico (48 clases, 3 cuatrimestres de 16). Mismo
              criterio que el modal de Cronograma: clases 1-16 → 1°, 17-32 → 2°, 33-48 → 3°. */}
          {item.esFormacion && item.curso === 'CO' && item.numeroSesion && (
            <Fila label="Cuatrimestre" valor={`${Math.min(Math.ceil(item.numeroSesion / 16), 3)}°`} />
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
              <p className="text-[10.5px] text-textMuted">La fecha de esta clase puntual y el curso/edición no se editan desde acá — para eso usá "Cambiar sala, postergar o cancelar esta clase" o cargala de nuevo.</p>
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
                setFechaInicioE(fechaInicioReal || '');
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

// Set de íconos de línea (trazo fino, estilo Lucide/Feather) para las tarjetas de métricas de
// Inicio — pedido de Diego (02/10/2026): "algo más premium" en vez de los emojis (📚✅🕒🏢⚠️🎓),
// que se ven distinto según el sistema operativo/navegador y desentonan con el resto del
// diseño. Siguen el mismo lenguaje visual recesivo que pide el resto de la UI: trazo 1.75,
// sin relleno, heredan el color del texto que las acompaña (currentColor) en vez de traer
// color propio — así una métrica en alerta (acento "danger"/"warning") tiñe ícono y texto por
// igual, nunca color solo.
const ICONOS_METRICA = {
  clasesHoy: <><rect x="3.25" y="4.5" width="17.5" height="15.5" rx="2" /><path d="M3.25 9h17.5M8 3v3M16 3v3" /></>,
  realizadas: <><circle cx="12" cy="12" r="8.75" /><path d="m8.5 12.3 2.4 2.4 4.6-5.1" /></>,
  proxima: <><circle cx="12" cy="12" r="8.75" /><path d="M12 7.25V12l3.25 2" /></>,
  salas: <><path d="M4 20.5V6.75L12 3l8 3.75V20.5" /><path d="M9.5 20.5v-6h5v6M4 20.5h16" /></>,
  alerta: <><path d="M10.6 4.3 2.9 18a1.7 1.7 0 0 0 1.5 2.5h15.2a1.7 1.7 0 0 0 1.5-2.5L13.4 4.3a1.7 1.7 0 0 0-2.8 0Z" /><path d="M12 10v3.5M12 17h.01" /></>,
  formaciones: <><path d="M2.75 9.5 12 5l9.25 4.5L12 14z" /><path d="M6.25 11.5v4.25C6.25 17.5 8.8 19 12 19s5.75-1.5 5.75-3.25V11.5M21.25 9.5V15" /></>
};
function IconoMetrica({ tipo, className }) {
  const contenido = ICONOS_METRICA[tipo];
  if (!contenido) return null;
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className || ''}`}>
      {contenido}
    </svg>
  );
}

function Metrica({ valor, label, icono, acento, chico, atenuada }) {
  const color = {
    success: 'text-successText', warning: 'text-warningText', danger: 'text-dangerText'
  }[acento] || 'text-text';
  // Pedido de Diego: que el texto descriptivo (la etiqueta) tenga más presencia y el número
  // no sea protagonista — se achica bastante la tipografía del valor (antes text-2xl/text-lg,
  // ahora text-base/text-sm). "Incidencias activas" en 0 se atenúa (opacity) para no competir
  // visualmente con lo que sí necesita atención, sin sacarla de la fila.
  // Pedido de Diego (02/10/2026): "Los números que estén al lado, no abajo" — el valor va al
  // lado de la etiqueta (misma fila), no debajo en una fila propia. "Que entre en una línea" —
  // el label se trunca con "…" (title= para poder leer el texto completo al pasar el mouse)
  // en vez de envolver a una segunda línea, que es lo que lo hacía ver más alto/desprolijo.
  return (
    <div className={`${metricaCls} ${atenuada ? 'opacity-55' : ''} flex items-center justify-between gap-2`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {icono && <IconoMetrica tipo={icono} className={acento ? color : 'text-textMuted'} />}
        <span className="text-[10.5px] text-textSec font-semibold leading-snug truncate" title={label}>{label}</span>
      </div>
      <div className={`${chico ? 'text-sm' : 'text-base'} font-bold leading-tight whitespace-nowrap shrink-0 ${color}`}>{valor}</div>
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
              <span className="font-semibold">{NOMBRES[c.codigo] || c.codigo}{edicionRealDeClase(c) ? ' · Edición ' + edicionRealDeClase(c) : ''}</span>
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
