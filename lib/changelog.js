// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '0.2.0',
    fecha: '2026-08-26',
    cambios: [
      'Nuevo Panel de Accesos: Admin/SuperAdmin pueden ver la lista de usuarios, crear nuevos, cambiar roles, activar/desactivar y resetear contraseñas — sin tener que editar el Sheet a mano.',
      'Solo un Super Admin puede crear o editar usuarios con rol Admin/SuperAdmin — un Admin normal solo gestiona Colaboradores.',
      'Cada cambio (crear usuario, editar roles, resetear contraseña) queda registrado en el Historial.',
      'Link a "🔐 Accesos" en la pantalla principal, visible solo para Admin/SuperAdmin.'
    ]
  },
  {
    version: '0.1.0',
    fecha: '2026-08-25',
    cambios: [
      'Arranque del proyecto: login con email/contraseña contra la hoja "Usuarios" de Google Sheets.',
      'Tres roles: Colaborador (solo ver), Admin (ver + editar + gestionar usuarios) y SuperAdmin (además crea/elimina otros Admins).',
      'Token de sesión firmado en el servidor — cada acción futura revalida contra el Sheet en vivo, no confía en lo que guarda el navegador.',
      'Auditoría automática de login (éxito, contraseña incorrecta, usuario desactivado) en la hoja "Historial".',
      'Todavía sin migrar: Cronograma, Formaciones, Salas Zoom, Incidencias y Análisis (siguen solo en el prototipo HTML).'
    ]
  }
];
