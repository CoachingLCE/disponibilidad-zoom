'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { DESTINATARIOS_RESUMEN } from '../../lib/destinatariosResumen';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

// Ejemplo de cómo se ve el mail — con datos de muestra, nunca se manda de verdad
// desde acá (para eso está el cron real de los lunes).
function previsualizarResumenSemanal() {
  const filasEjemplo = [
    { accion: 'Creada', detalle: 'Coaching Ontológico 55 — miércoles 19:00, Sala 3', usuario: 'Pau Arigos', fecha: '15/09/2026' },
    { accion: 'Postergada', detalle: 'Oratoria 19 — jueves → viernes 10:00', usuario: 'Martin Mena', fecha: '16/09/2026' },
    { accion: 'Cambio de sala', detalle: 'Coaching de Equipos 17 — Sala 2 → Sala 4', usuario: 'Adrian Saquin', fecha: '16/09/2026' },
    { accion: 'Eliminada', detalle: 'Coaching Deportivo 13 — sábado 10:00', usuario: 'Diego Lerner', fecha: '17/09/2026' }
  ];
  const filas = filasEjemplo.map((h) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><b>${h.accion}</b></td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${h.detalle}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;">${h.usuario}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;white-space:nowrap;">${h.fecha}</td>
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

const EMAILS_AUTOMATIZADOS = [
  {
    id: 'resumen-semanal',
    titulo: '📆 Resumen semanal de movimientos',
    cadencia: 'Todos los lunes',
    destinatarios: DESTINATARIOS_RESUMEN,
    descripcion: 'Lista las clases creadas, postergadas, con cambio de sala o eliminadas durante la última semana, para que el equipo esté al tanto de los movimientos en el cronograma.',
    previsualizar: previsualizarResumenSemanal
  }
];

export default function EmailsPage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();
  const [previa, setPrevia] = useState(null);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Emails</h1>
      <p className="text-textSec text-sm mb-5">Todos los mails automáticos que manda la aplicación, a quién y con qué frecuencia.</p>

      {EMAILS_AUTOMATIZADOS.map((m) => (
        <div key={m.id} className={boxCls}>
          <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
            <h2 className="text-sm font-semibold">{m.titulo}</h2>
            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-infoBg text-infoText whitespace-nowrap">{m.cadencia}</span>
          </div>
          <p className="text-xs text-textSec mb-3">{m.descripcion}</p>
          <p className="text-xs font-semibold text-textSec mb-1">Destinatarios:</p>
          <ul className="text-xs text-textSec list-disc list-inside mb-3 space-y-0.5">
            {m.destinatarios.map((d) => <li key={d.email}>{d.nombre} ({d.email})</li>)}
          </ul>
          <button className={btnSecCls} onClick={() => setPrevia(m)}>Ver ejemplo →</button>
        </div>
      ))}

      {previa && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPrevia(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Ejemplo — {previa.titulo}</p>
              <button className="text-gray-500 text-sm" onClick={() => setPrevia(null)}>Cerrar ✕</button>
            </div>
            <div className="p-5" dangerouslySetInnerHTML={{ __html: previa.previsualizar() }} />
          </div>
        </div>
      )}
    </div>
  );
}
