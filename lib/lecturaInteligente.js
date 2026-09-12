import { NOMBRES } from './salasLogic';

const DIAS_SEMANA = {
  lunes: 1, martes: 2, miercoles: 3, miércoles: 3, jueves: 4, viernes: 5, sabado: 6, sábado: 6, domingo: 0
};

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'curso', 'y']);

// Palabras que NUNCA pueden ser (parte de) un nombre de persona — si lo capturado es
// solo esto, se descarta el dato en vez de mostrar algo inventado/basura.
const NO_ES_NOMBRE = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'a', 'al', 'con', 'en', 'y', 'o',
  'para', 'por', 'hs', 'horas', 'alumnos', 'alumnas', 'personas', 'curso',
  ...Object.keys(DIAS_SEMANA)
]);

function normalizar(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // saca acentos
    .replace(/[^a-z0-9\s:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Distancia de edición (Levenshtein) — para tolerar errores de tipeo cortos. */
function distancia(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

/** Palabras significativas de un nombre de curso (sin "de"/"la"/etc). */
function palabrasSignificativas(nombreNorm) {
  return nombreNorm.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Busca coincidencias de curso en el texto, comparando contra los nombres reales
 * (NOMBRES de salasLogic). Nunca inventa un curso — si no hay ninguna palabra en
 * común razonable, no devuelve candidato.
 * Devuelve una lista ordenada por score descendente: [{ codigo, nombre, score, exacta }]
 */
export function buscarCursos(textoNorm) {
  const palabrasTexto = textoNorm.split(' ').filter(Boolean);
  const codigos = [...new Set(Object.keys(NOMBRES).filter((c) => c !== 'O'))]; // O es alias de OR

  // Atajo: si el CÓDIGO del curso aparece suelto como palabra propia (ej: "cdep", "co"),
  // es una señal fuerte e inequívoca — cuenta como coincidencia exacta directamente.
  const codigosEnTexto = new Set(palabrasTexto.map((p) => p.toUpperCase()).filter((p) => codigos.includes(p)));

  const candidatos = codigos.map((codigo) => {
    if (codigosEnTexto.has(codigo)) {
      return { codigo, nombre: NOMBRES[codigo], score: 1, exacta: true };
    }

    const nombreNorm = normalizar(NOMBRES[codigo]);
    const palabrasNombre = palabrasSignificativas(nombreNorm);
    let coincidenciasExactas = 0;
    let coincidenciasAproximadas = 0;

    palabrasNombre.forEach((palabra) => {
      if (palabrasTexto.includes(palabra)) { coincidenciasExactas++; return; }
      // Tolerar errores de tipeo cortos (ej: "ontologicot" en vez de "ontologico")
      const hayFuzzy = palabrasTexto.some((t) => t.length >= 5 && distancia(t, palabra) <= 2);
      if (hayFuzzy) coincidenciasAproximadas++;
    });

    const totalCoincidencias = coincidenciasExactas + coincidenciasAproximadas;
    const score = palabrasNombre.length ? totalCoincidencias / palabrasNombre.length : 0;
    return {
      codigo, nombre: NOMBRES[codigo], score,
      exacta: score === 1 && coincidenciasAproximadas === 0
    };
  });

  // Umbral estricto a propósito: tienen que coincidir TODAS las palabras significativas
  // del nombre del curso (aunque sea con una tolerancia chica a errores de tipeo), no
  // alcanza con una sola palabra suelta en común (eso generaba falsos positivos, por
  // ejemplo "reunión de equipo docente" sugiriendo "Coaching de Equipos" solo por la
  // palabra "equipo").
  return candidatos
    .filter((c) => c.score >= 0.999)
    .sort((a, b) => b.score - a.score);
}

/** Próxima fecha (ISO) en la que cae un día de la semana, contando desde hoy (hoy cuenta si coincide). */
function proximaFechaParaDia(nombreDia, hoy = new Date()) {
  const idxObjetivo = DIAS_SEMANA[nombreDia];
  if (idxObjetivo === undefined) return null;
  const idxHoy = hoy.getDay();
  let diff = idxObjetivo - idxHoy;
  if (diff < 0) diff += 7;
  const d = new Date(hoy);
  d.setDate(hoy.getDate() + diff);
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Interpreta un texto libre pegado por el operador y devuelve todo lo que pudo
 * detectar, con su nivel de confianza — nunca inventa un dato que no está en el
 * texto. Cada campo detectado es independiente entre sí.
 */
export function interpretarTexto(texto, hoy = new Date()) {
  const original = texto || '';
  let restante = normalizar(original);

  const resultado = {
    curso: null, edicion: null, cantidad: null, horaTxt: null,
    diaDetectado: null, fechaSugerida: null, docente: null, staff: null,
    observaciones: null
  };

  // --- Hora: "18:00", "18.00", "18 hs", "18hs", "18 horas" ---
  let m = restante.match(/\b(\d{1,2})[:.](\d{2})\s*(?:hs|horas)?\b/);
  if (m) {
    resultado.horaTxt = `${m[1].padStart(2, '0')}:${m[2]}`;
    restante = restante.replace(m[0], ' ');
  } else {
    m = restante.match(/\b(\d{1,2})\s*(?:hs|horas)\b/);
    if (m) {
      resultado.horaTxt = `${m[1].padStart(2, '0')}:00`;
      restante = restante.replace(m[0], ' ');
    }
  }

  // --- Cantidad: "48 alumnos", "48 personas", "48 inscriptos" ---
  m = restante.match(/\b(\d{1,4})\s*(?:alumnos|alumnas|personas|inscriptos|inscriptas)\b/);
  if (m) {
    resultado.cantidad = parseInt(m[1], 10);
    restante = restante.replace(m[0], ' ');
  }

  // --- Edición explícita: "ed 22", "ed. 22", "edicion 22", "edición 22" ---
  m = restante.match(/\bed(?:icion)?\.?\s*(\d{1,3})\b/);
  if (m) {
    resultado.edicion = m[1];
    restante = restante.replace(m[0], ' ');
  }

  // --- Día de la semana ---
  for (const dia of Object.keys(DIAS_SEMANA)) {
    const re = new RegExp(`\\b${dia}\\b`);
    if (re.test(restante)) {
      resultado.diaDetectado = dia;
      resultado.fechaSugerida = proximaFechaParaDia(dia, hoy);
      restante = restante.replace(re, ' ');
      break;
    }
  }

  // --- Docente: "profe X", "profesor X", "docente X" (hasta la próxima palabra clave o el final) ---
  m = restante.match(/\b(?:profe|profesor|profesora|docente)\s+([a-z]+(?:\s+[a-z]+)?)/);
  if (m) {
    const nombreCapturado = nombreValido(m[1]);
    if (nombreCapturado) resultado.docente = nombreCapturado;
    restante = restante.replace(m[0], ' ');
  }

  // --- Staff: "staff X" ---
  m = restante.match(/\bstaff\s+([a-z]+(?:\s+[a-z]+)?)/);
  if (m) {
    const nombreCapturado = nombreValido(m[1]);
    if (nombreCapturado) resultado.staff = nombreCapturado;
    restante = restante.replace(m[0], ' ');
  }

  // --- Curso: se busca sobre el texto ORIGINAL normalizado completo (no sobre "restante",
  // porque sacar palabras de en medio del nombre del curso podría arruinar el matching) ---
  const candidatosCurso = buscarCursos(normalizar(original));
  resultado.candidatosCurso = candidatosCurso;
  if (candidatosCurso.length > 0) {
    resultado.curso = candidatosCurso[0];
  }

  // --- Edición de respaldo: si no hubo "ed 22" explícito, un número suelto que haya
  // quedado libre (no absorbido por hora/cantidad/año) y esté en un rango razonable de
  // edición (1-99) se toma como edición — es la situación de "coaching ontologico 22 viernes...". ---
  if (!resultado.edicion) {
    // Sacar del texto restante las palabras del nombre del curso ya identificado, para
    // no confundir ningún número que pudiera colarse ahí.
    const numeroSuelto = restante.match(/\b(\d{1,2})\b/);
    if (numeroSuelto) {
      resultado.edicion = numeroSuelto[1];
      restante = restante.replace(numeroSuelto[0], ' ');
    }
  }

  return resultado;
}

function capitalizar(s) {
  return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Limpia una captura candidata a nombre de persona: saca palabras que no pueden ser un
 * nombre (artículos, preposiciones, días de la semana, etc.) y colapsa espacios. Si no
 * queda ninguna palabra real, devuelve null en vez de mostrar algo inventado.
 */
function nombreValido(capturado) {
  const palabras = capturado.trim().split(/\s+/).filter((w) => w && !NO_ES_NOMBRE.has(w));
  if (palabras.length === 0) return null;
  return capitalizar(palabras.join(' '));
}
