import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { limpiarClasesDuplicadas } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/clases/limpiar-duplicados
// Borra clases cargadas más de una vez con exactamente los mismos datos, dejando solo una.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const borradas = await limpiarClasesDuplicadas();
  await registrarAccion(usuario.email, usuario.nombre, 'Limpió clases duplicadas', `${borradas} fila(s) eliminadas`);

  return NextResponse.json({ ok: true, borradas });
})
