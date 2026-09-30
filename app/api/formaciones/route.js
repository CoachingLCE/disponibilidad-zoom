import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerFormacionesManual, escribirFormacionManual } from '../../../lib/datosClases';
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

// POST /api/formaciones -> { codigo, edicion, fechaInicio, fechaFinal?, estado?, mesesCertificacion? }
// Corrige a mano los datos de una edición: antes solo se podía tocar la Fecha de inicio
// desde el detalle de una clase en Cronograma; ahora la tarjeta de Formaciones manda
// también Fecha de finalización, Estado y Meses para certificación cuando el usuario
// edita esos campos ahí. Un campo que no viene en el body queda sin tocar (se conserva
// el valor ya cargado). Mismo permiso que editar clases del cronograma.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { codigo, edicion } = body;
  if (!codigo || !edicion) return NextResponse.json({ error: 'Falta código o edición.' }, { status: 400 });

  const cambios = {};
  if ('fechaInicio' in body) cambios.fechaInicio = body.fechaInicio || '';
  if ('fechaFinal' in body) cambios.fechaFinal = body.fechaFinal || '';
  if ('estado' in body) cambios.estado = body.estado || '';
  if ('mesesCertificacion' in body) cambios.mesesCertificacion = body.mesesCertificacion || '';

  await escribirFormacionManual(codigo, edicion, cambios);
  await registrarAccion(
    usuario.email, usuario.nombre, 'Editó formación',
    `${codigo} ${edicion} → inicio ${cambios.fechaInicio || '(sin cambio)'}, final ${cambios.fechaFinal || '(sin cambio)'}, estado ${cambios.estado || '(sin cambio)'}, meses cert. ${cambios.mesesCertificacion || '(sin cambio)'}`
  );

  return NextResponse.json({ ok: true });
})
