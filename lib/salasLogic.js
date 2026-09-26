// Lógica de negocio de Salas Zoom, portada del prototipo HTML.
// Funciones puras — se pueden usar tanto en el servidor (API routes) como en el cliente (React).
import { CRONOGRAMA_HISTORICO } from './cronogramaHistorico';

export const DURACIONES = { CO: 120, CE: 90, CEQUI: 90, OR: 90, O: 90, CV: 90, CDEP: 90, IE: 90, ESI: 90 };
export const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5', 'Sala 6', 'Sala 7', 'Comunidad ILCE'];
export const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIAS_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
export const BUFFER_MIN = 15;
export const TOTALES = { CO: 48, CE: 16, CEQUI: 16, OR: 16, O: 16, CV: 16, CDEP: 16, IE: 16, ESI: 16 };
export const NOMBRES = {
  CO: 'Coaching Ontológico', CE: 'Coaching Educativo', CEQUI: 'Coaching de Equipos',
  OR: 'Oratoria', O: 'Oratoria', CV: 'Coaching Vocacional', CDEP: 'Coaching Deportivo',
  IE: 'Inteligencia Emocional', ESI: 'Taller ESI'
};
export const ICONOS = {
  CO: '🎓', CE: '🎓', CEQUI: '🤝', OR: '🎤', O: '🎤', CV: '🧭', CDEP: '🏃', IE: '❤️', ESI: '🛡️'
};

// Un color propio por formación, consistente en toda la app. Suave a propósito —
// se usa como franja lateral/borde/badge, nunca como fondo fuerte de una pantalla entera.
export const COLORES_FORMACION = {
  CO: { dot: 'bg-accentPurple', text: 'text-accentPurple', bg: 'bg-accentPurple/10', border: 'border-accentPurple/40' },
  CE: { dot: 'bg-infoText', text: 'text-infoText', bg: 'bg-infoText/10', border: 'border-infoText/40' },
  CEQUI: { dot: 'bg-successText', text: 'text-successText', bg: 'bg-successText/10', border: 'border-successText/40' },
  OR: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
  O: { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
  CV: { dot: 'bg-warningText', text: 'text-warningText', bg: 'bg-warningText/10', border: 'border-warningText/40' },
  CDEP: { dot: 'bg-dangerText', text: 'text-dangerText', bg: 'bg-dangerText/10', border: 'border-dangerText/40' },
  IE: { dot: 'bg-pink-400', text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/40' },
  ESI: { dot: 'bg-accentTeal', text: 'text-accentTeal', bg: 'bg-accentTeal/10', border: 'border-accentTeal/40' }
};
const COLOR_DEFAULT = { dot: 'bg-textMuted', text: 'text-textMuted', bg: 'bg-textMuted/10', border: 'border-textMuted/40' };

export function colorFormacion(codigo) {
  return COLORES_FORMACION[codigo] || COLOR_DEFAULT;
}

// Un color fijo por sala (para el cronograma, cuando se elige pintar "por sala" en vez de
// "por curso") — mismo estilo que COLORES_FORMACION, una entrada por cada una de las 8 salas.
const COLORES_SALA = {
  'Sala 1': { dot: 'bg-accentPurple', text: 'text-accentPurple', bg: 'bg-accentPurple/10', border: 'border-accentPurple/40' },
  'Sala 2': { dot: 'bg-infoText', text: 'text-infoText', bg: 'bg-infoText/10', border: 'border-infoText/40' },
  'Sala 3': { dot: 'bg-successText', text: 'text-successText', bg: 'bg-successText/10', border: 'border-successText/40' },
  'Sala 4': { dot: 'bg-orange-400', text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/40' },
  'Sala 5': { dot: 'bg-warningText', text: 'text-warningText', bg: 'bg-warningText/10', border: 'border-warningText/40' },
  'Sala 6': { dot: 'bg-dangerText', text: 'text-dangerText', bg: 'bg-dangerText/10', border: 'border-dangerText/40' },
  'Sala 7': { dot: 'bg-pink-400', text: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/40' },
  'Comunidad ILCE': { dot: 'bg-accentTeal', text: 'text-accentTeal', bg: 'bg-accentTeal/10', border: 'border-accentTeal/40' }
};

export function colorPorSala(sala) {
  return COLORES_SALA[sala] || COLOR_DEFAULT;
}

// Estado de una actividad puntual — independiente del color de formación.
export const ESTADOS = {
  normal: { label: 'Normal', dot: 'bg-successText', text: 'text-successText', bg: 'bg-successBg' },
  atencion: { label: 'Atención', dot: 'bg-warningText', text: 'text-warningText', bg: 'bg-warningBg' },
  conflicto: { label: 'Conflicto', dot: 'bg-dangerText', text: 'text-dangerText', bg: 'bg-dangerBg' },
  postergada: { label: 'Postergada', dot: 'bg-infoText', text: 'text-infoText', bg: 'bg-infoBg' },
  finalizada: { label: 'Finalizada', dot: 'bg-textMuted', text: 'text-textMuted', bg: 'bg-surface2' },
  enCurso: { label: 'En curso', dot: 'bg-accentTeal', text: 'text-accentTeal', bg: 'bg-accentTeal/10' },
  proximamente: { label: 'Próximamente', dot: 'bg-infoText', text: 'text-infoText', bg: 'bg-infoBg' }
};

export function minutosAHora(min) {
  min = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function horaAMinutos(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fechaToDia(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00');
  return DIAS_JS[d.getDay()];
}

const DIA_LINDO = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
  VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo'
};
// Pasa un día interno (LUNES, MIERCOLES...) al mismo formato con el que se carga a mano en
// "Docentes C.O." (Lunes, Miércoles con tilde) — para que las filas que generamos automático
// se vean igual que las que ya existen ahí.
export function diaLindo(diaInterno) {
  return DIA_LINDO[diaInterno] || diaInterno || '';
}

export function formatFechaCorta(fechaStr) {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  return `${d}/${m}/${y}`;
}

export function esPasada(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaStr + 'T00:00:00');
  return f < hoy;
}

// Coaching Ontológico son 48 clases en 3 cuatrimestres de 16, con 2 semanas de receso
// entre el cuatrimestre 1 y el 2 (clase 16 → 17) y entre el 2 y el 3 (clase 32 → 33) —
// en vez del salto semanal normal de 7 días, ahí el salto es de 14. El resto de las
// formaciones (16 clases, sin cuatrimestres) no tiene receso.
const RECESOS_POR_CODIGO = { CO: { 16: 14, 32: 14 } };

/** Fecha real (estimada) de la clase Nº `numero`, contando desde la clase 1 en `fechaInicioISO`,
 * saltando de a 7 días salvo en los recesos conocidos de la formación. */
export function fechaDeClaseNumero(codigo, fechaInicioISO, numero) {
  if (!fechaInicioISO || !numero || numero < 1) return null;
  const recesos = RECESOS_POR_CODIGO[codigo] || {};
  const fecha = new Date(fechaInicioISO + 'T00:00:00');
  for (let n = 1; n < numero; n++) {
    fecha.setDate(fecha.getDate() + (recesos[n] || 7));
  }
  return toISO(fecha);
}

/** Fecha estimada de la última clase (finalización) de una edición de `total` clases. */
export function calcularFechaFinCurso(codigo, fechaInicioISO, total) {
  return fechaDeClaseNumero(codigo, fechaInicioISO, total);
}

/**
 * Para una edición NUEVA de Coaching Ontológico que arranca en `fechaInicioISO`, calcula
 * el rango estimado (desde/hasta) de cada uno de los 3 cuatrimestres (clases 1-16, 17-32,
 * 33-48) — reutilizando la misma cadencia real (7 días entre clases, +14 de receso entre
 * cuatrimestres) que ya usa `fechaDeClaseNumero`/la reserva real de clases. Es una
 * ESTIMACIÓN para mostrar en el formulario de creación: a diferencia de la reserva real,
 * no descuenta feriados (eso implicaría consultar el calendario de feriados solo para una
 * vista previa), así que las fechas reales pueden correrse algunos días si hay feriados
 * de por medio en el camino.
 */
export function calcularRangosCuatrimestresCO(fechaInicioISO) {
  if (!fechaInicioISO) return null;
  const limites = [[1, 16], [17, 32], [33, 48]];
  return limites.map(([desdeN, hastaN]) => ({
    desde: fechaDeClaseNumero('CO', fechaInicioISO, desdeN),
    hasta: fechaDeClaseNumero('CO', fechaInicioISO, hastaN)
  }));
}

/** Cuántas clases (1..total) ya deberían haber pasado a `hoyISO`, respetando recesos. */
export function claseActualPorFecha(codigo, fechaInicioISO, total, hoyISO) {
  if (!fechaInicioISO || !total) return null;
  hoyISO = hoyISO || toISO(new Date());
  let cargadas = 1;
  for (let n = 2; n <= total; n++) {
    const f = fechaDeClaseNumero(codigo, fechaInicioISO, n);
    if (!f || f > hoyISO) break;
    cargadas = n;
  }
  return Math.min(cargadas, total);
}

/** Para cada clase CON fecha, en qué posición (1,2,3…) cae dentro de su edición — contando
 * cuántas clases con fecha de esa misma edición ya se cargaron, ordenadas cronológicamente.
 * Es más confiable que el campo Numero (que en la práctica se carga con el Nº de edición,
 * no con el Nº de sesión) — mismo criterio que ya usa la pantalla de Cronograma. */
export function calcularNumeroSesion(clases) {
  const sesionPorId = {};
  const grupos = {};
  clases.filter((c) => c.fecha).forEach((c) => {
    const key = `${c.codigo}|${c.numero}`;
    (grupos[key] = grupos[key] || []).push(c);
  });
  Object.values(grupos).forEach((grupo) => {
    const ordenado = [...grupo].sort((a, b) => a.fecha.localeCompare(b.fecha));
    ordenado.forEach((c, idx) => { sesionPorId[c.id] = idx + 1; });
  });
  return sesionPorId;
}

/**
 * Agrupa las clases por (día, hora, sala) — así una serie de 16 clases con la misma
 * franja semanal se muestra como UNA sola (la próxima vigente), no 16 filas repetidas.
 */
export function agruparParaVista(clases) {
  const grupos = {};
  clases.forEach((c) => {
    const key = `${c.dia}|${c.horaMin}|${c.sala}`;
    (grupos[key] = grupos[key] || []).push(c);
  });
  const resultado = [];
  Object.values(grupos).forEach((grupo) => {
    if (grupo.length === 1) {
      const c = grupo[0];
      resultado.push({ ...c, pasada: esPasada(c.fecha), serieTotal: 1, serieIndex: 1 });
      return;
    }
    const ordenado = [...grupo].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    let repIdx = ordenado.findIndex((c) => !esPasada(c.fecha));
    if (repIdx === -1) repIdx = ordenado.length - 1;
    const rep = ordenado[repIdx];
    const todasPasadas = ordenado.every((c) => esPasada(c.fecha));
    resultado.push({ ...rep, pasada: todasPasadas, serieTotal: ordenado.length, serieIndex: repIdx + 1 });
  });
  return resultado;
}

export const NOMBRES_OTRO = {
  OTRO_Copywriting: 'Copywriting para redes sociales', OTRO_Mindfulness: 'Mindfulness',
  OTRO_Formador: 'Formador para formadores', OTRO_PNL: 'PNL'
};

export function nombreCurso(cursoVal) {
  if (!cursoVal) return '';
  return NOMBRES[cursoVal] || NOMBRES_OTRO[cursoVal] || cursoVal;
}

/** Chequea disponibilidad de las 8 salas para un día/hora/duración puntual. */
export function chequearDisponibilidad(clases, dia, horaMin, duracion) {
  const inicioProp = horaMin - BUFFER_MIN;
  const finProp = horaMin + duracion;
  const ocupadas = {};
  clases.filter((c) => c.dia === dia).forEach((c) => {
    const ai = c.horaMin - BUFFER_MIN, af = c.horaMin + c.duracion;
    if (inicioProp < af && ai < finProp && !ocupadas[c.sala]) ocupadas[c.sala] = c;
  });
  const libres = SALAS.filter((s) => !ocupadas[s]);
  return { ocupadas, libres };
}

function quitarAcentos(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarDia(s) {
  s = s.toUpperCase().trim();
  s = quitarAcentos(s);
  return s.replace('SABADOS', 'SABADO');
}

function normalizarSala(s) {
  s = s.trim();
  if (/comunidad/i.test(s)) return 'Comunidad ILCE';
  const m = s.match(/(\d+)/);
  if (m) return 'Sala ' + m[1];
  return null;
}

/** Parsea una línea del formato "DIA HH:MM CODIGO NUMERO Sala N" (carga masiva del horario). */
export function parsearLineaHorario(linea) {
  linea = linea.trim();
  if (!linea) return null;
  const m = linea.match(/^(\S+)\s+(\d{1,2}[:.]\d{2})\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s*(\d+)?\s*(?:-|—)?\s*(?:Sala|SALA|sala)\s*(.+)$/i);
  if (!m) return { error: `No pude interpretar: "${linea}"` };
  const dia = normalizarDia(m[1]);
  if (!DIAS.includes(dia)) return { error: `Día no reconocido en: "${linea}"` };
  const horaMin = horaAMinutos(m[2]);
  if (horaMin === null) return { error: `Hora inválida en: "${linea}"` };
  const codigo = m[3].toUpperCase();
  if (!(codigo in DURACIONES)) return { error: `Código no reconocido "${codigo}" en: "${linea}"` };
  const numero = m[4] || '';
  const sala = normalizarSala(m[5]);
  if (!sala) return { error: `No pude identificar la sala en: "${linea}"` };
  const duracion = DURACIONES[codigo];
  const label = codigo + (numero ? ' ' + numero : '');
  return { dia, horaMin, codigo, numero, sala, label, duracion, edicion: '1' };
}

/** Resumen por curso+edición: fecha inicio/fin, estado, progreso y próxima clase. */
/**
 * A partir del histórico real (fechas verdaderas de clases que ya pasaron), calcula qué
 * ediciones puntuales (curso+número) ya finalizaron — asumiendo 1 clase por semana desde
 * la fecha de inicio real hasta completar el total de clases del curso.
 * Devuelve un Set de claves "CODIGO|NUMERO" para poder chequear rápido `set.has(clave)`.
 * Se comparte entre Formaciones e Inicio para que las dos pantallas digan lo mismo.
 */
export function calcularEdicionesFinalizadas(historico) {
  const grupos = {};
  historico.filter((h) => h.tipo === 'Formación' && h.edicion && h.fecha).forEach((h) => {
    const key = `${h.curso}|${h.edicion}`;
    (grupos[key] = grupos[key] || []).push(h);
  });

  const hoyISO = new Date().toISOString().slice(0, 10);
  const finalizadas = new Set();

  Object.keys(grupos).forEach((key) => {
    const grupo = grupos[key];
    const codigo = grupo[0].curso;
    const total = parseInt(grupo[0].clasesTotal, 10) || TOTALES[codigo] || null;
    if (!total) return;
    const fechaInicio = grupo.map((h) => h.fecha).sort()[0];
    const fin = calcularFechaFinCurso(codigo, fechaInicio, total);
    if (fin && fin < hoyISO) finalizadas.add(key);
  });

  return finalizadas;
}

export function calcularFormaciones(clases) {
  const grupos = {};
  // Se agrupa por curso+número (ej: "CO 45", "CO 48" son DOS cursados distintos de CO
  // corriendo en paralelo, cada uno en su sala/horario) — no por "edición", que nunca se
  // captura realmente en el formato de carga del horario y antes mezclaba todo en una sola
  // tarjeta con un progreso incorrecto.
  clases.forEach((c) => {
    if (!c.numero) return; // sin número no hay forma de saber en qué clase va
    const key = `${c.codigo}|${c.numero}`;
    (grupos[key] = grupos[key] || []).push(c);
  });
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyISO = toISO(hoy);

  return Object.keys(grupos).map((key) => {
    const [codigo, numero] = key.split('|');
    const grupo = grupos[key];
    const patron = grupo.find((c) => c.dia && c.horaMin != null);
    const conFecha = grupo.filter((c) => c.fecha);
    const fechas = conFecha.map((c) => c.fecha).sort();
    const fechaInicio = fechas[0] || null;
    const fechaFinal = fechas[fechas.length - 1] || null;
    const total = TOTALES[codigo] || null;
    // Cuántas sesiones con fecha ya pasaron para esta edición — más confiable que leer
    // directamente el campo Numero (que en la práctica se carga con el Nº de edición,
    // el mismo para todas las filas, no con el Nº de sesión real).
    const cargadas = conFecha.filter((c) => c.fecha <= hoyISO).length || parseInt(numero, 10) || 0;
    const finalPasado = fechaFinal ? new Date(fechaFinal + 'T00:00:00') < hoy : false;
    const completo = total && cargadas >= total;
    const estado = completo && finalPasado ? 'Finalizó' : 'En proceso';
    const pct = total ? Math.min(100, Math.round((cargadas / total) * 100)) : null;

    let proximaTxt;
    const proximaConFecha = conFecha.filter((c) => c.fecha >= hoyISO).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    if (proximaConFecha) {
      proximaTxt = `${formatFechaCorta(proximaConFecha.fecha)} (Clase ${proximaConFecha.numero})`;
    } else if (estado === 'Finalizó') {
      proximaTxt = '—';
    } else {
      // Sin fecha puntual todavía: mostrar el patrón recurrente (día/hora) del horario semanal.
      proximaTxt = patron ? `${patron.dia.charAt(0)}${patron.dia.slice(1).toLowerCase()} ${minutosAHora(patron.horaMin)} (recurrente)` : 'Sin agendar';
    }

    // Cuatrimestre: SOLO existe para Coaching Ontológico (el único curso de 48 clases),
    // que se cursa en 3 bloques de 16 con 2 semanas de receso entre cada uno — Clase 1-16 =
    // 1er cuatrimestre, 17-32 = 2do, 33-48 = 3ro. El resto de los cursos tiene 16 clases en
    // total (un solo cuatrimestre completo, no tres) y no debe aparecer bajo ningún filtro
    // de "1er/2do/3er cuatrimestre" — antes se les asignaba igual cuatrimestre=1 y por eso
    // se colaban en el filtro "1er cuatrimestre" junto con Ontológico.
    const cuatrimestre = total === 48 ? Math.min(Math.ceil(cargadas / 16), 3) || 1 : null;

    return { codigo, edicion: numero, numero, fechaInicio, fechaFinal, estado, cargadas, total, pct, proximaTxt, cuatrimestre, patronDia: patron ? patron.dia : null, patronHora: patron ? patron.horaMin : null, patronDur: patron ? (patron.duracion || null) : null };
  }).sort((a, b) => a.codigo.localeCompare(b.codigo) || (parseInt(a.numero, 10) - parseInt(b.numero, 10)));
}

/**
 * Dado el historial de períodos de Docentes C.O. (Sheet + fijos), encuentra el período
 * aplicable para una edición y fecha dadas: el que ya arrancó y todavía no terminó a esa
 * fecha (el de "desde" más reciente entre esos), o si no hay fecha o ninguno coincide, el
 * de "desde" más reciente entre todos los de esa edición.
 */
export function buscarPeriodoCO(asignaciones, edicion, fechaISO) {
  const deLaEdicion = (asignaciones || []).filter((a) => String(a.edicion) === String(edicion));
  if (deLaEdicion.length === 0) return null;
  const yaArrancados = fechaISO
    ? deLaEdicion.filter((a) => (!a.desde || a.desde <= fechaISO) && (!a.hasta || a.hasta >= fechaISO))
    : [];
  const candidatos = yaArrancados.length > 0 ? yaArrancados : deLaEdicion;
  return candidatos.reduce((mejor, a) => (!mejor || (a.desde || '') > (mejor.desde || '') ? a : mejor), null);
}

/**
 * El horario semanal recurrente de una Formación (la fila sin fecha puntual, la misma que
 * usa "Salas Zoom" para reservar sesión a sesión) queda cargado para siempre, aunque esa
 * edición ya haya terminado de verdad — y entonces la sala sigue apareciendo "ocupada" en
 * los choques mucho después de que en la realidad ya quedó libre. Se descartan del chequeo
 * de choques (no de la agenda ni del resto de la app) las filas sin fecha que pertenezcan a
 * una edición ya finalizada.
 *
 * "Finalizada" se chequea de DOS formas, porque ninguna sola alcanza: calcularFormaciones
 * (a partir de las filas crudas de "Clases") solo la marca así cuando el horario en vivo
 * tiene cargadas todas sus sesiones con fecha — pero muchas ediciones viejas (como CE 62)
 * quedan con menos sesiones cargadas de las reales en "Clases", y sin embargo el histórico
 * real (CRONOGRAMA_HISTORICO, la misma fuente que ya usan Formaciones e Inicio vía
 * calcularEdicionesFinalizadas) sí sabe que ya terminaron. Antes acá solo se miraba
 * calcularFormaciones, y por eso Incidencias seguía marcando como "superpuesta" una edición
 * que Formaciones ya mostraba como Finalizada al 100%.
 */
function clasesVigentesParaChoques(clases) {
  const finalizadas = new Set(
    calcularFormaciones(clases).filter((f) => f.estado === 'Finalizó').map((f) => `${f.codigo}|${f.numero}`)
  );
  const finalizadasHistorico = calcularEdicionesFinalizadas(CRONOGRAMA_HISTORICO);
  return clases.filter((c) => !(c.numero && !c.fecha && (finalizadas.has(`${c.codigo}|${c.numero}`) || finalizadasHistorico.has(`${c.codigo}|${c.numero}`))));
}

/** Alertas automáticas: choques de sala, clases en feriado, ediciones por terminar. */
/**
 * Devuelve la lista detallada de pares de clases que chocan (misma sala, día, horario que
 * se pisa). `asignacionesCO` (opcional) es el historial de Docentes C.O., para completar
 * docente/staff de Coaching Ontológico cuando la clase en sí no los tiene cargados.
 */
export function calcularConflictosDetalle(clasesOriginales, asignacionesCO) {
  const clases = clasesVigentesParaChoques(clasesOriginales);
  const porSalaDia = {};
  clases.forEach((c) => {
    const key = `${c.sala}|${c.dia}`;
    (porSalaDia[key] = porSalaDia[key] || []).push(c);
  });
  const conflictos = [];
  Object.values(porSalaDia).forEach((grupo) => {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i], b = grupo[j];
        if (a.fecha && b.fecha && a.fecha !== b.fecha) continue;
        const ai = a.horaMin - BUFFER_MIN, af = a.horaMin + a.duracion;
        const bi = b.horaMin - BUFFER_MIN, bf = b.horaMin + b.duracion;
        if (ai < bf && bi < af) {
          const info = (c) => {
            // El campo "Numero" es, en la práctica, el que identifica la edición real (ver
            // comentario en calcularFormaciones) — "Edicion" en la fila casi siempre quedó
            // en su valor por defecto ('1') sin cargar de verdad.
            const edicionReal = c.numero || c.edicion || '';
            let docente = c.docente || '', staff = c.staff || '';
            if (!docente || !staff) {
              if (c.codigo === 'CO' && edicionReal) {
                const periodo = buscarPeriodoCO(asignacionesCO, edicionReal, c.fecha);
                if (periodo) { docente = docente || periodo.docente || ''; staff = staff || periodo.staff || ''; }
              } else if (edicionReal) {
                // Para el resto de los cursos no hay un sheet de períodos aparte — se busca
                // docente/staff en cualquier otra clase ya cargada de esa misma edición
                // (mismo curso+número), que suele repetirse igual en todas sus sesiones.
                const hermana = clases.find((o) =>
                  o !== c && o.codigo === c.codigo && (o.numero || o.edicion || '') === edicionReal && (o.docente || o.staff)
                );
                if (hermana) { docente = docente || hermana.docente || ''; staff = staff || hermana.staff || ''; }
              }
            }
            return {
              id: c.id, label: c.label, horaMin: c.horaMin, duracion: c.duracion, fecha: c.fecha,
              codigo: c.codigo, edicion: edicionReal, docente, staff, observaciones: c.observaciones || ''
            };
          };
          conflictos.push({
            sala: a.sala, dia: a.dia,
            claseA: info(a), claseB: info(b)
          });
        }
      }
    }
  });
  return conflictos;
}

export function calcularAlertas(clases, feriados) {
  const alertas = [];
  const porSalaDia = {};
  clasesVigentesParaChoques(clases).forEach((c) => {
    const key = `${c.sala}|${c.dia}`;
    (porSalaDia[key] = porSalaDia[key] || []).push(c);
  });
  let choques = 0;
  Object.values(porSalaDia).forEach((grupo) => {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i], b = grupo[j];
        if (a.fecha && b.fecha && a.fecha !== b.fecha) continue;
        const ai = a.horaMin - BUFFER_MIN, af = a.horaMin + a.duracion;
        const bi = b.horaMin - BUFFER_MIN, bf = b.horaMin + b.duracion;
        if (ai < bf && bi < af) choques++;
      }
    }
  });
  if (choques > 0) alertas.push({ tipo: 'warn', texto: `${choques} clase(s) superpuestas en la misma sala.` });

  const enFeriado = clases.filter((c) => c.fecha && feriados.some((f) => f.fecha === c.fecha && f.bloquea)).length;
  if (enFeriado > 0) alertas.push({ tipo: 'warn', texto: `${enFeriado} clase(s) cargada(s) justo en un feriado.` });

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const en14 = new Date(hoy); en14.setDate(en14.getDate() + 14);
  const grupos = {};
  clases.filter((c) => c.fecha && c.numero).forEach((c) => {
    // Agrupar por curso+número real de edición (Numero), no por el campo Edicion — ver
    // comentario en calcularFormaciones: ese campo casi nunca se carga y queda en '1'.
    const key = `${c.codigo}|${c.numero}`;
    (grupos[key] = grupos[key] || []).push(c);
  });
  let porTerminar = 0;
  Object.entries(grupos).forEach(([key, grupo]) => {
    const [codigo] = key.split('|');
    const total = TOTALES[codigo];
    if (!total) return;
    const cargadas = new Set(grupo.map((c) => c.numero)).size;
    const ultimaFecha = grupo.map((c) => c.fecha).sort().slice(-1)[0];
    const f = new Date(ultimaFecha + 'T00:00:00');
    if (cargadas >= total - 2 && f >= hoy && f <= en14) porTerminar++;
  });
  if (porTerminar > 0) alertas.push({ tipo: 'info', texto: `${porTerminar} edición(es) por terminar en los próximos 14 días.` });

  return alertas;
}
