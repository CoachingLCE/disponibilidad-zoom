import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerFeriados, actualizarFeriado, eliminarFeriado } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';
import { formatFechaCorta } from '../../../../lib/salasLogic';

export async function PATCH(request, { params }) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const feriados = await leerFeriados();
  const feriado = feriados.find((f) => f.id === id);
  if (!feriado) return NextResponse.json({ error: 'No existe ese feriado.' }, { status: 404 });

  const cambios = await request.json();
  await actualizarFeriado(feriado._rowIndex, cambios);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó feriado', `${cambios.motivo || feriado.motivo} — ${formatFechaCorta(cambios.fecha || feriado.fecha)}`);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const feriados = await leerFeriados();
  const feriado = feriados.find((f) => f.id === id);
  if (!feriado) return NextResponse.json({ error: 'No existe ese feriado.' }, { status: 404 });

  await eliminarFeriado(feriado._rowIndex);
  await registrarAccion(usuario.email, usuario.nombre, 'Eliminó feriado', `${feriado.motivo} — ${formatFechaCorta(feriado.fecha)}`);

  return NextResponse.json({ ok: true });
}
