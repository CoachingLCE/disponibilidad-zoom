import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerMasterclasses, agregarMasterclase, agregarMasterclasesBulk } from '../../../lib/datosMasterclasses';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const masterclasses = await leerMasterclasses();
  return NextResponse.json({ masterclasses });
})

// Acepta un registro suelto, o { items: [...] } para la carga inicial del historial completo.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();

  if (Array.isArray(body.items)) {
    await agregarMasterclasesBulk(body.items);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó Masterclasses', `${body.items.length} registro(s)`);
    return NextResponse.json({ ok: true, agregados: body.items.length });
  }

  const { fecha, dia, horario, tema, docente, categoria, sala, mod, observaciones } = body;
  if (!fecha && !tema) return NextResponse.json({ error: 'Falta la fecha o el tema.' }, { status: 400 });

  await agregarMasterclase({ fecha, dia, horario, tema, docente, categoria, sala, mod, observaciones });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó Masterclass', `${tema || categoria} — ${fecha || ''}`);

  return NextResponse.json({ ok: true });
})
