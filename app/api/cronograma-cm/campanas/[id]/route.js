import { NextResponse } from 'next/server';
import { conManejo } from '../../../../../lib/apiHandler';
import { requireUsuario } from '../../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../../lib/permisos';
import { leerCampanasCM, eliminarCampanaCM } from '../../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../../lib/auditoria';

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const campanas = await leerCampanasCM();
  const c = campanas.find((x) => x.id === id);
  if (!c) return NextResponse.json({ error: 'No existe esa campaña.' }, { status: 404 });

  await eliminarCampanaCM(c._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó campaña de Cronograma CM', c.titulo);

  return NextResponse.json({ ok: true });
})
