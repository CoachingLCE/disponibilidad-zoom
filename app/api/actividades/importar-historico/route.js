import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerActividades, agregarActividades } from '../../../../lib/datosClases';
import { nombreCurso } from '../../../../lib/salasLogic';
import { registrarAccion } from '../../../../lib/auditoria';

/** Hash simple y determinístico — mismo contenido siempre da el mismo id, sin importar el orden. */
function idEstable(item) {
  const texto = [item.fecha, item.tipo, item.curso, item.nombreCurso, item.edicion, item.horaMin, item.docente, item.tematica].join('|');
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  }
  return `hist-${(hash >>> 0).toString(36)}`;
}

// POST /api/actividades/importar-historico -> { items: [...] }
// Carga masiva de actividades históricas (cualquier tipo, incluido "Formación") como
// referencia pura en ActividadesCronograma — NO reserva sala ni toca el sistema de Clases,
// tal como se decidió: son en su mayoría clases que ya pasaron, sin dato real de sala.
//
// El id de cada fila se calcula a partir de su propio contenido (idEstable), así que
// re-importar (incluso con un archivo actualizado que reordenó o agregó filas en el medio)
// nunca duplica lo que ya está — solo agrega lo que sea realmente nuevo.
//
// IMPORTANTE: se escribe TODO en un solo llamado a la API (agregarActividades en bloque),
// no una fila a la vez — Google Sheets tiene un límite de escrituras por minuto que se
// supera enseguida si se escribe de a una con listas de cientos de elementos.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No se recibieron actividades para importar.' }, { status: 400 });
  }

  const existentes = await leerActividades();
  const idsExistentes = new Set(existentes.map((e) => e.id));

  const nuevas = [];
  for (const item of items) {
    const id = idEstable(item);
    if (idsExistentes.has(id)) continue;
    idsExistentes.add(id); // por si el propio archivo trae duplicados internos
    nuevas.push({
      fecha: item.fecha || '', dia: item.dia || '', tipo: item.tipo,
      curso: item.curso || '', nombreCurso: item.nombreCurso || nombreCurso(item.curso),
      edicion: item.edicion || '', horaMin: item.horaMin, horaTxt: item.horaTxt || '',
      docente: item.docente || '', tematica: item.tematica || '', observaciones: item.observaciones || '',
      id
    });
  }

  if (nuevas.length > 0) {
    await agregarActividades(nuevas);
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó histórico de Cronograma', `${nuevas.length} actividad(es) nuevas`);
  return NextResponse.json({ ok: true, agregadas: nuevas.length, omitidas: items.length - nuevas.length });
})
