// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '0.6.0',
    fecha: '2026-08-26',
    cambios: [
      'Selector de tema Claro/Oscuro/Automático (según la hora, 07-19hs claro), igual que en Seguimiento LEAD-Estudiante.',
      'Navegación superior rediseñada: botones tipo píldora, con degradado violeta→magenta en el módulo activo — mismo estilo que el resto de tus apps.',
      'Verificados automáticamente todos los imports del proyecto (páginas, componentes, lib y API routes) — ninguno roto.'
    ]
  },
  {
    version: '0.5.4',
    fecha: '2026-08-26',
    cambios: [
      'Arreglado error de build: import roto en app/api/actividades/route.js que impedía deployar. Se verificaron automáticamente TODOS los imports del proyecto (páginas, componentes y API routes) — no quedó ninguno roto.',
      'Cronograma ahora ordena de más reciente a más viejo (antes era al revés).',
      'Cronograma: el Tipo de cada fila tiene color propio — verde para Formación, celeste para actividades con un curso asociado (Masterclass, Reuniones, etc. de un curso puntual), gris para el resto (sin curso).'
    ]
  },
  {
    version: '0.5.3',
    fecha: '2026-08-26',
    cambios: [
      'Arreglado: en Cronograma, las actividades sin fecha exacta (algunas reuniones recurrentes viejas) aparecían primero en la tabla en vez de al final, dando la falsa impresión de que faltaba cargar el resto.',
      'Agregado un contador ("X actividades cargadas en total") arriba de la tabla de Cronograma, para confirmar de un vistazo que se importó todo sin tener que contar filas a mano.'
    ]
  },
  {
    version: '0.5.2',
    fecha: '2026-08-26',
    cambios: [
      'Botón "Importar feriados 2026-2027" en Incidencias: trae de una los ~33 feriados que ya estaban cargados en el prototipo (no duplica por fecha).',
      'El horario de ejemplo (39 clases con las salas reales que confirmaste) ya viene precargado en el textarea de "Cargar horario" en Salas Zoom — solo hay que apretar Importar (o vaciarlo y pegar el real).',
      'Ahora sí: histórico de Cronograma, feriados y horario de salas, los tres con un botón de un clic, en vez de tener que cargarlos a mano.'
    ]
  },
  {
    version: '0.5.1',
    fecha: '2026-08-26',
    cambios: [
      'Botón "Importar histórico (2023-2027)" en Cronograma: trae de una las 375 actividades que ya estaban en el prototipo HTML (Formaciones, BLOG, Masterclass, Reuniones, Capacitaciones, etc.) al Sheet real, como referencia — sin tocar el sistema de salas. Se puede correr más de una vez sin duplicar.'
    ]
  },
  {
    version: '0.5.0',
    fecha: '2026-08-26',
    cambios: [
      'Los 6 módulos ya están todos conectados al Sheet real: 🏠 Inicio (dashboard con métricas, próxima clase/sala, actividades de hoy y próximas, alertas, resumen de postergadas), 📅 Cronograma (todas las actividades con filtros por tipo/formación, formulario que reserva sala automáticamente si el tipo es Formación), 🎓 Formaciones (estado, progreso y próxima clase por edición), ⚠️ Incidencias (Feriados con alta/baja propia, Postergadas, Panel de conflictos), 📊 Análisis (estadísticas generales + Historial completo).',
      'Nueva barra de navegación superior en toda la app para moverse entre los 6 módulos.',
      'Nada quedó solo en el prototipo HTML — toda la lógica (disponibilidad, series, feriados que bloquean, postergaciones en cascada, conflictos automáticos) vive ahora en el backend real, con permisos por rol.'
    ]
  },
  {
    version: '0.4.0',
    fecha: '2026-08-26',
    cambios: [
      'Configurado Tailwind con la misma paleta exacta que Seguimiento LEAD-Estudiante (tokens bg/surface2/border/text/accentPurple/accentMagenta/etc.) — toda la app pasó de estilos inline aproximados a estos colores reales.',
      'Login, Inicio, Accesos, Salas Zoom y el badge de versión ya usan las mismas clases y el mismo degradado violeta→magenta que el resto de tus apps.'
    ]
  },
  {
    version: '0.3.0',
    fecha: '2026-08-26',
    cambios: [
      'Módulo "🎥 Salas Zoom" completo y conectado al Sheet real (antes solo existía en el prototipo HTML): cargar horario (pegado masivo), Grilla semanal, Vista por sala, Estado ahora, Buscar disponibilidad/Reservar (con series y corrimiento automático por feriado).',
      'Cada clase de la grilla es clickeable: Cambiar sala (valida choques), Postergar (corre en cascada las siguientes de la edición, con motivo y observaciones), Cancelar.',
      'Colaborador puede ver todo el módulo; Admin/SuperAdmin además cargan, reservan y editan.',
      'Todo lo que se hace acá queda en el Historial (reservas, cambios de sala, cancelaciones, postergaciones).',
      'Todavía sin migrar: Inicio (dashboard), Cronograma general, Formaciones, Incidencias (feriados con CRUD propio) y Análisis.'
    ]
  },
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
