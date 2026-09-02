import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerInfoTecnica, agregarInfoTecnica, agregarInfoTecnicaBulk } from '../../../lib/datosInfoTecnica';
import { registrarAccion } from '../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const items = await leerInfoTecnica();
  return NextResponse.json({ items });
})

// Acepta un registro suelto, o { items: [...] } para cargar varios de una vez
// (usado en la auto-carga de los datos fijos que ya vienen en el código).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const existentes = await leerInfoTecnica();
    const nombresExistentes = new Set(existentes.map((i) => i.nombre));
    const nuevos = body.items.filter((i) => !nombresExistentes.has(i.nombre));
    if (nuevos.length > 0) await agregarInfoTecnicaBulk(nuevos);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó información técnica', `${nuevos.length} nuevo(s)`);
    return NextResponse.json({ ok: true, agregados: nuevos.length });
  }

  const { nombre, formato, mes, fecha, disertante, horario, formularioInscripcion, salaZoom, linkAcceso, moderador } = body;
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre de la actividad.' }, { status: 400 });

  await agregarInfoTecnica({ nombre, formato, mes, fecha, disertante, horario, formularioInscripcion, salaZoom, linkAcceso, moderador });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó información técnica', nombre);

  return NextResponse.json({ ok: true });
})
