import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar, tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerClases, actualizarClase, eliminarClasePorId } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';
import { BUFFER_MIN, minutosAHora } from '../../../../lib/salasLogic';

// PATCH /api/clases/[id] -> { nuevaSala?, nuevoDia?, nuevaHoraMin?, docente?, tematica?, observaciones? }
// Cambiar sala / día / horario revisa choques (los tres pueden venir juntos o por separado,
// ej. mover una clase recurrente que quedó cargada en el día equivocado). Los demás campos
// (docente/temática/observaciones) se pueden editar libremente — son datos informativos, no
// afectan la disponibilidad. Educativo (Sofía, Paula) puede editar cualquiera de estos campos.
export const PATCH = conManejo(async (request, { params }) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const id = decodeURIComponent(params.id);
  const { nuevaSala, nuevoDia, nuevaHoraMin, docente, staff, tematica, observaciones } = await request.json();

  const clases = await leerClases();
  const clase = clases.find((c) => c.id === id);
  if (!clase) return NextResponse.json({ error: 'No existe esa clase.' }, { status: 404 });

  const patch = {};
  let detalleAccion = '';

  if (nuevaSala || nuevoDia || nuevaHoraMin != null) {
    const salaFinal = nuevaSala || clase.sala;
    const diaFinal = nuevoDia || clase.dia;
    const horaFinal = nuevaHoraMin != null ? nuevaHoraMin : clase.horaMin;
    const inicioProp = horaFinal - BUFFER_MIN, finProp = horaFinal + clase.duracion;
    const choque = clases.find((c) =>
      c.id !== id && c.sala === salaFinal && c.dia === diaFinal &&
      inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
    );
    if (choque) {
      return NextResponse.json({ error: `${salaFinal} está ocupada ese horario por ${choque.label}.` }, { status: 409 });
    }
    if (nuevaSala) { patch.Sala = nuevaSala; detalleAccion += `Sala: ${clase.sala} → ${nuevaSala}. `; }
    if (nuevoDia) { patch.Dia = nuevoDia; detalleAccion += `Día: ${clase.dia} → ${nuevoDia}. `; }
    if (nuevaHoraMin != null) { patch.HoraMin = String(nuevaHoraMin); detalleAccion += `Horario: ${minutosAHora(clase.horaMin)} → ${minutosAHora(nuevaHoraMin)}. `; }
  }
  if (docente !== undefined) { patch.Docente = docente; detalleAccion += 'Docente actualizado. '; }
  if (staff !== undefined) { patch.Staff = staff; detalleAccion += 'Staff actualizado. '; }
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
