import { NextResponse } from 'next/server';
import { conManejo } from '../../../../../lib/apiHandler';
import { requireUsuario } from '../../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../../lib/permisos';
import { reordenarEnlacesCM } from '../../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../../lib/auditoria';

// POST /api/cronograma-cm/enlaces/orden
// Body: { items: [...] } — el array completo de recursos (fijos + del Sheet) ya en su
// posición final, tal como quedó después de arrastrar y soltar en "Centro de recursos".
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });

  const body = await request.json();
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Falta el orden de los recursos.' }, { status: 400 });
  }

  await reordenarEnlacesCM(body.items);
  await registrarAccion(usuario.email, usuario.nombre, 'Reordenó recursos en Cronograma CM', `${body.items.length} recurso(s)`);

  return NextResponse.json({ ok: true });
})
