import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarDocentesCO } from '../../../../lib/permisos';
import { leerDocentesCO, actualizarDocenteCO, eliminarDocenteCO } from '../../../../lib/datosDocentesCO';
import { registrarAccion } from '../../../../lib/auditoria';

// PATCH/DELETE solo funcionan sobre períodos que ya existen como fila real en el Sheet
// (los que vienen fijos en el código, si nunca se guardaron en el Sheet, no tienen fila
// para editar — al guardar un cambio sobre uno de esos, se crea la fila real recién ahí).
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarDocentesCO(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const asignaciones = await leerDocentesCO();
  const item = asignaciones.find((a) => a.id === id);
  if (!item) return NextResponse.json({ error: 'No existe ese período (puede que sea uno fijo que todavía no se guardó — probá guardarlo como nuevo).' }, { status: 404 });

  const body = await request.json();
  await actualizarDocenteCO(item._rowIndex, { ...body, usuario: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Editó Docentes C.O', `Edición ${item.edicion}`);

  return NextResponse.json({ ok: true });
})

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarDocentesCO(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const asignaciones = await leerDocentesCO();
  const item = asignaciones.find((a) => a.id === id);
  if (!item) return NextResponse.json({ error: 'No existe ese período.' }, { status: 404 });

  await eliminarDocenteCO(item._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó período de Docentes C.O', `Edición ${item.edicion}`);

  return NextResponse.json({ ok: true });
})
