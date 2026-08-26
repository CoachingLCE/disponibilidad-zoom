import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerActividades, agregarActividad } from '../../../../lib/datosClases';
import { nombreCurso } from '../../../../lib/salasLogic';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/actividades/importar-historico -> { items: [...] }
// Carga masiva de actividades históricas (cualquier tipo, incluido "Formación") como
// referencia pura en ActividadesCronograma — NO reserva sala ni toca el sistema de Clases,
// tal como se decidió: son en su mayoría clases que ya pasaron, sin dato real de sala.
export async function POST(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No se recibieron actividades para importar.' }, { status: 400 });
  }

  // Evitar duplicar si se corre el import más de una vez: comparamos fecha+tipo+curso+horaMin+docente.
  const existentes = await leerActividades();
  const clave = (a) => `${a.fecha}|${a.tipo}|${a.curso}|${a.horaMin}|${a.docente}`;
  const yaExisten = new Set(existentes.map(clave));

  let agregadas = 0;
  for (const item of items) {
    const k = clave({ fecha: item.fecha, tipo: item.tipo, curso: item.curso, horaMin: item.horaMin, docente: item.docente });
    if (yaExisten.has(k)) continue;
    await agregarActividad({
      fecha: item.fecha || '', dia: item.dia || '', tipo: item.tipo,
      curso: item.curso || '', nombreCurso: item.nombreCurso || nombreCurso(item.curso),
      edicion: item.edicion || '', horaMin: item.horaMin, horaTxt: item.horaTxt || '',
      docente: item.docente || '', tematica: item.tematica || '', observaciones: item.observaciones || ''
    });
    yaExisten.add(k);
    agregadas++;
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó histórico de Cronograma', `${agregadas} actividad(es) nuevas`);
  return NextResponse.json({ ok: true, agregadas, omitidas: items.length - agregadas });
}
