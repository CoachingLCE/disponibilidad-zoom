import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerActividades, agregarActividad, leerClases } from '../../../lib/datosClases';
import { registrarAccion } from '../../../lib/auditoria';
import { nombreCurso, fechaToDia, BUFFER_MIN } from '../../../lib/salasLogic';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actividades = await leerActividades();
  return NextResponse.json({ actividades });
})

// POST /api/actividades -> { fecha, tipo, curso, edicion, horaTxt, docente, tematica, observaciones, sala? }
// Solo para tipos que NO son "Formación" (esas se reservan vía /api/clases/reservar).
// Si se indica `sala` (para espacios especiales: Potencia, Laboratorios, Capacitaciones, etc.),
// se chequea que esa sala esté libre en ese día y franja horaria puntual antes de guardar —
// bloquea solo ese momento puntual, nunca de forma permanente.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { fecha, tipo, curso, edicion, horaTxt, docente, tematica, observaciones, sala } = body;
  if (!fecha || !tipo) return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  if (tipo === 'Formación') {
    return NextResponse.json({ error: 'Las actividades de tipo Formación se reservan desde Salas Zoom / Cronograma (necesitan sala).' }, { status: 400 });
  }

  const [hh, mm] = (horaTxt || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  const horaMin = hh * 60 + mm;
  const dia = fechaToDia(fecha);
  const duracion = 90; // duración estimada por defecto para espacios especiales

  if (sala) {
    const inicioProp = horaMin - BUFFER_MIN, finProp = horaMin + duracion;
    const [clases, actividades] = await Promise.all([leerClases(), leerActividades()]);

    const choqueClase = clases.find((c) =>
      c.sala === sala && c.dia === dia && (!c.fecha || c.fecha === fecha) &&
      inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
    );
    if (choqueClase) {
      return NextResponse.json({ error: `${sala} está ocupada ese horario por ${choqueClase.label}.` }, { status: 409 });
    }
    const choqueActividad = actividades.find((a) =>
      a.sala === sala && a.fecha === fecha && a.horaMin != null &&
      inicioProp < (a.horaMin + duracion) && (a.horaMin - BUFFER_MIN) < finProp
    );
    if (choqueActividad) {
      return NextResponse.json({ error: `${sala} está ocupada ese horario por ${choqueActividad.tipo} (${choqueActividad.nombreCurso || ''}).` }, { status: 409 });
    }
  }

  let avisoDocente = null;
  if (docente && docente.trim()) {
    const inicioProp = horaMin - BUFFER_MIN, finProp = horaMin + duracion;
    const clases = await leerClases();
    const choque = clases.find((c) =>
      c.dia === dia && (c.docente || '').trim().toLowerCase() === docente.trim().toLowerCase() &&
      inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
    );
    if (choque) avisoDocente = `${docente} ya tiene "${choque.label}" en ${choque.sala} a esa hora — revisá que no se pise.`;
  }

  await agregarActividad({
    fecha, dia, tipo, curso: curso || '', nombreCurso: nombreCurso(curso),
    edicion: edicion || '', horaMin, horaTxt, docente, tematica, observaciones, sala: sala || ''
  });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó al cronograma', `${tipo}${curso ? ' — ' + nombreCurso(curso) : ''}${sala ? ' — ' + sala : ''}`);

  return NextResponse.json({ ok: true, avisoDocente });
})
