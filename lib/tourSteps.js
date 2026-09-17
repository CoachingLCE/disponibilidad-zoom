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
    titulo: 'Salas Zoom',
    texto: 'Mostrá qué salas están libres u ocupadas, reservá una clase nueva y consultá los datos de acceso de cada sala.',
    accion: 'Desde acá se organiza y reserva una clase.'
  },
  {
    id: 'incidencias',
    pagina: '/incidencias',
    selector: 'a[href="/incidencias"]',
    titulo: 'Incidencias',
    texto: 'Acá se cargan y consultan las situaciones que necesitan atención: choques de horario, salas sin asignar, y más.',
    accion: 'Revisalo cuando algo no cierre en el cronograma.'
  },
  {
    id: 'analisis',
    pagina: '/analisis',
    selector: 'a[href="/analisis"]',
    titulo: 'Análisis',
    texto: 'Métricas y reportes para hacer seguimiento: uso de salas, ediciones activas, postergaciones, y los mails automáticos de la app.',
    accion: 'Para mirar el panorama general de la operación.'
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
  { id: 'organizar-clase', label: 'Organizar una clase', pasoInicial: 'salas-zoom' },
  { id: 'buscar-sala', label: 'Buscar una sala Zoom', pasoInicial: 'salas-zoom' },
  { id: 'consultar-formacion', label: 'Consultar una formación', pasoInicial: 'formaciones' },
  { id: 'ver-incidencia', label: 'Ver una incidencia', pasoInicial: 'incidencias' },
  { id: 'consultar-analisis', label: 'Consultar análisis', pasoInicial: 'analisis' }
];
