import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { leerHistorialCompleto } from '../../../../lib/datosClases';
import { enviarMail } from '../../../../lib/mailer';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoAccesos } from '../../../../lib/permisos';

export const DESTINATARIOS_RESUMEN = [
  { nombre: 'Sofía Salgueiro', email: 'sofia.salgueiro@institutoilce.com' },
  { nombre: 'Jennifer Rebasti', email: 'jennifer.rebasti@institutoilce.com' },
  { nombre: 'Macarena Zoe Juncos Abello', email: 'Macarena.Juncos@institutoilce.com' }
];

const ACCIONES_RELEVANTES = ['Reservó', 'Postergó clase', 'Cambió sala', 'Canceló clase'];

const ETIQUETA_ACCION = {
  'Reservó': 'Creada',
  'Postergó clase': 'Postergada',
  'Cambió sala': 'Cambio de sala',
  'Canceló clase': 'Eliminada'
};

function armarHtml(items) {
  const filas = items.map((h) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><b>${ETIQUETA_ACCION[h.accion] || h.accion}</b></td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${h.detalle}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;">${h.usuario || h.email}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;">${new Date(h.fecha).toLocaleDateString('es-AR')}</td>
    </tr>`).join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;">
      <p>Hola</p>
      <p>¿cómo estás?</p>
      <p>Hemos creado durante esta semana y/o modificado los siguientes encuentros:</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:6px 10px;">Movimiento</th>
            <th style="padding:6px 10px;">Detalle</th>
            <th style="padding:6px 10px;">Quién</th>
            <th style="padding:6px 10px;">Fecha</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;color:#64748b;font-size:12px;">Este resumen se generó automáticamente desde Cronograma ILCE.</p>
    </div>
  `;
}

async function armarYEnviar() {
  const historial = await leerHistorialCompleto();
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  const recientes = historial.filter((h) => {
    const fecha = new Date(h.fecha);
    return !isNaN(fecha) && fecha >= hace7dias && ACCIONES_RELEVANTES.includes(h.accion);
  });

  if (recientes.length === 0) {
    return { enviado: false, motivo: 'No hubo clases creadas, modificadas ni eliminadas esta semana.' };
  }

  await enviarMail({
    to: DESTINATARIOS_RESUMEN.map((d) => `"${d.nombre}" <${d.email}>`).join(', '),
    subject: `Resumen semanal de clases — Cronograma ILCE (${recientes.length} movimiento(s))`,
    html: armarHtml(recientes)
  });

  return { enviado: true, cantidad: recientes.length };
}

// GET /api/cron/resumen-semanal — la llama Vercel Cron una vez por semana.
// Se protege con CRON_SECRET (Vercel manda ese header automáticamente si está configurado).
export const GET = conManejo(async (request) => {
  const secretEsperado = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secretEsperado && auth !== `Bearer ${secretEsperado}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})

// POST /api/cron/resumen-semanal — para probarlo a mano desde Análisis (solo Admin/SuperAdmin).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})
