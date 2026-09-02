import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarDocentesCO } from '../../../lib/permisos';
import { leerDocentesCO, agregarDocenteCO } from '../../../lib/datosDocentesCO';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const asignaciones = await leerDocentesCO();
  return NextResponse.json({ asignaciones });
})

export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarDocentesCO(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para asignar docentes/staff de C.O.' }, { status: 403 });
  }

  const { edicion, docente, staff, fechaAsignacion, observaciones } = await request.json();
  if (!edicion) return NextResponse.json({ error: 'Falta la edición.' }, { status: 400 });

  await agregarDocenteCO({ edicion, docente, staff, fechaAsignacion, observaciones, usuario: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Asignó docente/staff C.O', `Edición ${edicion} — ${docente || ''} ${staff ? '/ Staff: ' + staff : ''}`);

  return NextResponse.json({ ok: true });
})
