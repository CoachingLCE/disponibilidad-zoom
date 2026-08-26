// Lógica de negocio de Salas Zoom, portada del prototipo HTML.
// Funciones puras — se pueden usar tanto en el servidor (API routes) como en el cliente (React).

export const DURACIONES = { CO: 120, CE: 90, CEQUI: 90, OR: 90, O: 90, CV: 90, CDEP: 90, IE: 90, ESI: 90 };
export const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5', 'Sala 6', 'Sala 7', 'Comunidad ILCE'];
export const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIAS_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
export const BUFFER_MIN = 45;
export const TOTALES = { CO: 48, CE: 16, CEQUI: 16, OR: 16, O: 16, CV: 16 };
export const NOMBRES = {
  CO: 'Coaching Ontológico', CE: 'Coaching Educativo', CEQUI: 'Coaching de Equipos',
  OR: 'Oratoria', O: 'Oratoria', CV: 'Coaching Vocacional', CDEP: 'Coaching Deportivo',
  IE: 'Inteligencia Emocional', ESI: 'Taller ESI'
};
export const ICONOS = {
  CO: '🎓', CE: '🎓', CEQUI: '🤝', OR: '🎤', O: '🎤', CV: '🧭', CDEP: '🏃', IE: '❤️', ESI: '🛡️'
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
