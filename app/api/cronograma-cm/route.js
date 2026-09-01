import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../lib/permisos';
import { leerActividadesCM, agregarActividadCM } from '../../../lib/datosCM';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/cronograma-cm — cualquier usuario logueado puede VER.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actividades = await leerActividadesCM();
  return NextResponse.json({ actividades });
})

// POST /api/cronograma-cm -> { fecha, dia, horaMin, tipo, detalle }
// Solo puede editar quien tenga el permiso específico de Cronograma CM (por ahora, Jennifer).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });
  }

  const body = await request.json();
  const { fecha, dia, horaMin, tipo, detalle } = body;
  if (!fecha || !tipo) {
    return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  }

  await agregarActividadCM({ fecha, dia, horaMin, tipo, detalle });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó a Cronograma CM', `${tipo}${detalle ? ' — ' + detalle : ''}`);

  return NextResponse.json({ ok: true });
})
