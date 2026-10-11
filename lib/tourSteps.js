// Recorrido guiado de "Necesito ayuda" — cada paso apunta a un elemento real de la
// interfaz (un link del menú, o una sección puntual de Inicio) con un selector CSS.
// Si el paso vive en otra página, el componente del tour navega solo hasta ahí.
export const TOUR_PASOS = [
  {
    id: 'inicio',
    pagina: '/',
    selector: '[data-tour="inicio-panel"]',
    titulo: 'Inicio',
    texto: 'Este es el panel general: de un vistazo ves cuántas clases hay hoy, cuántas salas están ocupadas y si hay incidencias activas.',
    accion: 'Es lo primero que ves al entrar — arrancá el día por acá.'
  },
  {
    id: 'agenda',
    pagina: '/',
    selector: '[data-tour="agenda-hoy"]',
    titulo: 'Agenda de hoy',
    texto: 'Acá aparecen todas las clases y actividades programadas para hoy, ordenadas por horario.',
    accion: 'Consultala cada mañana para saber qué tenés en el día.'
  },
  {
    id: 'tarjetas',
    pagina: '/',
    selector: '[data-tour="tarjetas-clases"]',
    titulo: 'Tarjetas de clases',
    texto: 'Cada tarjeta muestra horario, formación, edición, sala y si la clase está en curso ahora mismo.',
    accion: 'Un vistazo alcanza para tener todo lo que necesitás de esa clase.'
  },
  {
    id: 'cronograma',
    pagina: '/cronograma',
    selector: 'a[href="/cronograma"]',
    titulo: 'Cronograma',
    texto: 'Acá consultás todo lo que pasa en ILCE — Formaciones, Masterclass, Reuniones y más — por semana, por mes o en una lista.',
    accion: 'El lugar para ver y gestionar la planificación completa.'
  },
  {
    id: 'cronograma-cm',
    pagina: '/cronograma-cm',
    selector: 'a[href="/cronograma-cm"]',
    titulo: 'Cronograma CM',
    texto: 'Es el cronograma de redes y comunidad: contenido, campañas y el Centro de recursos para el equipo de Community Management.',
    accion: 'Entrá acá para planificar publicaciones y campañas.'
  },
  {
    id: 'formaciones',
    pagina: '/formaciones',
    selector: 'a[href="/formaciones"]',
    titulo: 'Formaciones',
    texto: 'Consultá dónde está cada edición: en curso, próxima a finalizar o finalizada, con fechas y vencimiento de certificación.',
    accion: 'El lugar para ver el progreso de cada formación activa.'
  },
  {
    id: 'salas-zoom',
    pagina: '/salas-zoom',
    selector: 'a[href="/salas-zoom"]',
    titulo: 'Agregar actividad',
    texto: 'Un solo lugar para cargar Formaciones (buscan sala disponible), Masterclass, Capacitaciones y demás — desde acá se organiza y reserva una clase.',
    accion: 'Desde acá se organiza y reserva una clase.'
  },
  {
    id: 'masterclasses',
    pagina: '/masterclasses',
    selector: 'a[href="/masterclasses"]',
    titulo: 'Masterclasses',
    texto: 'El historial completo de masterclasses y actividades especiales: fecha, disertante, sala y moderación de cada una.',
    accion: 'Consultalo para ver qué masterclass viene o ya se dio.'
  },
  {
    id: 'docentes-co',
    pagina: '/docentes-co',
    selector: 'a[href="/docentes-co"]',
    titulo: 'Docentes C.O',
    texto: 'Qué docente y staff tiene asignado cada edición de Coaching Ontológico en cada período, y el historial completo de asignaciones.',
    accion: 'El lugar para asignar o corregir un docente/staff de C.O.'
  },
  {
    id: 'incidencias',
    pagina: '/incidencias',
    selector: 'a[href="/incidencias"]',
    titulo: 'Alertas y feriados',
    texto: 'Acá se cargan y consultan las situaciones que necesitan atención: choques de horario, salas sin asignar, y más.',
    accion: 'Revisalo cuando algo no cierre en el cronograma.'
  },
  {
    id: 'analisis',
    pagina: '/analisis',
    selector: 'a[href="/analisis"]',
    titulo: 'Análisis',
    texto: 'Métricas y reportes para hacer seguimiento: uso de salas, ediciones activas y postergaciones.',
    accion: 'Para mirar el panorama general de la operación.'
  },
  {
    id: 'emails',
    pagina: '/emails',
    selector: 'a[href="/emails"]',
    titulo: 'Emails',
    texto: 'Los mails automáticos que envía el sistema (avisos de sala pendiente, resumen semanal) y el registro de cada envío.',
    accion: 'Consultalo si hay dudas sobre un aviso automático.'
  },
  {
    id: 'credenciales-zoom',
    pagina: '/credenciales-zoom',
    selector: 'a[href="/credenciales-zoom"]',
    titulo: 'Credenciales Zoom',
    texto: 'Los datos de acceso (usuario/contraseña) de cada cuenta de Zoom que se usa para las salas.',
    accion: 'El lugar para consultar o actualizar un acceso de Zoom.'
  },
  {
    id: 'info-tecnica',
    pagina: '/info-tecnica',
    selector: 'a[href="/info-tecnica"]',
    titulo: 'Info. técnica',
    texto: 'Actividades especiales (Auditorio, Networking, Supervisión, etc.) que no son una Formación ni una Masterclass, con su link de acceso y formulario de inscripción.',
    accion: null
  },
  {
    id: 'auditoria',
    pagina: '/auditoria',
    selector: 'a[href="/auditoria"]',
    titulo: 'Historial de acciones',
    soloAdmin: true,
    texto: 'Registro de quién hizo qué en el sistema — para auditar cualquier cambio (solo Admin).',
    accion: null
  },
  {
    id: 'accesos',
    pagina: '/accesos',
    selector: 'a[href="/accesos"]',
    titulo: 'Accesos',
    soloAdmin: true,
    texto: 'Quién entra al sistema y con qué permisos (solo Admin).',
    accion: null
  },
  {
    id: 'buscar',
    pagina: '/buscar',
    selector: 'a[href="/buscar"]',
    titulo: 'Buscar',
    texto: 'Buscá rápido una edición, un docente o una sala en todo el cronograma.',
    accion: null
  },
  {
    id: 'final',
    pagina: null,
    selector: null,
    titulo: '¡Listo!',
    texto: 'Ya conocés lo principal. Podés volver a hacer este recorrido cuando quieras desde "Necesito ayuda".',
    accion: null
  }
];

// Segunda capa de ayuda: en vez de recorrer todo, ir directo al paso más relevante
// para una tarea puntual.
export const TAREAS_AYUDA = [
  { id: 'organizar-clase', label: 'Organizar una clase', palabras: ['reservar', 'agendar', 'cargar clase', 'crear clase', 'agregar clase', 'programar', 'sala', 'sala zoom', 'horario', 'docente'], pasoInicial: 'salas-zoom' },
  { id: 'buscar-sala', label: 'Buscar una sala Zoom', palabras: ['zoom', 'disponibilidad', 'encontrar sala', 'sala libre'], pasoInicial: 'salas-zoom' },
  { id: 'consultar-formacion', label: 'Consultar una formación', palabras: ['curso', 'edicion', 'ver clases', 'cronograma'], pasoInicial: 'formaciones' },
  { id: 'consultar-masterclass', label: 'Consultar una masterclass', palabras: ['clase abierta', 'evento', 'charla'], pasoInicial: 'masterclasses' },
  { id: 'ver-incidencia', label: 'Ver una incidencia', palabras: ['problema', 'error', 'reporte de falla'], pasoInicial: 'incidencias' },
  { id: 'consultar-analisis', label: 'Consultar análisis', palabras: ['estadisticas', 'metricas', 'reportes', 'numeros'], pasoInicial: 'analisis' },
  { id: 'ver-auditoria', label: 'Ver el historial de acciones', palabras: ['quien hizo', 'cambios', 'registro de acciones'], pasoInicial: 'auditoria', soloAdmin: true }
];
