import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../lib/permisos';
import { leerCampanasCM, agregarCampanaCM, agregarCampanasCM } from '../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const campanas = await leerCampanasCM();
  return NextResponse.json({ campanas });
})

// Acepta { titulo, fecha, descripcion } para agregar una sola, o { items: [...] } para
// cargar varias de una vez en un solo llamado a la API (usado en la auto-carga inicial).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const existentes = await leerCampanasCM();
    const titulosExistentes = new Set(existentes.map((c) => c.titulo));
    const nuevas = body.items.filter((c) => !titulosExistentes.has(c.titulo));
    if (nuevas.length > 0) await agregarCampanasCM(nuevas);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó campañas en Cronograma CM', `${nuevas.length} nueva(s)`);
    return NextResponse.json({ ok: true, agregadas: nuevas.length });
  }

  const { titulo, fecha, descripcion } = body;
  if (!titulo) return NextResponse.json({ error: 'Falta el título.' }, { status: 400 });

  await agregarCampanaCM({ titulo, fecha, descripcion });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó campaña en Cronograma CM', titulo);

  return NextResponse.json({ ok: true });
})
