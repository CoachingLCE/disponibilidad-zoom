import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditar } from '../../../../lib/permisos';
import { leerClases, agregarClases, leerFeriados, feriadoEnFecha } from '../../../../lib/datosClases';
import { registrarAccion } from '../../../../lib/auditoria';
import {
  DURACIONES, fechaToDia, toISO, formatFechaCorta, chequearDisponibilidad
} from '../../../../lib/salasLogic';

// POST /api/clases/reservar
// Body: { fecha, codigo, edicion, numero, cantidad, sala, docente?, tematica?, observaciones? }
//
// Si `sala` viene vacía, solo CONSULTA disponibilidad (no reserva) y devuelve { libres, ocupadas }.
// Si `sala` viene, RESERVA de verdad (una clase, o una serie completa si cantidad > 1),
// corriendo por feriado cada ocurrencia que caiga en una fecha bloqueada.
//
// Toda la serie se escribe en UN solo llamado a la API (agregarClases en bloque) — reservar
// una edición completa (por ejemplo 48 clases) de a una por vez supera el límite de
// escrituras por minuto de Google Sheets.
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditar(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { fecha, horaTxt, codigo, edicion, numero, cantidad = 1, sala, docente, tematica, observaciones } = body;

  if (!fecha || !horaTxt || !codigo || !DURACIONES[codigo]) {
    return NextResponse.json({ error: 'Faltan datos (fecha, hora o curso no reconocido).' }, { status: 400 });
  }
  const [hh, mm] = horaTxt.split(':').map((n) => parseInt(n, 10));
  const horaMin = hh * 60 + mm;
  const duracion = DURACIONES[codigo];
  const dia = fechaToDia(fecha);

  const feriados = await leerFeriados();
  const feriadoInicio = feriadoEnFecha(feriados, fecha);
  if (feriadoInicio && cantidad <= 1) {
    return NextResponse.json(
      { error: `No se puede agendar el ${formatFechaCorta(fecha)}: es feriado (${feriadoInicio.motivo}).` },
      { status: 409 }
    );
  }

  const clases = await leerClases();
  const { ocupadas, libres } = chequearDisponibilidad(clases, dia, horaMin, duracion);

  // Modo consulta: no viene sala todavía, solo informar disponibilidad.
  if (!sala) {
    const detalleOcupadas = Object.entries(ocupadas).map(([s, c]) => ({
      sala: s, label: c.label, libera: c.horaMin + c.duracion
    }));
    return NextResponse.json({ libres, ocupadas: detalleOcupadas, dia });
  }

  if (!libres.includes(sala)) {
    return NextResponse.json({ error: `${sala} ya no está libre a esa hora — volvé a consultar.` }, { status: 409 });
  }

  // Armar la serie completa (corriendo por feriado) y recién al final escribirla toda junta.
  const numeroInicial = numero ? parseInt(numero, 10) : null;
  const corridas = [];
  const omitidas = [];
  const nuevasClases = [];
  let fechaCursor = new Date(fecha + 'T00:00:00');

  for (let i = 0; i < cantidad; i++) {
    if (i > 0) fechaCursor.setDate(fechaCursor.getDate() + 7);
    let feriado = feriadoEnFecha(feriados, toISO(fechaCursor));
    while (feriado) {
      fechaCursor.setDate(fechaCursor.getDate() + 7);
      corridas.push(`clase ${i + 1} pasó al ${formatFechaCorta(toISO(fechaCursor))} (por ${feriado.motivo})`);
      feriado = feriadoEnFecha(feriados, toISO(fechaCursor));
    }
    const fechaStr = toISO(fechaCursor);
    const numeroI = numeroInicial !== null ? String(numeroInicial + i) : '';
    const labelI = codigo + (numeroI ? ' ' + numeroI : '');

    if (numeroI && clases.some((c) => c.codigo === codigo && (c.edicion || '1') === (edicion || '1') && c.numero === numeroI)) {
      omitidas.push(labelI);
      continue;
    }

    nuevasClases.push({
      dia, horaMin, codigo, edicion: edicion || '1', numero: numeroI, sala, label: labelI, duracion,
      fecha: fechaStr, docente: docente || '', tematica: tematica || '', observaciones: observaciones || '',
      id: `${codigo}-${edicion || '1'}-${numeroI || 'x'}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
    });
  }

  if (nuevasClases.length > 0) {
    await agregarClases(nuevasClases);
  }
  const agregadas = nuevasClases.length;

  const primerLabel = codigo + (numeroInicial !== null ? ' ' + numeroInicial : '');
  await registrarAccion(
    usuario.email, usuario.nombre, 'Reservó',
    `${primerLabel}${cantidad > 1 ? ' (serie de ' + agregadas + ')' : ''} — ${sala}, ${dia.toLowerCase()} ${horaTxt}`
  );

  return NextResponse.json({ ok: true, agregadas, corridas, omitidas });
})
