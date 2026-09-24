import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerMasterclasses, actualizarMasterclase, eliminarMasterclase } from '../../../../lib/datosMasterclasses';
import { registrarAccion } from '../../../../lib/auditoria';

export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const cambios = await request.json();

  const todas = await leerMasterclasses();
  const m = todas.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: 'No existe ese registro.' }, { status: 404 });

  await actualizarMasterclase(m._rowIndex, cambios);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó Masterclass', `${m.tema || m.categoria} — ${m.fecha || ''}`);

  return NextResponse.json({ ok: true });
})

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const todas = await leerMasterclasses();
  const m = todas.find((x) => x.id === id);
  if (!m) return NextResponse.json({ error: 'No existe ese registro.' }, { status: 404 });

  await eliminarMasterclase(m._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó Masterclass', `${m.tema || m.categoria} — ${m.fecha || ''}`);

  return NextResponse.json({ ok: true });
})
