import { verificarToken } from './sessionToken';
import { findUsuario } from './auth';

/**
 * Verifica el header Authorization: Bearer <token> de un request.
 * Devuelve el usuario ACTUAL (releído del Sheet, no lo que mandó el cliente)
 * o null si el token es inválido, el usuario no existe, o está desactivado.
 *
 * Usar en toda API route que lea/escriba datos, así:
 *   const usuario = await requireUsuario(request);
 *   if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
 *   if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
 */
export async function requireUsuario(request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const email = verificarToken(token);
  if (!email) return null;
  const usuario = await findUsuario(email);
  if (!usuario || !usuario.activo) return null;
  return usuario;
}
