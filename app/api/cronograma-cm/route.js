import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCM } from '../../../lib/permisos';
import { leerActividadesCM, agregarActividadCM, agregarActividadesCM } from '../../../lib/datosCM';
import { registrarAccion } from '../../../lib/auditoria';
import { fechasRepeticion, DIAS_REPETICION, MAX_ACTIVIDADES_POR_CARGA } from '../../../lib/repeticionCM';

// GET /api/cronograma-cm — cualquier usuario logueado puede VER.
export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const actividades = await leerActividadesCM();
  return NextResponse.json({ actividades });
})

// POST /api/cronograma-cm -> { fecha, dia, horaMin, tipo, detalle, repetirSemanas?, dias? }
// Solo puede editar quien tenga el permiso específico de Cronograma CM (por ahora, Jennifer).
// `repetirSemanas` (opcional, pedido de Diego): cuántas semanas seguidas cargar la misma
// actividad de una — 1 (o sin mandarlo) es el comportamiento de siempre, una sola fecha. Con
// más de 1 se arma una fila por semana (misma hora/tipo/detalle, +7 días cada vez — el día de
// la semana no cambia al sumar semanas enteras) y se insertan todas juntas.
// `dias` (opcional, pedido de Diego): en vez de repetir el mismo día de la semana de `fecha`, repetir ESOS días (ej. todos los
// lunes y miércoles) durante `repetirSemanas` semanas, desde la semana de `fecha` y sin cargar nada hacia atrás. La cuenta de
// fechas es la misma función (lib/repeticionCM.js) que usa el formulario para mostrar cuántas se van a cargar.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCM(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para editar Cronograma CM.' }, { status: 403 });
  }

  const body = await request.json();
  const { fecha, dia, horaMin, tipo, detalle, repetirSemanas, dias } = body;
  if (!fecha || !tipo) {
    return NextResponse.json({ error: 'Faltan datos (fecha o tipo).' }, { status: 400 });
  }

  const semanas = Math.min(Math.max(parseInt(repetirSemanas, 10) || 1, 1), 52);
  const diasSel = Array.isArray(dias) ? [...new Set(dias.filter((d) => DIAS_REPETICION.includes(d)))] : [];
  let cantidad = 1;
  if (diasSel.length === 0 && semanas <= 1) {
    await agregarActividadCM({ fecha, dia, horaMin, tipo, detalle });
  } else {
    const fechas = fechasRepeticion({ fecha, dias: diasSel, semanas });
    if (fechas.length === 0) return NextResponse.json({ error: 'La fecha no es válida.' }, { status: 400 });
    if (fechas.length > MAX_ACTIVIDADES_POR_CARGA) {
      return NextResponse.json({ error: `Son demasiadas actividades de una vez (${fechas.length}). El máximo es ${MAX_ACTIVIDADES_POR_CARGA}: probá con menos semanas o menos días.` }, { status: 400 });
    }
    cantidad = fechas.length;
    await agregarActividadesCM(fechas.map((x) => ({ fecha: x.fecha, dia: x.dia, horaMin, tipo, detalle })));
  }
  await registrarAccion(
    usuario.email, usuario.nombre, 'Agregó a Cronograma CM',
    `${tipo}${detalle ? ' — ' + detalle : ''}${cantidad > 1 ? ` (repetida: ${cantidad} actividades en ${semanas} semana${semanas === 1 ? '' : 's'}${diasSel.length ? ' · ' + diasSel.join(', ') : ''})` : ''}`
  );

  return NextResponse.json({ ok: true, cantidad });
})
