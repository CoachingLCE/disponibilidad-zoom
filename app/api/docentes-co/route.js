import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarDocentesCO } from '../../../lib/permisos';
import { leerDocentesCO, agregarDocenteCO, agregarDocentesCOBulk } from '../../../lib/datosDocentesCO';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const asignaciones = await leerDocentesCO();
  return NextResponse.json({ asignaciones });
})

// Acepta un registro suelto, o { items: [...] } para cargar varios períodos de una vez
// (para cuando se pegue el historial completo del Excel de una sola pasada).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarDocentesCO(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para asignar docentes/staff de C.O.' }, { status: 403 });
  }

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const items = body.items.map((it) => ({ ...it, usuario: usuario.nombre }));
    await agregarDocentesCOBulk(items);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó Docentes C.O', `${items.length} período(s)`);
    return NextResponse.json({ ok: true, agregados: items.length });
  }

  const { edicion, dia, horario, desde, hasta, docente, staff, observaciones } = body;
  if (!edicion) return NextResponse.json({ error: 'Falta la edición.' }, { status: 400 });

  await agregarDocenteCO({ edicion, dia, horario, desde, hasta, docente, staff, observaciones, usuario: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Asignó docente/staff C.O', `Edición ${edicion} — ${docente || ''} ${staff ? '/ Staff: ' + staff : ''}`);

  return NextResponse.json({ ok: true });
})
