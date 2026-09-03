import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { readSheet } from '../../../lib/sheets';

// GET /api/credenciales-zoom -> usuario/contraseña de cada sala de Zoom.
// Se pueden cargar en la pestaña "CredencialesZoom" del Sheet (Sala, Usuario, Contrasena)
// para agregar/editar desde ahí — pero si esa pestaña no existe todavía, no se rompe:
// devuelve vacío, y el cliente igual muestra las credenciales fijas que ya vienen en el código.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let credenciales = [];
  try {
    const filas = await readSheet('CredencialesZoom');
    credenciales = filas.filter((f) => f.Sala).map((f) => ({
      sala: f.Sala, usuario: f.Usuario || '', contrasena: f.Contrasena || ''
    }));
  } catch {
    // La pestaña todavía no existe en el Sheet — no es un error para el usuario,
    // simplemente no hay nada extra que sumar a las credenciales fijas.
  }

  return NextResponse.json({ credenciales });
})
