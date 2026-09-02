import { NextResponse } from 'next/server';
import { conManejo } from '../../../../../lib/apiHandler';
import { requireUsuario } from '../../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../../lib/permisos';
import { leerEnlacesCM, eliminarEnlaceCM } from '../../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../../lib/auditoria';

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const enlaces = await leerEnlacesCM();
  const e = enlaces.find((x) => x.id === id);
  if (!e) return NextResponse.json({ error: 'No existe ese enlace.' }, { status: 404 });

  await eliminarEnlaceCM(e._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó enlace de Cronograma CM', e.titulo);

  return NextResponse.json({ ok: true });
})
