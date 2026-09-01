// Tipos de actividad de Cronograma CM, cada uno con su color propio (consistente en toda
// la pantalla: franja lateral, punto, badge). Colores elegidos para que se distingan bien
// entre sí incluso habiendo 27.
export const TIPOS_CM = [
  { id: 'Auditorio', dot: 'bg-violet-500', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/40' },
  { id: 'Blog', dot: 'bg-amber-700', text: 'text-amber-600', bg: 'bg-amber-700/10', border: 'border-amber-700/40' },
  { id: 'Cumpleaños', dot: 'bg-pink-300', text: 'text-pink-300', bg: 'bg-pink-300/10', border: 'border-pink-300/40' },
  { id: 'Ebook', dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/40' },
  { id: 'Encuestas', dot: 'bg-cyan-400', text: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/40' },
  { id: 'Informe', dot: 'bg-slate-400', text: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/40' },
  { id: 'Comunidades', dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40' },
  { id: 'Película/Serie', dot: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/40' },
  { id: 'Repost', dot: 'bg-lime-400', text: 'text-lime-400', bg: 'bg-lime-400/10', border: 'border-lime-400/40' },
  { id: 'Subir redes', dot: 'bg-amber-800', text: 'text-amber-700', bg: 'bg-amber-800/10', border: 'border-amber-800/40' },
  { id: 'Youtube', dot: 'bg-red-600', text: 'text-red-500', bg: 'bg-red-600/10', border: 'border-red-600/40' },
  { id: 'Entrevista', dot: 'bg-violet-400', text: 'text-violet-300', bg: 'bg-violet-400/10', border: 'border-violet-400/40' },
  { id: 'Caja de ideas', dot: 'bg-yellow-300', text: 'text-yellow-300', bg: 'bg-yellow-300/10', border: 'border-yellow-300/40' },
  { id: 'ST Comunidad', dot: 'bg-fuchsia-500', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/40' },
  { id: 'Diplomas', dot: 'bg-blue-400', text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/40' },
  { id: 'ST', dot: 'bg-fuchsia-300', text: 'text-fuchsia-300', bg: 'bg-fuchsia-300/10', border: 'border-fuchsia-300/40' },
  { id: 'Masterclass', dot: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/40' },
  { id: 'Reel de prueba', dot: 'bg-rose-400', text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/40' },
  { id: 'Seguir 100 personas', dot: 'bg-orange-800', text: 'text-orange-700', bg: 'bg-orange-800/10', border: 'border-orange-800/40' },
  { id: 'Comentar a docentes', dot: 'bg-teal-400', text: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/40' },
  { id: 'Dejar de seguir', dot: 'bg-gray-400', text: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/40' },
  { id: 'Linkedin notas', dot: 'bg-blue-600', text: 'text-blue-500', bg: 'bg-blue-600/10', border: 'border-blue-600/40' },
  { id: 'Dejar de seguir 100', dot: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/40' },
  { id: 'ST de cursos', dot: 'bg-fuchsia-600', text: 'text-fuchsia-500', bg: 'bg-fuchsia-600/10', border: 'border-fuchsia-600/40' },
  { id: 'Line up', dot: 'bg-sky-300', text: 'text-sky-300', bg: 'bg-sky-300/10', border: 'border-sky-300/40' },
  { id: 'Leads', dot: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/40' },
  { id: 'Laboratorio de coaching', dot: 'bg-indigo-400', text: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/40' }
];

const COLOR_DEFAULT_CM = { dot: 'bg-textMuted', text: 'text-textMuted', bg: 'bg-textMuted/10', border: 'border-textMuted/40' };

export function colorCM(tipo) {
  const encontrado = TIPOS_CM.find((t) => t.id === tipo);
  return encontrado || COLOR_DEFAULT_CM;
}
