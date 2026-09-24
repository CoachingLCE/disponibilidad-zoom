import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { leerClases } from '../../../../lib/datosClases';
import { enviarMail } from '../../../../lib/mailer';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoAccesos } from '../../../../lib/permisos';
import { DESTINATARIOS_AVISO_ACTIVIDADES } from '../../../../lib/destinatariosAvisoActividades';
import { NOMBRES, formatFechaCorta, minutosAHora } from '../../../../lib/salasLogic';

// Rango del PRÓXIMO mes calendario (día 1 al último día).
function rangoProximoMes() {
  const hoy = new Date();
  const ini = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 2, 0);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const nombreMes = ini.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  return { desde: iso(ini), hasta: iso(fin), nombreMes };
}

function armarHtml(items, nombreMes) {
  const filas = items.map((c) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;"><b>${formatFechaCorta(c.fecha)}</b></td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${(NOMBRES[c.codigo] || c.codigo)}${c.numero ? ' ' + c.numero : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.horaMin != null ? minutosAHora(c.horaMin) : '—'}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.sala || '—'}</td>
    </tr>`).join('');
  const mes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;">
      <p>Hola</p>
      <p>¿cómo estás?</p>
      <p>Te pasamos el listado de actividades de <b>${mes}</b>:</p>
      <table style="border-collapse:collapse;width:100%;max-width:680px;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:6px 10px;">Fecha</th>
            <th style="padding:6px 10px;">Formación</th>
            <th style="padding:6px 10px;">Horario</th>
            <th style="padding:6px 10px;">Sala</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;color:#64748b;font-size:12px;">Este aviso se generó automáticamente desde Cronograma ILCE.</p>
    </div>
  `;
}

async function armarYEnviar() {
  const { desde, hasta, nombreMes } = rangoProximoMes();
  const clases = await leerClases();
  const items = clases
    .filter((c) => c.fecha && c.fecha >= desde && c.fecha <= hasta)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || ((a.horaMin || 0) - (b.horaMin || 0)));

  if (items.length === 0) {
    return { enviado: false, motivo: `No hay actividades cargadas para ${nombreMes}.` };
  }

  await enviarMail({
    to: DESTINATARIOS_AVISO_ACTIVIDADES.map((d) => `"${d.nombre}" <${d.email}>`).join(', '),
    subject: `Actividades de ${nombreMes} — Cronograma ILCE (${items.length})`,
    html: armarHtml(items, nombreMes)
  });

  return { enviado: true, cantidad: items.length };
}

// GET — la llama Vercel Cron el día 25 de cada mes. Protegido con CRON_SECRET (igual que aviso-fechas).
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
