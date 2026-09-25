import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { leerClases } from '../../../../lib/datosClases';
import { enviarMail } from '../../../../lib/mailer';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoAccesos } from '../../../../lib/permisos';
import { DESTINATARIOS_AVISO_SALA_PENDIENTE } from '../../../../lib/destinatariosAvisoSalaPendiente';
import { NOMBRES, formatFechaCorta, minutosAHora } from '../../../../lib/salasLogic';
import { registrarEnvioEmail } from '../../../../lib/datosEmailsEnviados';

function armarHtml(items) {
  const filas = items.map((c) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${(NOMBRES[c.codigo] || c.codigo)}${c.numero ? ' · Edición ' + c.numero : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.fecha ? formatFechaCorta(c.fecha) : (c.dia || '') + ' (recurrente)'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.horaMin != null ? minutosAHora(c.horaMin) : '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.docente || '—'}</td>
    </tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;">
      <p>Hola</p>
      <p>¿cómo estás?</p>
      <p>Hay <b>${items.length}</b> actividad(es) reservada(s) sin sala todavía, esperando que se les asigne una:</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:6px 10px;">Formación</th>
            <th style="padding:6px 10px;">Fecha</th>
            <th style="padding:6px 10px;">Horario</th>
            <th style="padding:6px 10px;">Docente</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:12px;">Se asignan desde Inicio → "Pendientes de asignar sala", o desde Salas Zoom.</p>
      <p style="margin-top:16px;color:#64748b;font-size:12px;">Este aviso se generó automáticamente desde Cronograma ILCE.</p>
    </div>
  `;
}

async function armarYEnviar() {
  const clases = await leerClases();
  const items = clases
    .filter((c) => c.pendienteSala)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  if (items.length === 0) {
    return { enviado: false, motivo: 'No hay actividades pendientes de asignar sala.' };
  }

  const asunto = `${items.length} actividad(es) pendiente(s) de asignar sala — Cronograma ILCE`;
  await enviarMail({
    to: DESTINATARIOS_AVISO_SALA_PENDIENTE.map((d) => `"${d.nombre}" <${d.email}>`).join(', '),
    subject: asunto,
    html: armarHtml(items)
  });

  try {
    await registrarEnvioEmail({
      tipo: 'Pendiente de asignar sala', asunto,
      destinatarios: DESTINATARIOS_AVISO_SALA_PENDIENTE.map((d) => d.email).join(', '), cantidad: items.length
    });
  } catch { /* no hay pestaña de registro todavía */ }

  return { enviado: true, cantidad: items.length };
}

// GET — la llama Vercel Cron todos los días a las 07:00 hora Argentina (10:00 UTC).
// Protegido con CRON_SECRET (mismo criterio que los otros cron de la app). Solo manda mail
// si hay al menos una actividad pendiente — si no hay ninguna, no molesta a nadie.
export const GET = conManejo(async (request) => {
  const secretEsperado = process.env.CRON_SECRET;
  if (!secretEsperado) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Falta configurar CRON_SECRET en las variables de entorno.' }, { status: 500 });
    }
    console.warn('⚠️ CRON_SECRET no está configurado.');
  } else {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secretEsperado}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }
  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})

// POST — para probarlo a mano desde Emails (solo Admin/SuperAdmin).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})
