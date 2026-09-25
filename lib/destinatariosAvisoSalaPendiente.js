// Destinatarios del aviso diario "Actividad(es) pendiente(s) de asignar sala" (07:00 hora
// Argentina) — lib compartida por el cron real y por la pestaña Emails, para que ambos
// muestren siempre la misma lista (mismo criterio que destinatariosAvisoActividades.js).
//
// ⚠️ Los emails de Victoria y Lourdes se completaron siguiendo el mismo patrón que ya usa el
// resto del equipo en este archivo (nombre.apellido@institutoilce.com) — Diego: confirmá que
// sean exactamente estos antes de subir, o corregilos acá si no.
export const DESTINATARIOS_AVISO_SALA_PENDIENTE = [
  { nombre: 'Victoria Defilippe', email: 'victoria.defilippe@institutoilce.com' },
  { nombre: 'Lourdes Barrantes', email: 'lourdes.barrantes@institutoilce.com' }
];
