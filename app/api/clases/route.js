import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerClases } from '../../../lib/datosClases';

export async function GET(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const clases = await leerClases();
  return NextResponse.json({ clases });
}
