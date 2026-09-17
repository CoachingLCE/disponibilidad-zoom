export const CAMPANAS_DEFAULT = [
  { titulo: 'Día del Niño', fecha: '2026-08-16', descripcion: 'Educación emocional y aprendizaje significativo.' },
  { titulo: 'Mes de la Educación', fecha: '2026-09-01', descripcion: 'Contenido participativo + promoción especial.' },
  { titulo: 'Día de la Madre', fecha: '2026-10-01', descripcion: 'Storytelling emocional orientado a propósito y transformación.' },
  { titulo: 'Noviembre', fecha: '2026-11-01', descripcion: '' },
  { titulo: 'Día del Corredor Inmobiliario', fecha: '2026-12-01', descripcion: 'Primera clase gratuita para captar potenciales alumnos.' },
  { titulo: 'Cierre de año', fecha: '2026-12-01', descripcion: 'Regalo de Navidad con acceso a contenidos gratuitos para fortalecer comunidad y generar futuras conversiones.' }
];

// Categorías fijas del Centro de recursos — se eligen por desplegable (nunca se escriben
// a mano) para que no aparezcan variantes tipo "Ebook"/"Ebooks"/"E-book" mezcladas.
export const CATEGORIAS_RECURSOS = [
  { id: 'ebooks', label: '📚 Ebooks y materiales' },
  { id: 'compartir', label: '🔗 Enlaces para compartir' },
  { id: 'canales', label: '📲 Canales y redes' },
  { id: 'sitios', label: '🌐 Sitios y herramientas' }
];

// Normaliza categorías viejas (texto libre, de antes de tener el desplegable fijo) a una
// de las 4 categorías de arriba — así ningún enlace ya cargado queda "huérfano".
export function normalizarCategoria(cat) {
  const c = (cat || '').trim().toLowerCase();
  if (!c) return 'sitios';
  if (CATEGORIAS_RECURSOS.some((x) => x.id === c)) return c;
  if (c.includes('ebook')) return 'ebooks';
  if (c.includes('compartir') || c.includes('link')) return 'compartir';
  if (c.includes('canal') || c.includes('red') || c.includes('whatsapp') || c.includes('slack')) return 'canales';
  return 'sitios';
}

export function labelCategoria(id) {
  return CATEGORIAS_RECURSOS.find((c) => c.id === id)?.label || CATEGORIAS_RECURSOS.find((c) => c.id === 'sitios').label;
}

// Mismos enlaces de siempre (ningún título ni URL cambiado), solo re-organizados en las
// 4 categorías fijas de arriba. Los marcados `destacado` arrancan poblando "Más
// utilizados" hasta que haya clics reales registrados en cada navegador.
export const ENLACES_DEFAULT = [
  { categoria: 'ebooks', titulo: '3 Habilidades de Coaching', url: 'https://azxe.short.gy/EBOOK_3HABILIDADES_COACHING' },
  { categoria: 'ebooks', titulo: 'Coaching, la profesión del futuro', url: 'https://azxe.short.gy/COACHING_PROFESION_FUTURO' },
  { categoria: 'ebooks', titulo: 'Competencia deportivo', url: 'https://azxe.short.gy/EBOOK_COMPETENCIA_DEPORTIVO' },
  { categoria: 'ebooks', titulo: 'Construí tu vocación', url: 'https://azxe.short.gy/EBOOK_CONSTRUI_TU_VOCACION' },
  { categoria: 'ebooks', titulo: 'Método de aprendizaje CE', url: 'https://azxe.short.gy/EBOOK_METODO_APRENDIZAJE_CE' },
  { categoria: 'ebooks', titulo: 'Educar en modo virtual', url: 'https://azxe.short.gy/EBOOK_EDUCAR_VIRTUAL' },
  { categoria: 'ebooks', titulo: 'Intervenciones en grupo y equipo', url: 'https://azxe.short.gy/EBOOK_INTERVENCIONES_GRUPO_EQUIPO' },
  { categoria: 'ebooks', titulo: 'Liderar equipos CO', url: 'https://azxe.short.gy/EBOOK_LIDERAR_EQUIPOS_CO' },
  { categoria: 'ebooks', titulo: 'Oratoria', url: 'https://azxe.short.gy/EBOOK_ORATORIA' },
  { categoria: 'ebooks', titulo: 'Plantilla ebooks para historias (Canva)', url: 'https://canva.link/8wpmfh9ogny7dw9' },
  { categoria: 'compartir', titulo: 'Sesiones gratuitas Deportivo', url: 'https://forms.gle/Kki4E6fmmL9xb2Rh8', destacado: true },
  { categoria: 'compartir', titulo: 'Sesiones gratuitas Ontológico', url: 'https://forms.gle/nbkiQ41yEdaSvjUr6', destacado: true },
  { categoria: 'compartir', titulo: 'Mentorías/sesiones gratuitas Oratoria', url: '' },
  { categoria: 'canales', titulo: 'Canal de WhatsApp', url: 'https://whatsapp.com/channel/0029VaBfdccGOj9tAv5s1A0G', destacado: true },
  { categoria: 'canales', titulo: 'Canal free de Slack', url: 'https://comunidadilce.slack.com/ssb/redirect' },
  { categoria: 'sitios', titulo: 'Blog', url: 'https://www.coachingeducativolider.com/blog' },
  { categoria: 'compartir', titulo: 'Sesiones gratuitas Ejecutivo/Inmobiliario', url: 'https://forms.gle/1CWMTS63pKJBrLHL7' },
  { categoria: 'compartir', titulo: 'Laboratorio de coaching', url: 'https://docs.google.com/forms/d/1Ns1N51KYoA_c3fwdyMVWDZn1fbtHEy5RiBwgGfC4ICo/edit' },
  { categoria: 'compartir', titulo: 'Comunidad paga', url: 'https://azxe.short.gy/COMUNIDAD_', destacado: true },
  { categoria: 'canales', titulo: 'De Facebook a WhatsApp', url: 'https://azxe.short.gy/FACE_A_WSP' },
  { categoria: 'canales', titulo: 'De Instagram a WhatsApp', url: 'https://azxe.short.gy/INSTA_A_WSP' },
  { categoria: 'compartir', titulo: 'Link general (hoja final de ebooks y mensajes)', url: 'https://azxe.short.gy/FORMACIONES' }
];
