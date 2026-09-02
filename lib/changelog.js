// Se actualiza a mano cada vez que se sube un conjunto de mejoras importante.
// Lo más nuevo va primero. Se muestra al hacer clic en el badge de versión.
export const CHANGELOG = [
  {
    version: '2.2.4',
    fecha: '2026-09-02',
    cambios: [
      'Cronograma CM: las 6 campañas y los 22 enlaces/recursos ya no dependen de una importación al Sheet que podía fallar — ahora están siempre garantizados en el código y se muestran sin importar el estado del Sheet. Lo que se agregue desde la app se suma aparte, sin duplicar lo fijo. Las fijas no tienen botón "Eliminar" (viven en el código); las agregadas por el equipo sí se pueden borrar.'
    ]
  },
  {
    version: '2.2.3',
    fecha: '2026-09-02',
    cambios: [
      'Cronograma CM: si Campañas/Enlaces/Notas no cargan, ahora se ve el error real en pantalla (antes fallaba en silencio y solo se veía "Sin campañas cargadas" sin ninguna pista de por qué).'
    ]
  },
  {
    version: '2.2.2',
    fecha: '2026-09-02',
    cambios: [
      'Arreglada inconsistencia entre pantallas: Inicio (Agenda de hoy / Próximas clases) mostraba clases de ediciones que Formaciones ya marcaba como "Finalizó" según el histórico real. Ahora las dos pantallas comparten el mismo cálculo — una edición finalizada ya no aparece en la agenda de Inicio.',
      'De paso, arreglado un bug que podía romper la pantalla (algunas filas del histórico tienen la fecha vacía y hacían fallar el cálculo de fecha de inicio).'
    ]
  },
  {
    version: '2.2.1',
    fecha: '2026-09-02',
    cambios: [
      'Formaciones: se conectó el histórico real (el mismo Excel de 383 actividades ya importado) como la fuente más confiable para saber la fecha de inicio real de cada edición puntual — antes esos datos estaban guardados pero nunca se usaban para calcular el progreso. Cuando el histórico tiene la fecha de inicio real, el sistema estima el fin (1 clase por semana) y marca "Finalizó" correctamente aunque el horario recurrente no se haya actualizado. Ejemplo verificado: CDEP 11 arrancó el 22/04/2026 → con 16 clases semanales, termina el 05/08/2026 → ya finalizó.'
    ]
  },
  {
    version: '2.2.0',
    fecha: '2026-09-02',
    cambios: [
      'Cronograma CM: horario ampliado de 9 a 19hs.',
      'Cronograma CM: nueva sección "📅 Campañas 2026" (con las 6 campañas que pasaste ya precargadas) — Jennifer y SuperAdmin pueden agregar o eliminar campañas.',
      'Cronograma CM: nueva sección "🔗 Enlaces y recursos útiles" (ebooks y links para compartir, todos precargados) — con el mismo permiso para agregar/eliminar.',
      'Cronograma CM: nueva sección "📝 Notas" tipo post-it (4 colores), para anotaciones internas del equipo de CM.',
      'Cronograma: arreglado el color de las clases pasadas/vigentes — ya no aparecen tachadas, solo con menos opacidad; las del mes en curso tienen un resalte propio.',
      'Cronograma: nuevo botón "Ver mes completo" — calendario mensual con las actividades de cada día, navegable mes a mes.',
      'Inicio: "Próximas clases" ya no salteaba las clases de HOY que todavía no pasaron — antes solo mostraba fechas estrictamente futuras y saltaba directo al día siguiente.',
      'Inicio: "Agenda de hoy" ahora muestra el identificador de la clase (ej: "CO 45") además de "Clase 45".',
      'Formaciones: arreglado un bug real donde se mostraban fracciones imposibles como "Clase 63 de 16" — ahora se detecta y avisa cuando el número de la edición supera el total de clases del curso, en vez de mostrar el dato roto.',
      'Formaciones: se conectó la pestaña "Formaciones" del Sheet (Codigo, Edicion, FechaInicio, FechaFinal, Estado) — si cargás ahí la fecha real de inicio de una edición, el sistema ahora la usa para saber si ya terminó, en vez de depender solo del número del horario recurrente (detalle de cómo cargarla en SETUP.md).'
    ]
  },
  {
    version: '2.1.0',
    fecha: '2026-08-31',
    cambios: [
      'Cronograma CM: ahora se puede Editar (Fecha, Hora, Tipo, Detalle) y Eliminar cada actividad — clickeando cualquier tarjeta del calendario se abre un modal con las dos opciones. Mismos permisos que ya existían (Jennifer y SuperAdmin), y queda registrado en el Historial. No se tocó nada de lo que ya funcionaba (agregar, calendario, navegación por semana).'
    ]
  },
  {
    version: '2.0.0',
    fecha: '2026-08-31',
    cambios: [
      'Nuevo módulo Cronograma CM (redes/comunidad): calendario semanal navegable (Lunes a Viernes, 9 a 17hs, semana actual y siguientes sin límite), con 27 tipos de actividad (Blog, Ebook, Youtube, Subir redes, Seguir 100 personas, Diplomas, Masterclass, etc.), cada uno con su color propio.',
      'Permiso específico y separado de los roles generales: solo Jennifer Rebasti (y vos como SuperAdmin, por respaldo) pueden cargar actividades ahí — cualquier otro usuario, aunque sea Admin, solo puede ver.',
      'Nueva pestaña "CronogramaCM" en el Google Sheet — agregala con las columnas Fecha, Dia, HoraMin, Tipo, Detalle, Id (detalle en SETUP.md).'
    ]
  },
  {
    version: '1.9.1',
    fecha: '2026-08-31',
    cambios: [
      'Formaciones: nuevo filtro por cuatrimestre (1er/2do/3er), calculado automáticamente para cursos de 48 clases como Coaching Ontológico (clases 1-16 = 1er cuatrimestre, 17-32 = 2do, 33-48 = 3ro). Cada tarjeta muestra su cuatrimestre y el rango de clases que le corresponde.'
    ]
  },
  {
    version: '1.9.0',
    fecha: '2026-08-31',
    cambios: [
      'Formaciones: nuevo filtro por curso (Ontológico, Educativo, Equipos, etc.), combinable con el filtro de estado (Todas/En curso/Próximas a finalizar/Finalizadas) — para ver de una, por ejemplo, solo las de Coaching Ontológico que están en curso.'
    ]
  },
  {
    version: '1.8.4',
    fecha: '2026-08-31',
    cambios: [
      'Arreglado bug crítico: las filas "borradas" (que quedan vacías en el Sheet, porque la API no puede eliminar filas de verdad) se seguían leyendo como si fueran clases reales — con sala vacía, día vacío y hora 00:00. Al haber varias filas vacías, todas "chocaban entre sí" y disparaban decenas de falsas alertas de superposición. Ahora se descartan al leer, igual que ya se hacía con Feriados y Actividades.'
    ]
  },
  {
    version: '1.8.3',
    fecha: '2026-08-31',
    cambios: [
      'Sacado el botón manual de "Detectar y borrar clases duplicadas" — ahora corre solo, en silencio, cada vez que un Admin/SuperAdmin entra a Incidencias o Salas Zoom. No hace falta apretar nada.'
    ]
  },
  {
    version: '1.8.2',
    fecha: '2026-08-31',
    cambios: [
      'Feriados: ahora se diferencian visualmente según su estado — "🔒 Bloquea" en rojo (impide agendar clases ese día) vs. "👁️ Informativo" en celeste (solo a modo de aviso), con badge de color y franja lateral en cada fila de la tabla.'
    ]
  },
  {
    version: '1.8.1',
    fecha: '2026-08-31',
    cambios: [
      'Nuevo botón "Detectar y borrar clases duplicadas" en Incidencias (aparece junto al detalle de conflictos, cuando hay alguno): identifica clases cargadas más de una vez con exactamente los mismos datos (mismo curso, número, día, hora y sala) y borra las copias de más, dejando solo una. Soluciona el caso de clases que "chocan contra sí mismas" en el detalle de conflictos.'
    ]
  },
  {
    version: '1.8.0',
    fecha: '2026-08-31',
    cambios: [
      'Arreglado bug grande en Formaciones: varios cursados en paralelo del mismo curso (ej: CO 45, CO 48, CO 43, todos corriendo a la vez en salas distintas) se mezclaban en una sola tarjeta con un progreso incorrecto ("Clase 24 de 48"). Ahora cada uno aparece como su propia tarjeta con su progreso real (ej: "CO 45" muestra Clase 45/48, "CO 48" muestra Clase 48/48).',
      'Sacado el "Edición X" de las tarjetas de Formaciones — ese dato nunca se cargaba de verdad (siempre mostraba un valor fijo inventado). Ahora el nombre de la tarjeta incluye el número identificador real (ej: "Coaching Ontológico 45").',
      'Arreglado bug importante en Cronograma: el calendario semanal no mostraba ninguna clase del horario recurrente de Salas Zoom (solo contaba clases con fecha puntual reservada) — por eso "No hay actividades cargadas esta semana" aparecía aunque hubiera 277 actividades en total. Ahora se proyectan sobre la semana que se esté mirando, igual que ya se había arreglado en Inicio.'
    ]
  },
  {
    version: '1.7.2',
    fecha: '2026-08-31',
    cambios: [
      'El tiempo de preparación de sala (buffer previo a cada clase, usado para detectar choques y disponibilidad) bajó de 45 a 15 minutos. Esto afecta a: Buscar disponibilidad, Estado ahora (Salas Zoom), y el Panel de conflictos de Incidencias — con menos margen, deberían verse menos "choques" falsos entre clases con poco tiempo libre entre sí.',
      'El texto de "Sala en preparación" ahora aclara los 15 minutos explícitamente.'
    ]
  },
  {
    version: '1.7.1',
    fecha: '2026-08-31',
    cambios: [
      'Incidencias ahora lista el detalle de cada choque de horario (sala, día, y las dos clases involucradas con su hora) — antes solo mostraba el número total, sin decir cuáles eran.'
    ]
  },
  {
    version: '1.7.0',
    fecha: '2026-08-30',
    cambios: [
      'Se saca "Nueva actividad" de Cronograma — ahora hay un solo lugar para cargar todo: el panel "Agregar actividad" en Salas Zoom, con selector de Tipo (Formación/BLOG/Masterclass/Reuniones/etc). Para Formación busca sala disponible como siempre (ahora también con Docente/Temática/Observaciones); para el resto, se agrega directo al cronograma.',
      'En Cronograma, botón "Agregar actividad →" que lleva directo a Salas Zoom.',
      'Arreglado bug importante en Salas Zoom: la auto-carga del horario de ejemplo solo se disparaba si la tabla estaba vacía — si una carga anterior se había cortado a la mitad (por el límite de escrituras de Google, ya resuelto), nunca se completaba el resto (por eso Vista por sala solo mostraba hasta Miércoles). Ahora compara contra el total real de líneas y completa lo que falte.',
      'Arreglado: en Inicio, "Próximas clases" y "Agenda de hoy" mostraban siempre "Ed. 1" para toda formación (dato que nunca se cargó realmente) — ahora muestran "Clase N" (el número real que también se ve en la Grilla de Salas Zoom).'
    ]
  },
  {
    version: '1.6.3',
    fecha: '2026-08-30',
    cambios: [
      'Mismo arreglo que Formaciones, ahora en Inicio: "Agenda de hoy" y "Próximas clases" solo contaban clases con fecha puntual — las cargadas por el horario recurrente semanal de Salas Zoom (sin fecha exacta, solo día+hora) no aparecían. Ahora se proyectan a su próxima ocurrencia real (hoy si les toca, o el próximo día que corresponda) y se muestran igual que las reservadas puntualmente.'
    ]
  },
  {
    version: '1.6.2',
    fecha: '2026-08-30',
    cambios: [
      'Arreglado bug importante en Formaciones: el cálculo de progreso solo contaba clases con fecha puntual asignada (las que pasaron por "Reservar") — las cargadas por el horario recurrente semanal en Salas Zoom (Grilla, sin fecha exacta, solo día+hora) quedaban totalmente afuera, así que esas formaciones no aparecían en la pantalla. Ahora se cuentan todas, mostrando "Lunes 18:00 (recurrente)" como próxima clase cuando todavía no tiene una fecha puntual asignada.'
    ]
  },
  {
    version: '1.6.1',
    fecha: '2026-08-30',
    cambios: [
      'Arreglado bug importante de duplicación: las 164 actividades históricas de tipo "Formación" se mostraban en Cronograma/Inicio/Buscador como si fueran clases reales, aunque no tenían sala asignada — apareciendo dos veces la misma edición (una completa desde Salas Zoom, otra "fantasma" sin sala desde el histórico). Ahora las Formación solo se muestran desde el sistema real de Salas Zoom (única fuente de verdad); el histórico sigue guardando el resto de los tipos (BLOG, Masterclass, Reuniones, etc.) como siempre.',
      'El botón "Importar histórico" ya no vuelve a guardar entradas de tipo Formación de acá en más — las que ya se habían importado antes quedan sin uso en el Sheet, pero no aparecen más en ninguna pantalla.'
    ]
  },
  {
    version: '1.6.0',
    fecha: '2026-08-30',
    cambios: [
      'Nueva pantalla "Herramientas" (ícono de llave inglesa en la navegación): accesos rápidos a Slack, Gmail, Calendar, Drive, la base de datos de Google Sheets y Zoom, más recursos institucionales (campus, valores de cursos, manual académico, repositorio del proyecto).',
      'Buscador mejorado con el mismo patrón que Seguimiento LEAD-Estudiante: búsquedas recientes guardadas, chips para filtrar por tipo (Formaciones/Clases/Salas/Actividades), tarjetas de resultado con color por formación, y "Encontrado en: ..." mostrando en qué campo coincidió (docente, número de clase, sala, fecha, estado, etc.).',
      'Cada resultado del buscador ahora es clickeable y te lleva directo al módulo correspondiente.'
    ]
  },
  {
    version: '1.5.2',
    fecha: '2026-08-30',
    cambios: [
      'Arreglado: Coaching Deportivo, Inteligencia Emocional y ESI no tenían configurado su total de clases (16 cada uno, igual que Educativo/Equipos/Oratoria/Vocacional) — por eso nunca mostraban barra de progreso ni se detectaba cuándo una edición terminaba. Ya calculan el progreso y el estado "Finalizó" correctamente, igual que el resto de las formaciones.',
      'Confirmado: agregar una Formación desde Cronograma y desde Salas Zoom usan el mismo mecanismo por debajo (reservar sala real) — por eso ya aparecían automáticamente en ambas pantallas.'
    ]
  },
  {
    version: '1.5.1',
    fecha: '2026-08-30',
    cambios: [
      'Accesos: los roles pasaron de checkboxes (se podían combinar) a selección única tipo radio — un usuario es Colaborador, Admin, o SuperAdmin, nunca dos a la vez, tanto al crear un usuario nuevo como al editar uno existente.'
    ]
  },
  {
    version: '1.5.0',
    fecha: '2026-08-30',
    cambios: [
      'Nuevo mail automático semanal (cada lunes): resumen de las clases creadas, postergadas, con cambio de sala o eliminadas de la semana, enviado a Sofía Salgueiro, Jennifer Rebasti y Macarena Juncos.',
      'En Análisis, nueva sección "Envío de mail automático" con la info de a quién se manda, y un botón "Enviar resumen ahora (prueba)" para Admin/SuperAdmin.',
      'Se arma automáticamente a partir del Historial — no requiere ninguna carga manual.',
      'Requiere agregar 3 variables de entorno nuevas en Vercel: GMAIL_USER, GMAIL_APP_PASSWORD y CRON_SECRET (detalle en SETUP.md).'
    ]
  },
  {
    version: '1.4.0',
    fecha: '2026-08-30',
    cambios: [
      'Toda la app aprovecha mucho más el ancho de pantalla (de max 900px pasó a 1440px en las pantallas principales: Inicio, Cronograma, Formaciones, Salas Zoom, Análisis).',
      'Nuevo sistema de color propio por formación (violeta=Ontológico, celeste=Educativo, verde=Equipos, naranja=Oratoria, amarillo=Vocacional, rojo=Deportivo, rosa=Inteligencia Emocional, teal=ESI) — se usa como franja lateral, punto de color y texto, nunca como fondo fuerte. Se ve en Inicio (agenda), Cronograma (calendario y lista), Formaciones (tarjetas) y Salas Zoom (grilla y estado).',
      'El color de formación y el estado (Normal/Postergada/Conflicto/En curso) ahora son visualmente independientes — un badge de estado no tapa ni reemplaza el color de la formación.',
      'Formaciones pasó de tabla a tarjetas: color propio, barra de progreso "Clase X/Y", badge de estado, y filtros (Todas / En curso / Próximas a finalizar / Finalizadas).',
      'Cronograma: nuevo filtro de rango de fecha (Hoy / Esta semana / Próxima semana / Este mes), combinable con los filtros existentes de tipo/curso/sala/día.',
      'Salas Zoom: nueva franja de color por formación en las tarjetas de "Estado ahora" y en la Grilla semanal, más un tercer estado "PRÓXIMA" (amarillo) cuando una clase está por empezar en los próximos 30 minutos.',
      'Sigue pendiente para el próximo mensaje: buscador más profundo (docente/número de clase/estado), resolver/ignorar incidencias, y combinaciones de filtros más finas en Salas Zoom.'
    ]
  },
  {
    version: '1.3.0',
    fecha: '2026-08-30',
    cambios: [
      'Accesos: al crear un usuario nuevo ahora se le puede poner la contraseña directamente ahí mismo (campo opcional) — ya no hace falta que la persona pase por /setup-password para poder entrar. Si se deja vacía, sigue funcionando como antes.',
      'Nuevo: cualquier usuario logueado puede cambiar su propia contraseña desde el link "Contraseña" al lado de "Salir" en la barra de navegación — sin depender de un Admin.'
    ]
  },
  {
    version: '1.2.0',
    fecha: '2026-08-30',
    cambios: [
      'Arreglado el bug real detrás de "0 actividades cargadas" / "sigue sin traer nada": las cargas masivas (histórico de 383 actividades, feriados, horario de salas, y reservar una edición completa de una vez) escribían fila por fila en Google Sheets, dos llamados a la API por cada una — con listas grandes, esto superaba el límite de escrituras por minuto que impone Google y la importación se caía silenciosamente en el medio ("Quota exceeded").',
      'Ahora todas esas cargas masivas escriben TODO en un único llamado a la API, sin importar cuántas filas sean (2 llamados en total en vez de cientos). Volvé a intentar "Importar histórico" y "Cargar horario" — esta vez sí debería completarse.'
    ]
  },
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
