import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerClases, agregarClases } from '../../../../lib/datosClases';
import { parsearLineaHorario } from '../../../../lib/salasLogic';
import { registrarAccion } from '../../../../lib/auditoria';

// POST /api/clases/importar -> { texto }
// Pegado masivo del horario semanal: "DIA HH:MM CODIGO NUMERO Sala N", una clase por línea.
// Se escribe todo en un solo llamado a la API (agregarClases en bloque), no una por una.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { texto } = await request.json();
  const lineas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean);

  const existentes = await leerClases();
  const yaExiste = (codigo, edicion, numero) =>
    existentes.some((c) => c.codigo === codigo && (c.edicion || '1') === edicion && c.numero === numero);

  const errores = [];
  const nuevas = [];
  lineas.forEach((linea, idx) => {
    const r = parsearLineaHorario(linea);
    if (!r) return;
    if (r.error) { errores.push(r.error); return; }
    if (r.numero && yaExiste(r.codigo, r.edicion, r.numero)) return; // no duplicar
    nuevas.push({ ...r, id: `${r.codigo}-${r.edicion}-${r.numero}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}` });
  });

  if (nuevas.length > 0) {
    await agregarClases(nuevas);
  }

  await registrarAccion(usuario.email, usuario.nombre, 'Importó horario', `${nuevas.length} clase(s) nuevas`);
  return NextResponse.json({ agregadas: nuevas.length, errores });
})
