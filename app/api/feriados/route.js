import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerFeriados } from '../../../lib/datosClases';

export async function GET(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const feriados = await leerFeriados();
  return NextResponse.json({ feriados });
}
