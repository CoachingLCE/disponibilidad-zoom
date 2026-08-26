import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerPostergaciones } from '../../../lib/datosClases';

export async function GET(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const postergaciones = await leerPostergaciones();
  return NextResponse.json({ postergaciones });
}
