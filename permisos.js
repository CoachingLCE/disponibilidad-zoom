// Roles posibles: 'Colaborador', 'Admin', 'SuperAdmin'
// Un usuario puede tener más de un rol (se guardan separados por coma en el Sheet).

function tieneAlguno(usuario, roles) {
  if (!usuario || !usuario.roles) return false;
  return usuario.roles.some((r) => roles.includes(r));
}

// Ver la app (dashboard, cronograma, formaciones, salas, incidencias, análisis) — todos los roles logueados.
export function tienePermisoVer(usuario) {
  return tieneAlguno(usuario, ['Colaborador', 'Admin', 'SuperAdmin']);
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
