// Roles posibles: 'Colaborador', 'Admin', 'SuperAdmin', 'Educativo'
// Un usuario tiene un único rol (selección única, no combinable).

function tieneAlguno(usuario, roles) {
  if (!usuario || !usuario.roles) return false;
  return usuario.roles.some((r) => roles.includes(r));
}

// Ver la app (dashboard, cronograma, formaciones, salas, incidencias, análisis) — todos los roles logueados.
export function tienePermisoVer(usuario) {
  return tieneAlguno(usuario, ['Colaborador', 'Admin', 'SuperAdmin', 'Educativo']);
}

// Cargar/editar datos operativos: reservar salas, postergar, cargar feriados, agregar al cronograma.
export function tienePermisoEditar(usuario) {
  return tieneAlguno(usuario, ['Admin', 'SuperAdmin']);
}

// Ver y gestionar la pantalla de Accesos: agregar/desactivar Colaboradores y Admins, resetear contraseñas.
export function tienePermisoAccesos(usuario) {
  return tieneAlguno(usuario, ['Admin', 'SuperAdmin']);
}

// Crear o eliminar otros Admins / Super Admins (reservado a Super Admin).
export function tienePermisoGestionarAdmins(usuario) {
  return tieneAlguno(usuario, ['SuperAdmin']);
}

// Rol Educativo (Sofía, Paula): puede editar cualquier campo ya cargado en Cronograma
// (docente, temática, observaciones, sala) e informar/postergar clases — a diferencia de
// Colaborador (solo ve) y por fuera de Admin/SuperAdmin, sin darle el resto de los permisos
// de Admin (gestionar usuarios, feriados, etc.).
export function tienePermisoEditarCronograma(usuario) {
  return tieneAlguno(usuario, ['Admin', 'SuperAdmin', 'Educativo']);
}

// Editar Cronograma CM: permiso aparte de los roles generales, específico por persona.
// Por ahora solo Jennifer Rebasti — para sumar a alguien más, agregar su email acá.
// SuperAdmin también puede, por si hace falta cargar algo en su ausencia.
const EMAILS_EDITAN_CM = ['jennifer.rebasti@institutoilce.com'];

export function tienePermisoEditarCM(usuario) {
  if (!usuario) return false;
  if (tieneAlguno(usuario, ['SuperAdmin'])) return true;
  return EMAILS_EDITAN_CM.includes((usuario.email || '').toLowerCase());
}
