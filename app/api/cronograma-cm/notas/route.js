import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../../lib/permisos';
import { leerNotasCM, agregarNotaCM } from '../../../../lib/datosCMExtras';
import { registrarAccion } from '../../../../lib/auditoria';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const notas = await leerNotasCM();
  return NextResponse.json({ notas });
})

export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });

  const { texto, color } = await request.json();
  if (!texto || !texto.trim()) return NextResponse.json({ error: 'Escribí algo en la nota.' }, { status: 400 });

  await agregarNotaCM({ texto: texto.trim(), color, autor: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó nota en Cronograma CM', texto.trim().slice(0, 60));

  return NextResponse.json({ ok: true });
})
