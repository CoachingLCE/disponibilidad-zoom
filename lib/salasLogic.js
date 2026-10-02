// Lógica de negocio de Salas Zoom, portada del prototipo HTML.
// Funciones puras — se pueden usar tanto en el servidor (API routes) como en el cliente (React).
import { CRONOGRAMA_HISTORICO } from './cronogramaHistorico';
import { FECHAS_INICIO_REALES } from './fechasInicioReales';
import { HORARIO_EJEMPLO } from './horarioEjemplo';

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

// ---------------------------------------------------------------------------------------
// ÚNICO lugar donde se decide "¿a qué edición pertenece esta clase?" — la pregunta que
// antes cada pantalla (y cada función acá mismo) respondía leyendo directamente c.numero,
// asumiendo que ese campo siempre identifica la edición. Eso era cierto para las clases
// viejas (una sola fila recurrente por edición: el campo Edicion quedó pisado en "1" desde
// que se armó el Sheet, y el número de edición real es Numero — ver el resto de este
// archivo). Pero las clases cargadas con "cargar edición completa" (varias filas, una por
// clase, ej. las 48 de una edición de C.O.) SÍ llenan Edicion correctamente con el número
// real y usan Numero para "Nº de esta clase" (1, 2, 3…) — tal como lo pide el propio
// formulario de Salas Zoom ("Edición" y "Nº de esta clase" son dos campos separados ahí).
// Si se sigue leyendo c.numero como si fuera la edición en este segundo caso, cada clase de
// la serie se ve como una edición nueva de una sola clase (bug real, reportado por Diego
// con la edición 56 de C.O. el 30/09/2026: se veían "Edición 1, 2, 3… 48" en vez de UNA
// edición 56 con 48 clases).
//
// Regla: si Edicion vino cargado y NO es el valor por default "1", es el dato confiable
// (formato nuevo). Si no, se cae al criterio viejo (Numero). Única zona gris: una edición
// nueva cuyo número real fuera literalmente "1" cargada con "edición completa" — caso raro
// (las ediciones actuales de C.O. ya van por el 50+), y si pasara, cada clase se seguiría
// viendo por separado como antes de este fix, no se pierde ningún dato.
export function edicionRealDeClase(c) {
  const edicion = (c.edicion || '').toString().trim();
  if (edicion && edicion !== '1') return edicion;
  return (c.numero || '').toString().trim();
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
  // Agrupa por edición REAL (edicionRealDeClase) — agrupar directo por c.numero rompía las
  // ediciones cargadas como "edición completa" (una fila por clase, Numero = Nº de esa
  // clase): cada fila quedaba en su propio grupo de una sola clase, y todas terminaban
  // mostrando "sesión 1" en vez de su posición real dentro de la edición.
  clases.filter((c) => c.fecha).forEach((c) => {
    const key = `${c.codigo}|${edicionRealDeClase(c)}`;
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

// ---------------------------------------------------------------------------------------
// Choques de horario (sala y docente) — ÚNICO lugar donde se decide "¿esta clase existente
// `c` choca con este día/hora/duración que estoy por reservar/mover?". Antes esta pregunta
// se respondía por separado (y de formas levemente distintas, con bugs distintos) en 4
// lugares: chequearDisponibilidad, el aviso de choque de docente al reservar, el chequeo de
// sala al agregar una Actividad, y el chequeo de sala al editar una clase existente (PATCH).
// Pedido de Diego: "necesito que la info de una clase esté en un mismo lugar". Ahora los 4
// llaman a las funciones de acá.
//
// `fechaExacta` distingue los dos casos posibles:
//  - Sin fechaExacta (reservar/mover un horario SEMANAL fijo): choca con cualquier
//    ocurrencia de ese día de la semana que no haya pasado ya — una edición finalizada
//    (todas sus fechas en el pasado) libera el horario para siempre, no solo esa semana.
//  - Con fechaExacta (una actividad puntual, o una clase que YA tiene fecha propia):
//    choca solo con clases de esa fecha exacta, o con horarios recurrentes sin fecha propia
//    (esos sí representan un compromiso semanal vigente).
// ---------------------------------------------------------------------------------------
function seSolapaHorario(c, dia, horaMin, duracion, fechaExacta) {
  if (c.dia !== dia) return false;
  if (fechaExacta) {
    if (c.fecha && c.fecha !== fechaExacta) return false;
  } else if (esPasada(c.fecha)) {
    return false;
  }
  const inicioProp = horaMin - BUFFER_MIN, finProp = horaMin + duracion;
  const ai = c.horaMin - BUFFER_MIN, af = c.horaMin + c.duracion;
  return inicioProp < af && ai < finProp;
}

/** Busca, entre `clases`, una que choque de horario en la sala pedida (o `null`).
 * `excluirId` se usa al editar una clase existente, para no chocar contra sí misma. */
export function buscarChoqueSala(clases, sala, dia, horaMin, duracion, { fecha, excluirId } = {}) {
  if (!sala) return null;
  return clases.find((c) => c.id !== excluirId && c.sala === sala && seSolapaHorario(c, dia, horaMin, duracion, fecha)) || null;
}

/** Busca, entre `clases`, una que choque de horario con el mismo docente (o `null`) —
 * un docente no puede dar dos clases a la vez, sin importar la sala. */
export function buscarChoqueDocente(clases, docente, dia, horaMin, duracion, { fecha, excluirId } = {}) {
  if (!docente || !docente.trim()) return null;
  const buscado = docente.trim().toLowerCase();
  return clases.find((c) =>
    c.id !== excluirId && (c.docente || '').trim().toLowerCase() === buscado && seSolapaHorario(c, dia, horaMin, duracion, fecha)
  ) || null;
}

/** Chequea disponibilidad de las 8 salas para un día/hora/duración puntual (horario semanal,
 * salvo que se pase `fecha` para chequear solo esa fecha exacta — ver seSolapaHorario). */
export function chequearDisponibilidad(clases, dia, horaMin, duracion, fecha) {
  const ocupadas = {};
  clases.forEach((c) => {
    if (seSolapaHorario(c, dia, horaMin, duracion, fecha) && !ocupadas[c.sala]) ocupadas[c.sala] = c;
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
  // Se agrupa por curso+edición REAL (edicionRealDeClase, ver más arriba) — ej: "CO 45",
  // "CO 48" son DOS cursados distintos de CO corriendo en paralelo, cada uno en su
  // sala/horario. Antes se agrupaba directo por c.numero, que solo identifica la edición
  // en el formato viejo (una fila recurrente por edición) — una edición cargada como
  // "edición completa" (varias filas, una por clase) quedaba partida en tantos grupos
  // falsos como clases tuviera.
  clases.forEach((c) => {
    const edicion = edicionRealDeClase(c);
    if (!edicion) return; // sin edición no hay forma de saber en qué clase va
    const key = `${c.codigo}|${edicion}`;
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

// Sala (y día/horario) REAL de cada edición vigente, confirmada por Diego contra las 7
// cuentas de Zoom una por una (ver el comentario de HORARIO_EJEMPLO en horarioEjemplo.js) —
// es la única fuente que tiene la sala de un curso que no sea Coaching Ontológico (que no
// tiene su propia tabla de períodos como Docentes C.O.). Se parsea una sola vez acá mismo
// reusando `parsearLineaHorario` (la misma función que ya valida el texto cuando Diego lo
// pega en "Cargar horario" de Salas Zoom), así no hay que mantener la info escrita dos veces
// en dos formatos distintos. Pedido de Diego (02/10/2026): "YA TE PASE SALAS" / "TAMBIEN TE
// PASE EL USO DE LAS SALAS ACTUALES, DEBERIA CONTABILIZAR" — antes esto solo se usaba para
// precargar un textarea y no alimentaba ningún cálculo real de la app.
const SALA_CONFIRMADA_POR_EDICION = (() => {
  const out = {};
  HORARIO_EJEMPLO.split('\n').forEach((linea) => {
    const r = parsearLineaHorario(linea);
    if (!r || r.error || !r.numero) return;
    out[`${r.codigo}|${r.numero}`] = { dia: r.dia, horaMin: r.horaMin, sala: r.sala };
  });
  return out;
})();

/**
 * ÚNICA función que combina TODAS las fuentes de información de una edición (fecha de
 * inicio/fin, cuántas clases lleva, estado). Antes cada pantalla armaba su propia mezcla a
 * mano (Inicio miraba unas fuentes, Formaciones miraba otras) y por eso la MISMA edición
 * podía mostrar datos distintos —o directamente faltantes— según qué pantalla la mostrara
 * (ej: Coaching Educativo 65 tenía fecha de inicio en Formaciones pero no en el detalle de
 * Inicio). Pedido de Diego (30/09/2026): que la información de una edición "viva en un solo
 * lugar" — de acá en más, CUALQUIER pantalla que necesite datos de una edición llama a esta
 * función en vez de recalcular por su cuenta.
 *
 * Fuentes, de más a menos confiable (cada una puede pisar el dato de la anterior):
 *   1. calcularFormaciones(clases) — lo que dice el horario en vivo de Salas Zoom.
 *   2. CRONOGRAMA_HISTORICO — el Excel viejo importado como referencia (fechas reales de
 *      clases que ya pasaron, incluye ediciones que ya no tienen sala en el horario).
 *   3. FECHAS_INICIO_REALES — fechas de inicio confirmadas a mano por Diego.
 *   4. formacionesManual (pestaña "Formaciones" del Sheet, api/formaciones) — la única
 *      editable en vivo desde la propia app, por eso pisa a todas las anteriores.
 *   5. SALA_CONFIRMADA_POR_EDICION (ver arriba) — pisa día/horario (más al día que el Excel
 *      viejo) y agrega la sala, que ninguna fuente anterior tiene.
 *   6. asignacionesCO (períodos de Docentes C.O., fijos + Sheet) — SOLO para Coaching
 *      Ontológico, pisa a todas las anteriores: día/horario/docente/sala del período vigente
 *      hoy, que cambia por cuatrimestre y por eso es más específico que el horario semanal
 *      genérico de SALA_CONFIRMADA_POR_EDICION.
 *
 * `clases`, `formacionesManual` y `asignacionesCO` son los únicos parámetros porque son los
 * únicos que cambian según lo que devuelva la API en cada carga — CRONOGRAMA_HISTORICO,
 * FECHAS_INICIO_REALES y SALA_CONFIRMADA_POR_EDICION son fijos, así que la función los usa
 * directo, sin necesidad de que cada pantalla se los tenga que pasar.
 */
export function calcularFormacionesEnriquecidas(clases, formacionesManual, asignacionesCO) {
  const manualArr = formacionesManual || [];
  const periodosCO = asignacionesCO || [];
  const hoyISOParaPeriodos = new Date().toISOString().slice(0, 10);

  const historicoPorEdicion = (() => {
    const grupos = {};
    CRONOGRAMA_HISTORICO.filter((h) => h.tipo === 'Formación' && h.edicion && h.fecha).forEach((h) => {
      const key = `${h.curso}|${h.edicion}`;
      (grupos[key] = grupos[key] || []).push(h);
    });
    const out = {};
    Object.keys(grupos).forEach((key) => {
      const grupo = grupos[key];
      const fechas = grupo.map((h) => h.fecha).sort();
      // Día/hora/docente de la clase más vieja cargada (el "kickoff"): al ser un curso
      // semanal de horario fijo, sirve como el horario recurrente de TODA la edición —
      // lo usa `entradaHoyFormacionSinLive` más abajo para poder mostrar en "Agenda de
      // hoy"/Cronograma una edición que ya no tiene ninguna fila viva en Salas Zoom
      // (ej: Coaching Deportivo, que nunca se migra ahí — pedido de Diego, 30/09/2026).
      const filaInicio = grupo.find((h) => h.fecha === fechas[0]) || grupo[0];
      out[key] = {
        fechaInicio: fechas[0], fechaFinal: fechas[fechas.length - 1],
        cargadas: grupo.length, total: parseInt(grupo[0].clasesTotal, 10) || null,
        dia: filaInicio.dia || null, horaMin: filaInicio.horaMin ?? null, docente: filaInicio.docente || ''
      };
    });
    Object.keys(FECHAS_INICIO_REALES).forEach((key) => {
      out[key] = { cargadas: 0, total: null, ...out[key], fechaInicio: FECHAS_INICIO_REALES[key] };
    });
    manualArr.forEach((m) => {
      if (!m.fechaInicio) return;
      const key = `${m.codigo}|${m.edicion}`;
      out[key] = { cargadas: 0, total: null, ...out[key], fechaInicio: m.fechaInicio };
    });
    // Horario y sala confirmados contra Zoom (ver SALA_CONFIRMADA_POR_EDICION más arriba) —
    // pisa día/horario de CRONOGRAMA_HISTORICO (que puede estar desactualizado si el curso
    // cambió de horario/sala desde que arrancó) y agrega la sala. No crea una edición nueva
    // de la nada (si `out[key]` no existe todavía es porque ninguna fuente anterior sabe su
    // fecha de inicio, y sin eso no se puede calcular nada) — solo completa una que ya existe.
    Object.entries(SALA_CONFIRMADA_POR_EDICION).forEach(([key, datos]) => {
      if (!out[key]) return;
      out[key] = { ...out[key], dia: datos.dia, horaMin: datos.horaMin, sala: datos.sala };
    });
    // Período de Docentes C.O. vigente HOY para cada edición — pisa día/horario/docente y
    // agrega sala (que ninguna otra fuente de acá arriba tiene). Se usa el período vigente a
    // la fecha de HOY como valor por defecto de la edición; `entradasFuturasFormacionSinLive`
    // más abajo vuelve a consultar Docentes C.O. por cada clase puntual, porque en C.O. el
    // docente/sala/horario cambia por cuatrimestre (16 clases) y no hay que arrastrar el de
    // hoy a cuatrimestres futuros que todavía no tengan período cargado.
    const edicionesCO = [...new Set(periodosCO.map((a) => String(a.edicion)))];
    edicionesCO.forEach((edicion) => {
      const periodo = buscarPeriodoCO(periodosCO, edicion, hoyISOParaPeriodos);
      if (!periodo) return;
      const key = `CO|${edicion}`;
      const m = String(periodo.horario || '').match(/(\d{1,2})[.:hH](\d{2}).*?(\d{1,2})[.:hH](\d{2})/);
      out[key] = {
        ...out[key],
        dia: periodo.dia || out[key]?.dia || null,
        horaMin: m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : (out[key]?.horaMin ?? null),
        docente: periodo.docente || out[key]?.docente || '',
        sala: periodo.sala || out[key]?.sala || ''
      };
    });
    return out;
  })();

  const base = calcularFormaciones(clases);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const enriquecidas = base.map((f) => {
    const historico = historicoPorEdicion[`${f.codigo}|${f.numero}`];
    const manual = manualArr.find((m) => m.codigo === f.codigo && m.edicion === f.numero);

    if (historico) {
      const total = historico.total || f.total;
      const fechaFinalEstimada = manual?.fechaFinal || f.fechaFinal || calcularFechaFinCurso(f.codigo, historico.fechaInicio, total);
      const finalPasado = fechaFinalEstimada ? fechaFinalEstimada < hoyISO : false;
      let cargadasEstimadas = Math.max(historico.cargadas, claseActualPorFecha(f.codigo, historico.fechaInicio, total, hoyISO) || 0);
      if ((manual?.fechaFinal || f.fechaFinal) && !finalPasado) cargadasEstimadas = Math.min(cargadasEstimadas, total - 1);
      const completo = total && cargadasEstimadas >= total;
      const estado = manual?.estado === 'Finalizó' || finalPasado || (!(manual?.fechaFinal || f.fechaFinal) && completo) ? 'Finalizó' : 'En proceso';
      const pct = total ? Math.min(100, Math.round((cargadasEstimadas / total) * 100)) : null;
      const cuatrimestre = total === 48 ? Math.min(Math.ceil(cargadasEstimadas / 16), 3) || 1 : null;
      return {
        ...f, fechaInicio: historico.fechaInicio, fechaFinal: fechaFinalEstimada,
        cargadas: Math.min(cargadasEstimadas, total), total, estado, pct, cuatrimestre,
        proximaTxt: estado === 'Finalizó' ? '—' : f.proximaTxt
      };
    }

    if (!manual) return f;

    let fechaFinal = manual.fechaFinal || f.fechaFinal;
    if (!fechaFinal && manual.fechaInicio && f.total) {
      const est = new Date(manual.fechaInicio + 'T00:00:00');
      est.setDate(est.getDate() + (f.total - 1) * 7);
      fechaFinal = est.toISOString().slice(0, 10);
    }
    const finalPasado = fechaFinal ? fechaFinal < hoyISO : false;
    const estado = manual.estado === 'Finalizó' || finalPasado ? 'Finalizó' : f.estado;

    return {
      ...f,
      fechaInicio: manual.fechaInicio || f.fechaInicio,
      fechaFinal: fechaFinal || f.fechaFinal,
      estado,
      pct: estado === 'Finalizó' ? 100 : f.pct
    };
  });

  // Ediciones que ya no tienen sala en el horario en vivo, pero SÍ están en el histórico —
  // se agregan como tarjetas propias, calculadas 100% desde el histórico, para que no
  // desaparezcan de golpe apenas dejan de ocupar un lugar en el horario semanal.
  const presentes = new Set(enriquecidas.map((f) => `${f.codigo}|${f.numero}`));
  const soloHistoricas = Object.entries(historicoPorEdicion)
    .filter(([key]) => !presentes.has(key))
    .map(([key, historico]) => {
      const [codigo, numero] = key.split('|');
      const total = historico.total || TOTALES[codigo] || null;
      if (!total) return null;
      const fechaFinalEstimada = calcularFechaFinCurso(codigo, historico.fechaInicio, total);
      const cargadasEstimadas = Math.max(historico.cargadas, claseActualPorFecha(codigo, historico.fechaInicio, total, hoyISO) || 0);
      const finalPasado = fechaFinalEstimada < hoyISO;
      const completo = cargadasEstimadas >= total;
      const estado = completo || finalPasado ? 'Finalizó' : 'En proceso';
      const pct = Math.min(100, Math.round((cargadasEstimadas / total) * 100));
      const cuatrimestre = total === 48 ? Math.min(Math.ceil(cargadasEstimadas / 16), 3) || 1 : null;
      // Si ya se sabe la sala (Docentes C.O., ver más arriba), se puede mostrar la próxima
      // clase real igual que cualquier otra formación en vez del genérico "Sin sala asignada
      // actualmente" — que ya no es cierto una vez que la sala está cargada.
      const cargadasMin = Math.min(cargadasEstimadas, total);
      const proximaNumero = Math.min(cargadasMin + 1, total);
      const proximaFecha = historico.sala ? fechaDeClaseNumero(codigo, historico.fechaInicio, proximaNumero) : null;
      const proximaTxt = estado === 'Finalizó' ? '—'
        : proximaFecha ? `${formatFechaCorta(proximaFecha)} (Clase ${proximaNumero})`
        : 'Sin sala asignada actualmente';
      return {
        codigo, numero, edicion: numero,
        fechaInicio: historico.fechaInicio, fechaFinal: fechaFinalEstimada,
        cargadas: cargadasMin, total, estado, pct,
        proximaTxt,
        cuatrimestre,
        // Marca que esta edición no tiene NINGUNA fila en Salas Zoom (ni siquiera el
        // horario recurrente sin fecha) — la usa entradaHoyFormacionSinLive para saber
        // que puede armar una tarjeta de "hoy" sin pisar/duplicar una clase real.
        dia: historico.dia || null, horaMin: historico.horaMin ?? null, docente: historico.docente || '',
        sala: historico.sala || '', duracion: DURACIONES[codigo] || 90, sinRepresentacionViva: true
      };
    })
    .filter(Boolean);

  return [...enriquecidas, ...soloHistoricas].map((f) => {
    if (f.estado !== 'Finalizó' && f.fechaInicio && f.fechaInicio > hoyISO) {
      f = { ...f, estado: 'Próximamente', cargadas: 0, pct: 0, proximaTxt: `Comienza ${formatFechaCorta(f.fechaInicio)}` };
    }
    if (!f.fechaFinal) return f;
    const manual = manualArr.find((m) => m.codigo === f.codigo && m.edicion === f.numero);
    const defaultCO = parseInt(f.numero, 10) >= 30 ? 2 : 4;
    const meses = manual?.mesesCertificacion ?? (f.codigo === 'CO' ? defaultCO : 1);
    const venc = new Date(f.fechaFinal + 'T00:00:00');
    venc.setMonth(venc.getMonth() + meses);
    return { ...f, vencimientoCertificacion: venc.toISOString().slice(0, 10), mesesCertificacion: meses };
  });
}

/**
 * Para una Formación "En proceso" que ya NO tiene ninguna fila viva en Salas Zoom
 * (sinRepresentacionViva, ver calcularFormacionesEnriquecidas) — ej: Coaching Deportivo,
 * que nunca se migra a Salas Zoom, o cualquier edición cuyo horario recurrente ya se
 * reutilizó para la edición siguiente — arma UNA entrada por cada clase que le queda
 * (desde la de hoy/la más reciente ya dada, hasta la última de la edición), cada una en
 * su fecha real según la cadencia semanal (fechaDeClaseNumero).
 *
 * Antes esto armaba una sola entrada (la de HOY, si hoy tocaba clase) — Diego pidió
 * además que se vean TODAS las que faltan, no solo la de hoy ("Porque no aparecen todas
 * las clases? EJEMPLO: Coaching Deportivo Edición 14 Clase 15 de 16" — la clase de la
 * semana que viene no se veía en ningún lado). Quien solo necesita la de HOY (Agenda de
 * hoy) filtra el resultado por fecha === hoyISO.
 *
 * Sin esto, una edición así queda invisible en Agenda de hoy y en el cronograma aunque
 * esté en curso de verdad — Diego lo pidió expresamente el 30/09/2026 ("TODAS DEBERIAN
 * APARECER EN HOY"), a raíz de Coaching Deportivo edición 14 (Clase 14 de 16, hoy
 * miércoles) no apareciendo en ningún lado por esto.
 *
 * `asignacionesCO` (períodos de Docentes C.O., opcional) — SOLO se usa para Coaching
 * Ontológico. A diferencia del resto de los cursos acá tratados (que tienen un único
 * día/horario/docente fijo para toda la edición), C.O. cambia de docente/sala/horario cada
 * cuatrimestre (16 clases) — pedido de Diego (02/10/2026): como esos períodos ya están
 * completos en Docentes C.O. (sala incluida), se busca el período vigente a la fecha
 * PUNTUAL de cada clase (no el de hoy) para no arrastrarle la sala de este cuatrimestre a
 * uno futuro que todavía no se cargó — ese sí se deja sin sala, en vez de inventarla.
 * OJO: `buscarPeriodoCO` devuelve el período de "desde" más reciente aunque ninguno cubra
 * exactamente esa fecha puntual (ver su propio comentario) — en la práctica, para una fecha
 * bien a futuro (un cuatrimestre que todavía ni se cargó) esto puede devolver el período
 * ACTUAL en vez de "nada", mostrando su sala como mejor estimación en vez de dejarla vacía.
 * Se acepta como aproximación razonable: se corrige solo en cuanto Diego carga el período
 * siguiente, y es mejor que no mostrar nada (que era el comportamiento antes de este cambio).
 */
export function entradasFuturasFormacionSinLive(f, hoyISO, asignacionesCO) {
  if (!f || !f.sinRepresentacionViva || f.estado !== 'En proceso') return [];
  if (!f.fechaInicio || !f.total || !f.cargadas || f.horaMin == null || !f.dia) return [];
  const periodos = (f.codigo === 'CO' && asignacionesCO && asignacionesCO.length) ? asignacionesCO : null;
  const salidas = [];
  for (let n = f.cargadas; n <= f.total; n++) {
    const fecha = fechaDeClaseNumero(f.codigo, f.fechaInicio, n);
    if (!fecha || fecha < hoyISO) continue; // ya pasó — no tiene sentido mostrarla
    let dia = f.dia, horaMin = f.horaMin, sala = f.sala || '', docente = f.docente || '';
    if (periodos) {
      const periodo = buscarPeriodoCO(periodos, f.numero, fecha);
      if (periodo) {
        const m = String(periodo.horario || '').match(/(\d{1,2})[.:hH](\d{2}).*?(\d{1,2})[.:hH](\d{2})/);
        dia = periodo.dia || dia;
        horaMin = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : horaMin;
        // Antes esto pisaba `sala`/`docente` con el valor crudo del período (`periodo.sala ||
        // ''`), tirando a la basura el valor ya resuelto en `f.sala`/`f.docente` apenas el
        // período de ese cuatrimestre no tenía la columna Sala cargada en Docentes C.O. — que
        // es el caso más común (el dato real vive en el horario confirmado contra Zoom,
        // SALA_CONFIRMADA_POR_EDICION, no en esa columna). Eso hacía que "Próximas clases"/
        // Agenda mostraran "—" para ediciones cuya sala SÍ se conoce (pedido de Diego,
        // 02/10/2026: "revisá si no se ven por error de código" — era justo esto). Ahora el
        // período solo pisa el dato por defecto cuando el período mismo SÍ trae algo cargado.
        sala = periodo.sala || sala;
        docente = periodo.docente || docente;
      } else {
        sala = ''; // cuatrimestre futuro sin período cargado todavía: no se inventa sala
      }
    }
    salidas.push({
      id: `hist-${f.codigo}-${f.numero}-c${n}`, fecha, dia, curso: f.codigo,
      nombreCurso: NOMBRES[f.codigo] || f.codigo, edicion: f.numero, numeroSesion: n, total: f.total,
      horaMin, duracion: f.duracion || DURACIONES[f.codigo] || 90, sala, esFormacion: true,
      docente, staff: '', tematica: '', observaciones: '',
      // Esta clase no tiene ninguna fila real en la pestaña Clases de Salas Zoom detrás —
      // ni falta que le haga: para cursos como Coaching Deportivo, que nunca se migran ahí
      // por diseño, o para Coaching Ontológico cuando ya tiene su período de Docentes C.O.
      // completo (sala incluida). Tiene que verse como una clase más, con su cartel normal
      // (EN VIVO / PRÓXIMAMENTE / FINALIZANDO / FINALIZADA). Lo usan también el ModalDetalle
      // de Cronograma (para no intentar un PATCH a un id que no es una fila real) y su vista
      // Calendario (para no mostrar "⚠ Sin sala" cuando en realidad sí se sabe, o cuando el
      // curso nunca va a tener sala).
      sinRepresentacionViva: true
    });
  }
  return salidas;
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
  return clases.filter((c) => {
    const edicion = edicionRealDeClase(c);
    return !(edicion && !c.fecha && (finalizadas.has(`${c.codigo}|${edicion}`) || finalizadasHistorico.has(`${c.codigo}|${edicion}`)));
  });
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
            // La edición real de la clase se resuelve con la misma función compartida que
            // usa el resto de la app (ver comentario en edicionRealDeClase) — antes esto
            // tenía su propia heurística inline, inconsistente con las demás.
            const edicionReal = edicionRealDeClase(c);
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
                  o !== c && o.codigo === c.codigo && edicionRealDeClase(o) === edicionReal && (o.docente || o.staff)
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
