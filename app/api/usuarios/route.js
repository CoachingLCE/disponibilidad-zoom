import { NextResponse } from 'next/server';
import { requireUsuario } from '../../../lib/requireUsuario';
import { tienePermisoAccesos, tienePermisoGestionarAdmins } from '../../../lib/permisos';
import { listarUsuarios, crearUsuario, puedeAsignarRoles, rolesValidos, buscarUsuarioPorEmail } from '../../../lib/gestionUsuarios';
import { registrarAccion } from '../../../lib/auditoria';

export async function GET(request) {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(actor)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const usuarios = await listarUsuarios();
  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  const actor = await requireUsuario(request);
  if (!actor) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(actor)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await request.json();
  const { email, nombre, roles } = body;

  if (!email || !nombre || !rolesValidos(roles)) {
    return NextResponse.json({ error: 'Faltan datos o los roles no son válidos.' }, { status: 400 });
  }
  if (!puedeAsignarRoles(actor, roles, tienePermisoGestionarAdmins)) {
    return NextResponse.json(
      { error: 'Solo un Super Admin puede crear usuarios con rol Admin o SuperAdmin.' },
      { status: 403 }
    );
  }

  const existente = await buscarUsuarioPorEmail(email);
  if (existente) {
    return NextResponse.json({ error: 'Ese email ya existe en Usuarios.' }, { status: 409 });
  }

  await crearUsuario({ email, nombre, roles });
  await registrarAccion(actor.email, actor.nombre, 'Creó usuario', `${email} (${roles.join(', ')})`);

  return NextResponse.json({ ok: true });
}
