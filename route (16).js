import { NextResponse } from 'next/server';
import { conManejo } from '../../../../../lib/apiHandler';
import { requireUsuario } from '../../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../../lib/permisos';
import { leerNotasCM, eliminarNotaCM } from '../../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../../lib/auditoria';

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const notas = await leerNotasCM();
  const n = notas.find((x) => x.id === id);
  if (!n) return NextResponse.json({ error: 'No existe esa nota.' }, { status: 404 });

  await eliminarNotaCM(n._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó nota de Cronograma CM', '');

  return NextResponse.json({ ok: true });
})
