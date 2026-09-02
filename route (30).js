import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../lib/permisos';
import { leerFeriados, agregarFeriado } from '../../../lib/datosClases';
import { registrarAccion } from '../../../lib/auditoria';
import { formatFechaCorta } from '../../../lib/salasLogic';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const feriados = await leerFeriados();
  return NextResponse.json({ feriados });
})

export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { fecha, motivo, bloquea } = await request.json();
  if (!fecha || !motivo) return NextResponse.json({ error: 'Completá la fecha y el motivo.' }, { status: 400 });

  await agregarFeriado({ fecha, motivo, bloquea: !!bloquea });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó feriado', `${motivo} — ${formatFechaCorta(fecha)}`);

  return NextResponse.json({ ok: true });
})
