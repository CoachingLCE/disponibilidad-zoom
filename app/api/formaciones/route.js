import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerFormacionesManual } from '../../../lib/datosClases';

// GET /api/formaciones -> fechas y estado cargados a mano en la pestaña "Formaciones" del Sheet.
// Complementa (no reemplaza) el cálculo automático que hace calcularFormaciones desde
// el horario de Salas Zoom.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formaciones = await leerFormacionesManual();
  return NextResponse.json({ formaciones });
})
