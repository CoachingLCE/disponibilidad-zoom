import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../lib/permisos';
import { leerActividadesCM, actualizarActividadCM, eliminarActividadCM } from '../../../../lib/datosCM';
import { registrarAccion } from '../../../../lib/auditoria';

// PATCH /api/cronograma-cm/[id] -> { fecha, dia, horaMin, tipo, detalle }
// Mismo permiso que crear: solo quien tenga tienePermisoEditarCM (Jennifer / SuperAdmin).
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });
  }

  const id = decodeURIComponent(params.id);
  const actividades = await leerActividadesCM();
  const actividad = actividades.find((a) => a.id === id);
  if (!actividad) return NextResponse.json({ error: 'No existe esa actividad.' }, { status: 404 });

  const body = await request.json();
  const { fecha, dia, horaMin, tipo, detalle } = body;
  if (!fecha || !tipo) {
    return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  }

  await actualizarActividadCM(actividad._rowIndex, { fecha, dia, horaMin, tipo, detalle });
  await registrarAccion(
    usuario.email, usuario.nombre, 'Editó actividad de Cronograma CM',
    `${actividad.tipo}${actividad.detalle ? ' — ' + actividad.detalle : ''} → ${tipo}${detalle ? ' — ' + detalle : ''}`
  );

  return NextResponse.json({ ok: true });
})

// DELETE /api/cronograma-cm/[id]
export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });
  }

  const id = decodeURIComponent(params.id);
  const actividades = await leerActividadesCM();
  const actividad = actividades.find((a) => a.id === id);
  if (!actividad) return NextResponse.json({ error: 'No existe esa actividad.' }, { status: 404 });

  await eliminarActividadCM(actividad._rowIndex);
  await registrarAccion(
    usuario.email, usuario.nombre, 'Eliminó actividad de Cronograma CM',
    `${actividad.tipo}${actividad.detalle ? ' — ' + actividad.detalle : ''} (${actividad.fecha})`
  );

  return NextResponse.json({ ok: true });
})
