import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { leerEmailsEnviados } from '../../../lib/datosEmailsEnviados';

// GET /api/emails-enviados -> el registro real de cada mail automático que la app mandó
// (pestaña "EmailsEnviados" del Sheet). Si esa pestaña todavía no existe (recién agregada
// esta función), se devuelve una lista vacía en vez de romper la pantalla de Emails.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const envios = await leerEmailsEnviados();
    return NextResponse.json({ envios });
  } catch (err) {
    return NextResponse.json({ envios: [], error: 'No se pudo leer la pestaña "EmailsEnviados" del Sheet (¿todavía no existe?).' });
  }
})
