import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerInfoTecnica, agregarInfoTecnica } from '../../../lib/datosInfoTecnica';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const items = await leerInfoTecnica();
  return NextResponse.json({ items });
})

export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { fecha, nombreActividad, linkZoom, grabacion, plataforma, responsable, observaciones } = await request.json();
  if (!nombreActividad) return NextResponse.json({ error: 'Falta el nombre de la actividad.' }, { status: 400 });

  await agregarInfoTecnica({ fecha, nombreActividad, linkZoom, grabacion, plataforma, responsable, observaciones });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó información técnica', nombreActividad);

  return NextResponse.json({ ok: true });
})
