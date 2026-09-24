import { readSheet, appendRow } from './sheets';

// Registro real de cada mail automático que la app efectivamente mandó (no confundir con
// EMAILS_AUTOMATIZADOS en app/emails/page.js, que es la lista de QUÉ mails existen y cuándo
// se disparan — esto es el historial de los envíos reales, uno por fila, pestaña "EmailsEnviados").
export async function leerEmailsEnviados() {
  const filas = await readSheet('EmailsEnviados');
  return filas
    .filter((f) => f.Fecha)
    .map((f) => ({
      fecha: f.Fecha, tipo: f.Tipo || '', asunto: f.Asunto || '',
      destinatarios: f.Destinatarios || '', cantidad: f.Cantidad ? parseInt(f.Cantidad, 10) : null
    }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function registrarEnvioEmail({ tipo, asunto, destinatarios, cantidad }) {
  await appendRow('EmailsEnviados', {
    Fecha: new Date().toISOString(),
    Tipo: tipo || '',
    Asunto: asunto || '',
    Destinatarios: destinatarios || '',
    Cantidad: cantidad != null ? String(cantidad) : ''
  });
}
