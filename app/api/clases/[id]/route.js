import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar, tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerClases, actualizarClase, eliminarClasePorId } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';
import { BUFFER_MIN } from '../../../../lib/salasLogic';

// PATCH /api/clases/[id] -> { nuevaSala? , docente?, tematica?, observaciones? }
// Cambiar sala revisa choques como antes. Los demás campos (docente/temática/observaciones)
// se pueden editar libremente — son datos informativos, no afectan la disponibilidad.
// Educativo (Sofía, Paula) puede editar cualquiera de estos campos ya cargados.
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const { nuevaSala, docente, tematica, observaciones } = await request.json();

  const clases = await leerClases();
  const clase = clases.find((c) => c.id === id);
  if (!clase) return NextResponse.json({ error: 'No existe esa clase.' }, { status: 404 });

  const patch = {};
  let detalleAccion = '';

  if (nuevaSala) {
    const inicioProp = clase.horaMin - BUFFER_MIN, finProp = clase.horaMin + clase.duracion;
    const choque = clases.find((c) =>
      c.id !== id && c.sala === nuevaSala && c.dia === clase.dia &&
      inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
    );
    if (choque) {
      return NextResponse.json({ error: `${nuevaSala} está ocupada ese horario por ${choque.label}.` }, { status: 409 });
    }
    patch.Sala = nuevaSala;
    detalleAccion += `Sala: ${clase.sala} → ${nuevaSala}. `;
  }
  if (docente !== undefined) { patch.Docente = docente; detalleAccion += 'Docente actualizado. '; }
  if (tematica !== undefined) { patch.Tematica = tematica; detalleAccion += 'Temática actualizada. '; }
  if (observaciones !== undefined) { patch.Observaciones = observaciones; detalleAccion += 'Observaciones actualizadas. '; }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No se envió ningún campo para actualizar.' }, { status: 400 });
  }

  await actualizarClase(clase._rowIndex, patch);
  await registrarAccion(usuario.email, usuario.nombre, 'Editó clase', `${clase.label} — ${detalleAccion.trim()}`);

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
