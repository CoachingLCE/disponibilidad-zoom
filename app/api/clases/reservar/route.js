import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../../lib/permisos';
import { leerClases, agregarClases, leerFeriados, feriadoEnFecha } from '../../../../lib/datosClases';
import { agregarDocentesCOBulk } from '../../../../lib/datosDocentesCO';
import { registrarAccion } from '../../../../lib/auditoria';
import {
  DURACIONES, BUFFER_MIN, fechaToDia, toISO, formatFechaCorta, chequearDisponibilidad, minutosAHora, diaLindo
} from '../../../../lib/salasLogic';

// Coaching Ontológico: una edición completa son 48 clases en 3 cuatrimestres de 16, con un
// receso de 2 semanas entre cada uno (además de la semana "normal" hasta la clase siguiente,
// así que entre el último de un cuatrimestre y el primero del próximo pasan 3 semanas). Acá
// se arma esa cadencia y se reparte el docente/staff de cada cuatrimestre en sus 16 clases —
// en vez de una sola serie corrida semana a semana con un único docente para las 48.
const CLASES_POR_CUATRIMESTRE_CO = 16;
const RECESO_EXTRA_DIAS = 14;

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
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { fecha, horaTxt, codigo, edicion, numero, cantidad = 1, sala, sinSala, docente, staff, tematica, observaciones, cuatrimestres } = body;

  // Solo se arma la cadencia con recesos y el reparto por cuatrimestre cuando de verdad se
  // está creando una edición completa de Coaching Ontológico desde su primera clase — un
  // agregado suelto de una clase, o de otro curso, sigue reservando como siempre (una serie
  // corrida semana a semana).
  const numeroInicialCO = numero ? parseInt(numero, 10) : null;
  const esEdicionCOCompleta = codigo === 'CO' && Number(cantidad) === 48 && numeroInicialCO === 1;
  // "cuatrimestres" (opcional) es [{docente, staff}, {docente, staff}, {docente, staff}] cuando
  // el docente/staff cambia entre cuatrimestres; si no viene, se usa el docente/staff único
  // (el mismo campo de siempre) para los 3.
  const cuatrimestresCO = esEdicionCOCompleta
    ? (Array.isArray(cuatrimestres) && cuatrimestres.length === 3 ? cuatrimestres : [{ docente, staff }, { docente, staff }, { docente, staff }])
    : null;

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

  // Modo consulta: no viene sala todavía y tampoco se pidió guardar sin sala — solo informar
  // disponibilidad (el paso normal, antes de elegir dónde reservar).
  if (!sala && !sinSala) {
    const detalleOcupadas = Object.entries(ocupadas).map(([s, c]) => ({
      sala: s, label: c.label, libera: c.horaMin + c.duracion
    }));

    // Choque de docente: mismo día/horario, sin importar la sala — un docente no puede
    // dar dos clases en simultáneo aunque sean en salas distintas.
    let conflictoDocente = null;
    if (docente && docente.trim()) {
      const inicioProp = horaMin - BUFFER_MIN, finProp = horaMin + duracion;
      const choque = clases.find((c) =>
        c.dia === dia && (c.docente || '').trim().toLowerCase() === docente.trim().toLowerCase() &&
        inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
      );
      if (choque) {
        conflictoDocente = `${docente} ya tiene "${choque.label}" en ${choque.sala} a esa hora — revisá antes de reservar.`;
      }
    }

    return NextResponse.json({ libres, ocupadas: detalleOcupadas, dia, conflictoDocente });
  }

  // Reservar SIN sala (queda pendiente de que alguien se la asigne después, ver Inicio →
  // "Pendientes de asignar sala") salta este chequeo — no hay ninguna sala en juego todavía.
  if (sala && !libres.includes(sala)) {
    return NextResponse.json({ error: `${sala} ya no está libre a esa hora — volvé a consultar.` }, { status: 409 });
  }

  // Armar la serie completa (corriendo por feriado) y recién al final escribirla toda junta.
  const numeroInicial = numero ? parseInt(numero, 10) : null;
  const corridas = [];
  const omitidas = [];
  const nuevasClases = [];
  let fechaCursor = new Date(fecha + 'T00:00:00');

  // Marca en qué cuatrimestre (0, 1 o 2) cae cada clase de una edición completa de C.O., para
  // repartir el docente/staff y para saber dónde insertar las 2 semanas extra de receso.
  const cuatrimestreDe = (i) => Math.min(2, Math.floor(i / CLASES_POR_CUATRIMESTRE_CO));
  const primeraFechaPorCuatrimestre = [null, null, null];
  const ultimaFechaPorCuatrimestre = [null, null, null];

  for (let i = 0; i < cantidad; i++) {
    if (i > 0) {
      fechaCursor.setDate(fechaCursor.getDate() + 7);
      // Entre el último de un cuatrimestre y el primero del próximo (clase 17 y clase 33)
      // se suman las 2 semanas de receso, además de la semana normal de cadencia.
      if (esEdicionCOCompleta && (i === CLASES_POR_CUATRIMESTRE_CO || i === CLASES_POR_CUATRIMESTRE_CO * 2)) {
        fechaCursor.setDate(fechaCursor.getDate() + RECESO_EXTRA_DIAS);
      }
    }
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

    const bloque = esEdicionCOCompleta ? cuatrimestreDe(i) : null;
    const docenteClase = bloque !== null ? (cuatrimestresCO[bloque].docente || '') : (docente || '');
    const staffClase = bloque !== null ? (cuatrimestresCO[bloque].staff || '') : (staff || '');
    if (bloque !== null) {
      if (!primeraFechaPorCuatrimestre[bloque]) primeraFechaPorCuatrimestre[bloque] = fechaStr;
      ultimaFechaPorCuatrimestre[bloque] = fechaStr;
    }

    nuevasClases.push({
      dia, horaMin, codigo, edicion: edicion || '1', numero: numeroI, sala: sala || '', label: labelI, duracion,
      fecha: fechaStr, docente: docenteClase, staff: staffClase, tematica: tematica || '', observaciones: observaciones || '',
      pendienteSala: !sala,
      id: `${codigo}-${edicion || '1'}-${numeroI || 'x'}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
    });
  }

  if (nuevasClases.length > 0) {
    await agregarClases(nuevasClases);
  }
  const agregadas = nuevasClases.length;

  // Al crear una edición completa de C.O., además de las 48 clases se guarda de una vez el
  // período de cada cuatrimestre en Docentes C.O. — antes había que cargarlo aparte a mano,
  // cuatrimestre por cuatrimestre, y era fácil que alguno quedara sin cargar ("Vacante").
  if (esEdicionCOCompleta && edicion && agregadas > 0) {
    const horarioTxt = `${minutosAHora(horaMin)} a ${minutosAHora(horaMin + duracion)}`;
    const periodos = [0, 1, 2]
      .filter((b) => primeraFechaPorCuatrimestre[b])
      .map((b) => ({
        edicion: edicion.trim(), dia: diaLindo(dia), horario: horarioTxt,
        desde: primeraFechaPorCuatrimestre[b], hasta: ultimaFechaPorCuatrimestre[b],
        docente: cuatrimestresCO[b].docente || '', staff: cuatrimestresCO[b].staff || '',
        sala: sala || '', cuatrimestre: String(b + 1),
        observaciones: 'Generado automático al crear la edición.', usuario: usuario.nombre
      }));
    if (periodos.length > 0) await agregarDocentesCOBulk(periodos);
  }

  const primerLabel = codigo + (numeroInicial !== null ? ' ' + numeroInicial : '');
  await registrarAccion(
    usuario.email, usuario.nombre, 'Reservó',
    `${primerLabel}${cantidad > 1 ? ' (serie de ' + agregadas + ')' : ''} — ${sala || 'SIN SALA (pendiente de asignar)'}, ${dia.toLowerCase()} ${horaTxt}`
  );

  return NextResponse.json({ ok: true, agregadas, corridas, omitidas });
})
