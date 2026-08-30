import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerClases, actualizarClase, eliminarClasePorId } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';
import { BUFFER_MIN } from '../../../../lib/salasLogic';

export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const { nuevaSala } = await request.json();
  if (!nuevaSala) return NextResponse.json({ error: 'Falta la nueva sala.' }, { status: 400 });

  const clases = await leerClases();
  const clase = clases.find((c) => c.id === id);
  if (!clase) return NextResponse.json({ error: 'No existe esa clase.' }, { status: 404 });

  const inicioProp = clase.horaMin - BUFFER_MIN, finProp = clase.horaMin + clase.duracion;
  const choque = clases.find((c) =>
    c.id !== id && c.sala === nuevaSala && c.dia === clase.dia &&
    inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
  );
  if (choque) {
    return NextResponse.json({ error: `${nuevaSala} está ocupada ese horario por ${choque.label}.` }, { status: 409 });
  }

  await actualizarClase(clase._rowIndex, { Sala: nuevaSala });
  await registrarAccion(usuario.email, usuario.nombre, 'Cambió sala', `${clase.label} — ${clase.sala} → ${nuevaSala}`);

  return NextResponse.json({ ok: true });
})

export const DELETE = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const clases = await leerClases();
  const clase = clases.find((c) => c.id === id);
  if (!clase) return NextResponse.json({ error: 'No existe esa clase.' }, { status: 404 });

  await eliminarClasePorId(id);
  await registrarAccion(usuario.email, usuario.nombre, 'Canceló clase', `${clase.label} — ${clase.sala}, ${clase.dia.toLowerCase()}`);

  return NextResponse.json({ ok: true });
})
