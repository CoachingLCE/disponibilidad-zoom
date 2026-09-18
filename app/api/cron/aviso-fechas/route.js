import { NextResponse } from 'next/server';
import { conManejo } from '../../../../lib/apiHandler';
import { leerFeriados } from '../../../../lib/datosClases';
import { enviarMail } from '../../../../lib/mailer';
import { requireUsuario } from '../../../../lib/requireUsuario';
import { tienePermisoAccesos } from '../../../../lib/permisos';
import { DESTINATARIOS_AVISO_FECHAS } from '../../../../lib/destinatariosAvisoFechas';
import { formatFechaCorta } from '../../../../lib/salasLogic';

// Se manda una vez por mes (el 20) — la ventana de "lo que se viene" cubre un poco más
// de un mes hacia adelante, para que nada quede afuera entre un envío y el siguiente.
const DIAS_VENTANA = 40;

function armarHtml(items) {
  const filas = items.map((f) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;"><b>${formatFechaCorta(f.fecha)}</b></td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${f.motivo}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:${f.bloquea ? '#dc2626' : '#2563eb'};">${f.bloquea ? '🔒 Bloquea' : '👁️ Informativo'}</td>
    </tr>`).join('');

  return `
    <div style="font-family:Arial,sans-serif;color:#1f2937;">
      <p>Hola</p>
      <p>¿cómo estás?</p>
      <p>Te pasamos el cronograma de lo que se viene:</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;font-size:13px;">
        <thead>
          <tr style="background:#f1f5f9;text-align:left;">
            <th style="padding:6px 10px;">Fecha</th>
            <th style="padding:6px 10px;">Motivo</th>
            <th style="padding:6px 10px;">Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;color:#64748b;font-size:12px;">Este aviso se generó automáticamente desde Cronograma ILCE.</p>
    </div>
  `;
}

async function armarYEnviar() {
  const feriados = await leerFeriados();
  const hoyISO = new Date().toISOString().slice(0, 10);
  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_VENTANA);
  const limiteISO = limite.toISOString().slice(0, 10);

  const proximos = feriados
    .filter((f) => f.fecha >= hoyISO && f.fecha <= limiteISO)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (proximos.length === 0) {
    return { enviado: false, motivo: 'No hay fechas cargadas para los próximos días.' };
  }

  await enviarMail({
    to: DESTINATARIOS_AVISO_FECHAS.map((d) => `"${d.nombre}" <${d.email}>`).join(', '),
    subject: `Cronograma de lo que se viene — Cronograma ILCE (${proximos.length} fecha(s))`,
    html: armarHtml(proximos)
  });

  return { enviado: true, cantidad: proximos.length };
}

// GET /api/cron/aviso-fechas — la llama Vercel Cron el día 20 de cada mes.
// Mismo esquema de protección con CRON_SECRET que /api/cron/resumen-semanal.
export const GET = conManejo(async (request) => {
  const secretEsperado = process.env.CRON_SECRET;

  if (!secretEsperado) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Falta configurar CRON_SECRET en las variables de entorno. Este endpoint no puede quedar sin proteger en producción.' },
        { status: 500 }
      );
    }
    console.warn('⚠️ CRON_SECRET no está configurado — este endpoint quedaría abierto si esto fuera producción.');
  } else {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secretEsperado}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})

// POST /api/cron/aviso-fechas — para probarlo a mano desde Análisis o Emails (solo Admin/SuperAdmin).
export const POST = conManejo(async (request) => {
  const usuario = await requireUsuario(request);
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!tienePermisoAccesos(usuario)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const resultado = await armarYEnviar();
  return NextResponse.json({ ok: true, ...resultado });
})
