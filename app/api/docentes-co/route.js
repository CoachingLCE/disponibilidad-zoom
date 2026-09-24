import { NextResponse } from 'next/server';
import { conManejo } from '../../../lib/apiHandler';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoEditarDocentesCO } from '../../../lib/permisos';
import { leerDocentesCO, agregarDocenteCO, agregarDocentesCOBulk } from '../../../lib/datosDocentesCO';
import { registrarAccion } from '../../../lib/auditoria';
import { formatFechaCorta } from '../../../lib/salasLogic';

// Dos períodos "se superponen" si sus rangos Desde-Hasta se cruzan en el tiempo — un Hasta
// vacío significa "todavía vigente", así que se lo trata como fecha de fin abierta.
function rangosSuperpuestos(desde1, hasta1, desde2, hasta2) {
  const inicio1 = desde1 || '0000-00-00', fin1 = hasta1 || '9999-12-31';
  const inicio2 = desde2 || '0000-00-00', fin2 = hasta2 || '9999-12-31';
  return inicio1 <= fin2 && inicio2 <= fin1;
}

export const GET = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const asignaciones = await leerDocentesCO();
  return NextResponse.json({ asignaciones });
})

// Acepta un registro suelto, o { items: [...] } para cargar varios períodos de una vez
// (para cuando se pegue el historial completo del Excel de una sola pasada).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoEditarDocentesCO(usuario)) {
    return NextResponse.json({ error: 'No tenés permiso para asignar docentes/staff de C.O.' }, { status: 403 });
  }

  const body = await request.json();

  if (Array.isArray(body.items)) {
    const items = body.items.map((it) => ({ ...it, usuario: usuario.nombre }));
    await agregarDocentesCOBulk(items);
    await registrarAccion(usuario.email, usuario.nombre, 'Importó Docentes C.O', `${items.length} período(s)`);
    return NextResponse.json({ ok: true, agregados: items.length });
  }

  const { edicion, dia, horario, desde, hasta, docente, staff, sala, cuatrimestre, observaciones } = body;
  if (!edicion) return NextResponse.json({ error: 'Falta la edición.' }, { status: 400 });

  // Evita cargar un período duplicado o que se superpone con uno ya cargado para la misma
  // edición (ej. hacer doble clic en "Guardar", o cargar de nuevo un período por error).
  const edNorm = String(edicion).replace(/\D/g, '');
  const existentes = await leerDocentesCO();
  const choque = existentes.find((p) =>
    String(p.edicion || '').replace(/\D/g, '') === edNorm && rangosSuperpuestos(p.desde, p.hasta, desde, hasta)
  );
  if (choque) {
    return NextResponse.json({
      error: `Ya hay un período cargado para la Edición ${edicion} que se superpone con este (${choque.desde ? formatFechaCorta(choque.desde) : '—'} a ${choque.hasta ? formatFechaCorta(choque.hasta) : 'sigue vigente'}, docente: ${choque.docente || '—'}). Si es un cambio de docente a mitad de período, corregí el "Hasta" del período existente en vez de cargar uno nuevo superpuesto.`
    }, { status: 409 });
  }

  await agregarDocenteCO({ edicion, dia, horario, desde, hasta, docente, staff, sala, cuatrimestre, observaciones, usuario: usuario.nombre });
  await registrarAccion(usuario.email, usuario.nombre, 'Asignó docente/staff C.O', `Edición ${edicion} — ${docente || ''} ${staff ? '/ Staff: ' + staff : ''}`);

  return NextResponse.json({ ok: true });
})
