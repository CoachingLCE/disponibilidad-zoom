// Lógica de negocio de Salas Zoom, portada del prototipo HTML.
// Funciones puras — se pueden usar tanto en el servidor (API routes) como en el cliente (React).

export const DURACIONES = { CO: 120, CE: 90, CEQUI: 90, OR: 90, O: 90, CV: 90, CDEP: 90, IE: 90, ESI: 90 };
export const SALAS = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5', 'Sala 6', 'Sala 7', 'Comunidad ILCE'];
export const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const DIAS_JS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
export const BUFFER_MIN = 45;
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

// Estado de una actividad puntual — independiente del color de formación.
export const ESTADOS = {
  normal: { label: 'Normal', dot: 'bg-successText', text: 'text-successText', bg: 'bg-successBg' },
  atencion: { label: 'Atención', dot: 'bg-warningText', text: 'text-warningText', bg: 'bg-warningBg' },
  conflicto: { label: 'Conflicto', dot: 'bg-dangerText', text: 'text-dangerText', bg: 'bg-dangerBg' },
  postergada: { label: 'Postergada', dot: 'bg-infoText', text: 'text-infoText', bg: 'bg-infoBg' },
  finalizada: { label: 'Finalizada', dot: 'bg-textMuted', text: 'text-textMuted', bg: 'bg-surface2' },
  enCurso: { label: 'En curso', dot: 'bg-accentTeal', text: 'text-accentTeal', bg: 'bg-accentTeal/10' }
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
export function calcularFormaciones(clases) {
  const grupos = {};
  clases.filter((c) => c.fecha).forEach((c) => {
    const key = `${c.codigo}|${c.edicion || '1'}`;
    (grupos[key] = grupos[key] || []).push(c);
  });
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hoyISO = toISO(hoy);

  return Object.keys(grupos).map((key) => {
    const [codigo, edicion] = key.split('|');
    const grupo = grupos[key];
    const fechas = grupo.map((c) => c.fecha).sort();
    const fechaInicio = fechas[0], fechaFinal = fechas[fechas.length - 1];
    const total = TOTALES[codigo] || null;
    const cargadas = new Set(grupo.map((c) => c.numero)).size;
    const finalPasado = new Date(fechaFinal + 'T00:00:00') < hoy;
    const completo = total && cargadas >= total;
    const estado = completo && finalPasado ? 'Finalizó' : 'En proceso';
    const pct = total ? Math.min(100, Math.round((cargadas / total) * 100)) : null;
    const proxima = grupo.filter((c) => c.fecha >= hoyISO).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    return {
      codigo, edicion, fechaInicio, fechaFinal, estado, cargadas, total, pct,
      proximaTxt: proxima ? `${formatFechaCorta(proxima.fecha)} (Clase ${proxima.numero})` : (estado === 'Finalizó' ? '—' : 'Sin agendar')
    };
  }).sort((a, b) => a.codigo.localeCompare(b.codigo) || (parseInt(a.edicion, 10) - parseInt(b.edicion, 10)));
}

/** Alertas automáticas: choques de sala, clases en feriado, ediciones por terminar. */
export function calcularAlertas(clases, feriados) {
  const alertas = [];
  const porSalaDia = {};
  clases.forEach((c) => {
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
    const key = `${c.codigo}|${c.edicion || '1'}`;
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
