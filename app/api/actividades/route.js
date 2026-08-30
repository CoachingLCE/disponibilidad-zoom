import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../lib/permisos';
import { leerActividades, agregarActividad } from '../../../lib/datosClases';
import { registrarAccion } from '../../../lib/auditoria';
import { nombreCurso, fechaToDia } from '../../../lib/salasLogic';

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actividades = await leerActividades();
  return NextResponse.json({ actividades });
})

// POST /api/actividades -> { fecha, tipo, curso, edicion, horaTxt, docente, tematica, observaciones }
// Solo para tipos que NO son "Formación" (esas se reservan vía /api/clases/reservar, porque necesitan sala).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { fecha, tipo, curso, edicion, horaTxt, docente, tematica, observaciones } = body;
  if (!fecha || !tipo) return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  if (tipo === 'Formación') {
    return NextResponse.json({ error: 'Las actividades de tipo Formación se reservan desde Salas Zoom / Cronograma (necesitan sala).' }, { status: 400 });
  }

  const [hh, mm] = (horaTxt || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  await agregarActividad({
    fecha, dia: fechaToDia(fecha), tipo, curso: curso || '', nombreCurso: nombreCurso(curso),
    edicion: edicion || '', horaMin: hh * 60 + mm, horaTxt, docente, tematica, observaciones
  });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó al cronograma', `${tipo}${curso ? ' — ' + nombreCurso(curso) : ''}`);

  return NextResponse.json({ ok: true });
})
