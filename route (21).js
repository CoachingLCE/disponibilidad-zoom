import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerHistorialCompleto } from '../../../lib/datosClases';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const historial = (await leerHistorialCompleto()).slice(0, 200);
  return NextResponse.json({ historial });
})
