import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerFeriados, agregarFeriados } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/feriados/importar -> { items: [{fecha, motivo, bloquea}, ...] }
// Se escribe todo en un solo llamado a la API (agregarFeriados en bloque), no uno por uno.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { items } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No se recibieron feriados para importar.' }, { status: 400 });
  }

  const existentes = await leerFeriados();
  const fechasExistentes = new Set(existentes.map((f) => f.fecha));

  const nuevos = [];
  for (const item of items) {
    if (fechasExistentes.has(item.fecha)) continue; // no duplicar por fecha
    fechasExistentes.add(item.fecha);
    nuevos.push({ fecha: item.fecha, motivo: item.motivo, bloquea: !!item.bloquea });
  }

  if (nuevos.length > 0) {
    await agregarFeriados(nuevos);
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó feriados', `${nuevos.length} feriado(s) nuevos`);
  return NextResponse.json({ ok: true, agregados: nuevos.length, omitidos: items.length - nuevos.length });
})
