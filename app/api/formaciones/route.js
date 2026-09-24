import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerFormacionesManual, escribirFechaInicioFormacion } from '../../../lib/datosClases';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/formaciones -> fechas y estado cargados a mano en la pestaña "Formaciones" del Sheet.
// Complementa (no reemplaza) el cálculo automático que hace calcularFormaciones desde
// el horario de Salas Zoom.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formaciones = await leerFormacionesManual();
  return NextResponse.json({ formaciones });
})

// POST /api/formaciones -> { codigo, edicion, fechaInicio } — corrige a mano la Fecha de
// inicio de una edición (pensado para el detalle de una clase en Cronograma, cuando el
// cálculo automático quedó mal). Mismo permiso que editar clases del cronograma.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { codigo, edicion, fechaInicio } = await request.json();
  if (!codigo || !edicion) return NextResponse.json({ error: 'Falta código o edición.' }, { status: 400 });

  await escribirFechaInicioFormacion(codigo, edicion, fechaInicio || '');
  await registrarAccion(usuario.email, usuario.nombre, 'Corrigió fecha de inicio de formación', `${codigo} ${edicion} → ${fechaInicio || '(vacía)'}`);

  return NextResponse.json({ ok: true });
})
