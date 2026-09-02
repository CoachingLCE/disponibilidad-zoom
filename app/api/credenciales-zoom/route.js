import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { readSheet } from '../../../lib/sheets';

// GET /api/credenciales-zoom -> usuario/contraseña de cada sala de Zoom.
// Se cargan directo en la pestaña "CredencialesZoom" del Sheet (Sala, Usuario, Contrasena) —
// no hay edición desde la app todavía, se actualiza a mano en el Sheet cuando cambien.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const filas = await readSheet('CredencialesZoom');
  const credenciales = filas.filter((f) => f.Sala).map((f) => ({
    sala: f.Sala, usuario: f.Usuario || '', contrasena: f.Contrasena || ''
  }));

  return NextResponse.json({ credenciales });
})
