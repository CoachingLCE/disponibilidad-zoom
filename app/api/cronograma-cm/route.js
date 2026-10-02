import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../lib/permisos';
import { leerActividadesCM, agregarActividadCM, agregarActividadesCM } from '../../../lib/datosCM';
import { registrarAccion } from '../../../lib/auditoria';

// GET /api/cronograma-cm — cualquier usuario logueado puede VER.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actividades = await leerActividadesCM();
  return NextResponse.json({ actividades });
})

// POST /api/cronograma-cm -> { fecha, dia, horaMin, tipo, detalle, repetirSemanas? }
// Solo puede editar quien tenga el permiso específico de Cronograma CM (por ahora, Jennifer).
// `repetirSemanas` (opcional, pedido de Diego): cuántas semanas seguidas cargar la misma
// actividad de una — 1 (o sin mandarlo) es el comportamiento de siempre, una sola fecha. Con
// más de 1 se arma una fila por semana (misma hora/tipo/detalle, +7 días cada vez — el día de
// la semana no cambia al sumar semanas enteras) y se insertan todas juntas.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });
  }

  const body = await request.json();
  const { fecha, dia, horaMin, tipo, detalle, repetirSemanas } = body;
  if (!fecha || !tipo) {
    return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  }

  const semanas = Math.min(Math.max(parseInt(repetirSemanas, 10) || 1, 1), 52);
  if (semanas <= 1) {
    await agregarActividadCM({ fecha, dia, horaMin, tipo, detalle });
  } else {
    const items = Array.from({ length: semanas }, (_, i) => {
      const f = new Date(fecha + 'T00:00:00');
      f.setDate(f.getDate() + i * 7);
      const y = f.getFullYear(), m = String(f.getMonth() + 1).padStart(2, '0'), d = String(f.getDate()).padStart(2, '0');
      return { fecha: `${y}-${m}-${d}`, dia, horaMin, tipo, detalle };
    });
    await agregarActividadesCM(items);
  }
  await registrarAccion(
    usuario.email, usuario.nombre, 'Agregó a Cronograma CM',
    `${tipo}${detalle ? ' — ' + detalle : ''}${semanas > 1 ? ` (repetida ${semanas} semanas)` : ''}`
  );

  return NextResponse.json({ ok: true });
})
