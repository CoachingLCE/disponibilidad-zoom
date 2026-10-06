// Repetición de actividades de Cronograma CM (pedido de Diego): además de "la misma fecha cada semana", poder repetir
// "todos los lunes", "todos los martes y jueves", etc. durante N semanas.
// Función pura SIN imports: la usan el formulario (para mostrar cuántas actividades se van a cargar) y la API (para crearlas),
// así lo que se ve antes de apretar "Agregar" es exactamente lo que se guarda. Usa fechas en UTC a propósito: sumar días a una
// fecha local puede correrse una hora por el cambio de horario y terminar en otro día.

export const DIAS_REPETICION = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
export const MAX_ACTIVIDADES_POR_CARGA = 200;
export const MAX_SEMANAS = 52;

const aUTC = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const aISO = (ms) => new Date(ms).toISOString().slice(0, 10);
const DIA_MS = 86400000;
// 0 = lunes … 6 = domingo
const idxSemana = (ms) => (new Date(ms).getUTCDay() + 6) % 7;

export function diaDeFecha(iso) { return DIAS_REPETICION[idxSemana(aUTC(iso))]; }

/**
 * Devuelve [{ fecha, dia }] de las actividades a cargar.
 *  - Sin `dias` (o vacío): el comportamiento de siempre — el mismo día de la semana que `fecha`, una vez por semana, `semanas` veces.
 *  - Con `dias`: esos días de la semana, durante `semanas` semanas contadas desde la semana de `fecha`; en la primera semana
 *    solo se incluyen los días que son iguales o posteriores a `fecha` (nunca se carga nada hacia atrás).
 */
export function fechasRepeticion({ fecha, dias, semanas }) {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return [];
  const n = Math.min(Math.max(parseInt(semanas, 10) || 1, 1), MAX_SEMANAS);
  const inicio = aUTC(fecha);
  const sel = [...new Set(Array.isArray(dias) ? dias : [])].filter((d) => DIAS_REPETICION.includes(d));
  if (sel.length === 0) {
    return Array.from({ length: n }, (_, i) => { const ms = inicio + i * 7 * DIA_MS; return { fecha: aISO(ms), dia: DIAS_REPETICION[idxSemana(ms)] }; });
  }
  const lunes = inicio - idxSemana(inicio) * DIA_MS;
  const orden = sel.map((d) => DIAS_REPETICION.indexOf(d)).sort((a, b) => a - b);
  const out = [];
  for (let w = 0; w < n; w++) {
    for (const i of orden) {
      const ms = lunes + (w * 7 + i) * DIA_MS;
      if (ms < inicio) continue;
      out.push({ fecha: aISO(ms), dia: DIAS_REPETICION[i] });
    }
  }
  return out;
}
