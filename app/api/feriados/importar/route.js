import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerFeriados, agregarFeriado } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/feriados/importar -> { items: [{fecha, motivo, bloquea}, ...] }
export async function POST(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No se recibieron feriados para importar.' }, { status: 400 });
  }

  const existentes = await leerFeriados();
  const fechasExistentes = new Set(existentes.map((f) => f.fecha));

  let agregados = 0;
  for (const item of items) {
    if (fechasExistentes.has(item.fecha)) continue; // no duplicar por fecha
    await agregarFeriado({ fecha: item.fecha, motivo: item.motivo, bloquea: !!item.bloquea });
    fechasExistentes.add(item.fecha);
    agregados++;
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó feriados', `${agregados} feriado(s) nuevos`);
  return NextResponse.json({ ok: true, agregados, omitidos: items.length - agregados });
}
