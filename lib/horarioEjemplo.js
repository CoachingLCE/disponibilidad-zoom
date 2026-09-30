// Horario semanal de ejemplo, con las salas reales que confirmaste (colores del Sheet original).
// Se usa para precargar el textarea de "Cargar horario" en Salas Zoom.
// Auditado el 30/09/2026 contra las pantallas "Reuniones > Próximas" de cada cuenta de Zoom
// (Sala 1 a 7) que pasó Diego: se corrigieron día/horario/sala de varias ediciones (CEQUI 16,
// CO 45, CO 46, CO 53, CV 5) y se sacaron del todo las ediciones que ya no tenían reunión
// futura en ninguna sala porque YA FINALIZARON (verificado con la fecha de inicio real +
// cantidad de clases del curso, no a ojo): CO 31, 32, 33, 34, 35, 36, CDEP 11, 12, 13,
// CEQUI 15, CE 62, 63 y OR 18. Coaching Ontológico edición 51 se deja igual (Sala Comunidad, sin
// confirmar todavía) porque esa sí sigue vigente — es la que figura en Alertas activas como
// "Falta cargar la clase" por no tener ninguna clase creada aún.
export const HORARIO_EJEMPLO = `LUNES 18:00 CDEP 15 Sala 3
LUNES 18:00 CO 43 Sala 7
LUNES 19:00 CO 48 Sala 1
LUNES 19:00 CV 4 Sala 2
MARTES 10:00 CO 45 Sala 5
MARTES 18:00 CE 64 Sala 2
MARTES 19:00 CO 41 Sala 4
MARTES 19:00 CO 39 Sala 1
MARTES 19:00 CO 51 Sala Comunidad
MIERCOLES 10:00 OR 19 Sala 2
MIERCOLES 18:00 CE 65 Sala 4
MIERCOLES 18:00 CV 5 Sala 6
MIERCOLES 19:00 CO 42 Sala 1
MIERCOLES 19:00 CO 46 Sala 5
MIERCOLES 19:00 CDEP 14 Sala 2
MIERCOLES 19:00 CO 55 Sala 3
JUEVES 10:00 CO 54 Sala 5
JUEVES 18:00 CE 66 Sala 2
JUEVES 19:00 CO 38 Sala 6
JUEVES 19:00 CO 49 Sala 5
JUEVES 19:00 CO 40 Sala 7
JUEVES 19:00 CDEP 16 Sala 3
VIERNES 17:00 CO 50 Sala 4
VIERNES 18:00 CO 52 Sala 3
VIERNES 18:00 CEQUI 16 Sala 1
VIERNES 18:00 CO 53 Sala 5
SABADO 10:00 CO 47 Sala 2
SABADO 10:00 CO 37 Sala 6
SABADO 10:00 CO 44 Sala 4`;
