import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerClases, agregarClase } from '../../../../lib/datosClases';
import { parsearLineaHorario } from '../../../../lib/salasLogic';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/clases/importar -> { texto }
// Pegado masivo del horario semanal: "DIA HH:MM CODIGO NUMERO Sala N", una clase por línea.
export async function POST(request) {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { texto } = await request.json();
  const lineas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);

  const existentes = await leerClases();
  const yaExiste = (codigo, edicion, numero) =>
    existentes.some((c) => c.codigo === codigo && (c.edicion || '1') === edicion && c.numero === numero);

  const errores = [];
  let agregadas = 0;
  for (const linea of lineas) {
    const r = parsearLineaHorario(linea);
    if (!r) continue;
    if (r.error) { errores.push(r.error); continue; }
    if (r.numero && yaExiste(r.codigo, r.edicion, r.numero)) continue; // no duplicar
    await agregarClase({ ...r, id: `${r.codigo}-${r.edicion}-${r.numero}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
    agregadas++;
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó horario', `${agregadas} clase(s) nuevas`);
  return NextResponse.json({ agregadas, errores });
}
