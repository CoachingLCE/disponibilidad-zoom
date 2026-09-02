import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerInfoTecnica, actualizarInfoTecnica, eliminarInfoTecnica } from '../../../../lib/datosInfoTecnica';
import { registrarAccion } from '../../../../lib/auditoria';

export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const items = await leerInfoTecnica();
  const item = items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: 'No existe ese registro.' }, { status: 404 });

  const body = await request.json();
  await actualizarInfoTecnica(item._rowIndex, body);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó información técnica', item.nombreActividad);

  return NextResponse.json({ ok: true });
})

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const items = await leerInfoTecnica();
  const item = items.find((i) => i.id === id);
  if (!item) return NextResponse.json({ error: 'No existe ese registro.' }, { status: 404 });

  await eliminarInfoTecnica(item._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó información técnica', item.nombreActividad);

  return NextResponse.json({ ok: true });
})
