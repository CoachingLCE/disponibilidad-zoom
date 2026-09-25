import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarCronograma } from '../../../lib/permisos';
import { leerInfoTecnica, agregarInfoTecnica, agregarInfoTecnicaBulk } from '../../../lib/datosInfoTecnica';
import { leerClases } from '../../../lib/datosClases';
import { registrarAccion } from '../../../lib/auditoria';
import { fechaToDia, BUFFER_MIN } from '../../../lib/salasLogic';

// Un horario de Masterclass es texto libre ("20:00 a 21:15", "20hs", "20:00"), no un campo
// estructurado como en el cronograma — se intenta sacar inicio/fin de ahí para poder chequear
// choques de sala; si no se puede interpretar, se deja pasar sin chequear (mejor no bloquear
// por un formato raro que bloquear una carga válida por un falso choque).
function parseHorarioLibre(horario) {
  if (!horario) return null;
  const horas = [...horario.matchAll(/(\d{1,2})[:.hH](\d{2})?/g)].map((m) => {
    const hh = parseInt(m[1], 10), mm = parseInt(m[2] || '0', 10);
    if (hh > 23 || mm > 59) return null;
    return hh * 60 + mm;
  }).filter((n) => n != null);
  if (horas.length === 0) return null;
  const horaMin = horas[0];
  const duracion = horas.length > 1 && horas[1] > horaMin ? horas[1] - horaMin : 90;
  return { horaMin, duracion };
}

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const items = await leerInfoTecnica();
  return NextResponse.json({ items });
})

// Acepta un registro suelto, o { items: [...] } para cargar varios de una vez
// (usado en la auto-carga de los datos fijos que ya vienen en el código).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarCronograma(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const existentes = await leerInfoTecnica();
    const nombresExistentes = new Set(existentes.map((i) => i.nombre));
    const nuevos = body.items.filter((i) => !nombresExistentes.has(i.nombre));
    if (nuevos.length > 0) await agregarInfoTecnicaBulk(nuevos);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó información técnica', `${nuevos.length} nuevo(s)`);
    return NextResponse.json({ ok: true, agregados: nuevos.length });
  }

  const { nombre, formato, mes, fecha, disertante, horario, formularioInscripcion, salaZoom, linkAcceso, moderador } = body;
  if (!nombre) return NextResponse.json({ error: 'Falta el nombre de la actividad.' }, { status: 400 });

  // Si se eligió una sala de Zoom y se pudo interpretar el horario, se chequea que esa sala
  // esté libre ese día y horario antes de guardar — mismo criterio que ya se usa para
  // Formaciones y para el resto de "Info. técnica" (Masterclass, etc.) en /api/actividades,
  // que hasta ahora era el único lado donde se chequeaba.
  if (salaZoom && fecha) {
    const franja = parseHorarioLibre(horario);
    if (franja) {
      const { horaMin, duracion } = franja;
      const dia = fechaToDia(fecha);
      const inicioProp = horaMin - BUFFER_MIN, finProp = horaMin + duracion;
      const clases = await leerClases();
      const choqueClase = clases.find((c) =>
        c.sala === salaZoom && c.dia === dia && (!c.fecha || c.fecha === fecha) &&
        inicioProp < (c.horaMin + c.duracion) && (c.horaMin - BUFFER_MIN) < finProp
      );
      if (choqueClase) {
        return NextResponse.json({ error: `${salaZoom} está ocupada ese horario por ${choqueClase.label}.` }, { status: 409 });
      }
      const otrasMasterclass = await leerInfoTecnica();
      const choqueOtra = otrasMasterclass.find((it) => {
        if (it.salaZoom !== salaZoom || it.fecha !== fecha) return false;
        const f = parseHorarioLibre(it.horario);
        if (!f) return false;
        return inicioProp < (f.horaMin + f.duracion) && (f.horaMin - BUFFER_MIN) < finProp;
      });
      if (choqueOtra) {
        return NextResponse.json({ error: `${salaZoom} ya está reservada ese horario para "${choqueOtra.nombre}".` }, { status: 409 });
      }
    }
  }

  await agregarInfoTecnica({ nombre, formato, mes, fecha, disertante, horario, formularioInscripcion, salaZoom, linkAcceso, moderador });
  await registrarAccion(usuario.email, usuario.nombre, 'Agregó información técnica', nombre);

  return NextResponse.json({ ok: true });
})
