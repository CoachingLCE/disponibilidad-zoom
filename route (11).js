import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../lib/permisos';
import { leerEnlacesCM, agregarEnlaceCM, agregarEnlacesCM } from '../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const enlaces = await leerEnlacesCM();
  return NextResponse.json({ enlaces });
})

// Acepta { categoria, titulo, url } para agregar uno solo, o { items: [...] } para
// cargar varios de una vez en un solo llamado a la API (usado en la auto-carga inicial).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const existentes = await leerEnlacesCM();
    const titulosExistentes = new Set(existentes.map((e) => e.titulo));
    const nuevos = body.items.filter((e) => !titulosExistentes.has(e.titulo));
    if (nuevos.length > 0) await agregarEnlacesCM(nuevos);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó enlaces en Cronograma CM', `${nuevos.length} nuevo(s)`);
    return NextResponse.json({ ok: true, agregados: nuevos.length });
  }

  const { categoria, titulo, url } = body;
  if (!titulo) return NextResponse.json({ error: 'Falta el título.' }, { status: 400 });

  await agregarEnlaceCM({ categoria, titulo, url });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó enlace en Cronograma CM', titulo);

  return NextResponse.json({ ok: true });
})
