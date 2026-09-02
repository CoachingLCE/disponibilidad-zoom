import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerClases, agregarClase, actualizarClase, eliminarClasePorId } from '../../../../lib/datosClases';
import { appendRow } from '../../../../lib/sheets';
import { registrarAccion } from '../../../../lib/auditoria';
import { toISO, formatFechaCorta } from '../../../../lib/salasLogic';

const MOTIVOS = {
  salud: '🩺 Problemas de salud del docente',
  conectividad: '🌐 Problemas de conectividad',
  ausencia: '🎓 Ausencia de estudiantes',
  evento: '🏟️ Evento institucional',
  feriado_extra: '📅 Feriado extraordinario',
  otro: '✏️ Otro'
};

// POST /api/clases/postergar -> { id, motivoId, observaciones }
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const { id, motivoId, observaciones } = await request.json();
  const clases = await leerClases();
  const clase = clases.find((c) => c.id === id);
  if (!clase) return NextResponse.json({ error: 'No existe esa clase.' }, { status: 404 });
  if (!clase.fecha) return NextResponse.json({ error: 'Esta clase no tiene fecha asignada, no se puede postergar.' }, { status: 400 });

  const motivoLabel = MOTIVOS[motivoId] || motivoId || 'Sin motivo';
  const fechaOriginal = clase.fecha;
  const fechaNuevaObj = new Date(fechaOriginal + 'T00:00:00');
  fechaNuevaObj.setDate(fechaNuevaObj.getDate() + 7);
  const fechaNueva = toISO(fechaNuevaObj);

  // Registrar en el historial de postergaciones
  await appendRow('Postergaciones', {
    Codigo: clase.codigo, Edicion: clase.edicion || '1', Numero: clase.numero,
    Dia: clase.dia, HoraMin: String(clase.horaMin), Sala: clase.sala, Duracion: String(clase.duracion),
    FechaOriginal: fechaOriginal, FechaNueva: fechaNueva, Motivo: motivoLabel, Observaciones: observaciones || '',
    Usuario: usuario.nombre, FechaRegistro: toISO(new Date())
  });

  // Quitar la ocurrencia original y crear la nueva, corrida una semana
  await eliminarClasePorId(id);
  await agregarClase({
    dia: clase.dia, horaMin: clase.horaMin, codigo: clase.codigo, edicion: clase.edicion,
    numero: clase.numero, sala: clase.sala, label: clase.label, duracion: clase.duracion,
    fecha: fechaNueva, docente: clase.docente, tematica: clase.tematica, observaciones: clase.observaciones,
    id: `${clase.codigo}-${clase.edicion}-${clase.numero}-post-${Date.now()}`
  });

  // Correr en cascada todas las clases siguientes de la misma edición, una semana
  // (la nueva ocurrencia que acabamos de crear tiene el mismo número que la postergada,
  // así que "numero > numeroInt" ya la excluye sola, no hace falta chequear el id)
  const numeroInt = parseInt(clase.numero, 10);
  const clasesActualizadas = await leerClases();
  for (const c of clasesActualizadas) {
    if (
      c.codigo === clase.codigo && (c.edicion || '1') === (clase.edicion || '1') &&
      c.fecha && !isNaN(parseInt(c.numero, 10)) && parseInt(c.numero, 10) > numeroInt
    ) {
      const f = new Date(c.fecha + 'T00:00:00');
      f.setDate(f.getDate() + 7);
      await actualizarClase(c._rowIndex, { Fecha: toISO(f) });
    }
  }

  await registrarAccion(
    usuario.email, usuario.nombre, 'Postergó clase',
    `${clase.label} — ${formatFechaCorta(fechaOriginal)} → ${formatFechaCorta(fechaNueva)} (${motivoLabel})`
  );

  return NextResponse.json({ ok: true, fechaNueva });
})
