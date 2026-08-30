// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '1.1.0',
    fecha: '2026-08-29',
    cambios: [
      'Nuevo botón "Ver detalle" en Accesos, visible solo para SuperAdmin: muestra roles, estado, si tiene contraseña asignada, fecha de creación del usuario y último login (calculado del Historial).',
      'Nueva columna FechaCreacion en la hoja Usuarios (se completa sola al crear un usuario desde el panel — los usuarios ya existentes van a mostrar "No disponible" para ese dato, es esperado).'
    ]
  },
  {
    version: '1.0.0',
    fecha: '2026-08-29',
    cambios: [
      'Rediseño parte 3 (última tanda de las 7 mejoras pedidas): Análisis ahora tiene métricas ampliadas (clases/semana, horas de Zoom, % utilización de salas, sala más y menos usada, formaciones activas, postergadas, conflictos) y gráficos de barra simples (uso de salas, clases por día, clases por formación).',
      'Nueva Búsqueda global (ícono de lupa en la navegación): buscá curso, edición, formación, sala o clase — por ejemplo "CO 43" — y te muestra estado, próxima clase y sala.',
      'Nuevo botón de Acciones rápidas (esquina inferior derecha, solo para Admin/SuperAdmin): accesos directos a Nueva clase, Postergar, Reservar sala, Agregar feriado y Cargar horario.',
      'Pulido general: navegación más compacta (menos alto, sin título grande duplicado), sacados los emojis de los títulos principales de cada pantalla (se mantienen solo, puntualmente, en los botones de navegación).',
      'Con esto quedan aplicadas las 7 mejoras de UX/UI pedidas, sin tocar ninguna lógica de negocio, permisos, ni conexión con Google Sheets.'
    ]
  },
  {
    version: '0.9.1',
    fecha: '2026-08-29',
    cambios: [
      'Arreglado bug importante en la auto-carga por código: solo revisaba si la tabla estaba "vacía" para decidir si importar — si ya habías importado antes con una versión más vieja del histórico, las actividades agregadas después (por ejemplo, las de junio 2026 que faltaban) nunca se cargaban. Ahora compara contra el tamaño real del archivo fuente y completa lo que falte, sin duplicar lo que ya está.'
    ]
  },
  {
    version: '0.9.0',
    fecha: '2026-08-29',
    cambios: [
      'Rediseño parte 2: Cronograma ahora tiene vista Calendario (semanal, tipo agenda: Hora × Lunes-Sábado) además de la vista Lista — con navegación de semana anterior/siguiente, botón "Hoy", filtros por curso/sala/día, la clase que está ocurriendo ahora destacada, choques de horario/sala marcados en rojo, y un detalle al hacer clic sobre cualquier clase.',
      'Salas Zoom: arriba ahora muestra contadores (Salas totales / Disponibles / Ocupadas) y "Estado ahora" pasó a ser la vista principal — cada sala en su propia tarjeta con Libre/Ocupada, curso actual, horario, motivo (clase en curso vs. sala en preparación) y próxima clase.',
      'Incidencias reordenada por urgencia: el Panel de conflictos/alertas ahora va primero y con más peso visual; Feriados y Postergaciones (información administrativa) quedaron después.',
      'Sigue pendiente para el próximo mensaje: Análisis con gráficos, Búsqueda global, botón de Acciones rápidas, y un pulido general de tipografía/espacios en toda la app.'
    ]
  },
  {
    version: '0.8.0',
    fecha: '2026-08-29',
    cambios: [
      'Arranca el rediseño integral de UX/UI (parte 1 de varias): Inicio ahora es un dashboard operativo real — tarjetas de Clases de hoy/Próxima clase/Salas ocupadas/Salas disponibles/Incidencias activas/Formaciones en curso, Agenda de hoy, Alertas activas y Próximas clases.',
      'Nueva pestaña "📣 Cronograma CM" (todavía "Próximamente").',
      'Sacados los botones manuales de "Importar histórico" y "Importar feriados" — ahora se cargan solos por código la primera vez que la pantalla detecta que están vacíos, sin que nadie tenga que apretar nada.',
      'Salas Zoom sigue permitiendo cargar un horario real más adelante (el textarea se mantiene), pero el de ejemplo también se auto-carga la primera vez.'
    ]
  },
  {
    version: '0.7.0',
    fecha: '2026-08-29',
    cambios: [
      'Histórico de Cronograma actualizado directamente desde tu Excel real "Cronograma_de_actividades_de_ILCE.xlsx" (pestaña "Cronograma ILCE"): pasó de 375 a 383 actividades — se recuperaron 8 filas que antes no se habían tomado bien.',
      'El botón "Importar histórico" ahora identifica cada actividad por su contenido (fecha, tipo, curso, docente, etc.), no por su posición en la lista — así, aunque el archivo fuente cambie de orden o sume filas nuevas en el medio, un reimport nunca duplica lo que ya estaba cargado.'
    ]
  },
  {
    version: '0.6.2',
    fecha: '2026-08-26',
    cambios: [
      'Arreglado bug importante: el botón "Importar" del horario en Salas Zoom (y otros 10 botones parecidos en Salas Zoom, Cronograma, Incidencias y Formaciones) no mostraban ningún mensaje cuando algo fallaba — quedaban en silencio, pareciendo que "no pasaba nada" al hacer clic. Ahora todos muestran el error real.',
      'Se verificó de forma exhaustiva que ninguna acción de la app quede sin manejo de errores.'
    ]
  },
  {
    version: '0.6.1',
    fecha: '2026-08-26',
    cambios: [
      'Arreglado "Error de conexión" genérico: ahora las 16 API routes atrapan cualquier falla del servidor y devuelven un mensaje claro (por ejemplo, qué pestaña del Sheet falta, o qué variable de entorno no está cargada en Vercel) en vez de romperse en silencio.',
      'sheets.js ahora valida que existan las variables de entorno necesarias y traduce los errores de Google (pestaña inexistente, permisos, Sheet ID incorrecto) a mensajes en español entendibles.'
    ]
  },
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
