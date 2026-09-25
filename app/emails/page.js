'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { DESTINATARIOS_RESUMEN } from '../../lib/destinatariosResumen';
import { DESTINATARIOS_AVISO_FECHAS } from '../../lib/destinatariosAvisoFechas';
import { DESTINATARIOS_AVISO_ACTIVIDADES } from '../../lib/destinatariosAvisoActividades';
import { DESTINATARIOS_AVISO_SALA_PENDIENTE } from '../../lib/destinatariosAvisoSalaPendiente';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

// Mismo color por tipo de movimiento que usa el mail real (app/api/cron/resumen-semanal),
// para que la vista previa de acá coincida exactamente con lo que se termina mandando.
const COLOR_ACCION = {
  'Creada': '#16a34a',
  'Postergada': '#d97706',
  'Cambio de sala': '#2563eb',
  'Eliminada': '#dc2626'
};

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
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;"><b style="color:${COLOR_ACCION[h.accion] || '#1f2937'};">${h.accion}</b></td>
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

// Ejemplo de cómo se ve el aviso mensual de fechas — con datos de muestra, nunca se
// manda de verdad desde acá (para eso está el cron real del día 20).
function previsualizarAvisoFechas() {
  const filasEjemplo = [
    { fecha: '12/05/2026', motivo: 'Semana internacional del coaching', bloquea: false },
    { fecha: '05/06/2026', motivo: 'Día mundial del medio ambiente', bloquea: false },
    { fecha: '09/07/2026', motivo: 'Día de la Independencia', bloquea: true }
  ];
  const filas = filasEjemplo.map((f) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;"><b>${f.fecha}</b></td>
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

function previsualizarAvisoActividades() {
  const ej = [
    { fecha: '02/11/2026', form: 'Coaching Ontológico 45', hora: '19:00', sala: 'Sala 6' },
    { fecha: '05/11/2026', form: 'Coaching Deportivo 14', hora: '19:00', sala: 'Sala 3' },
    { fecha: '10/11/2026', form: 'Coaching de Equipos 15', hora: '10:00', sala: 'Sala 2' }
  ];
  const filas = ej.map((c) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;"><b>${c.fecha}</b></td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.form}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.hora}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.sala}</td>
  </tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#1f2937;">
    <p>Hola</p><p>\u00bfc\u00f3mo est\u00e1s?</p><p>Te pasamos el listado de actividades de <b>Noviembre 2026</b>:</p>
    <table style="border-collapse:collapse;width:100%;max-width:680px;font-size:13px;">
      <thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:6px 10px;">Fecha</th><th style="padding:6px 10px;">Formaci\u00f3n</th><th style="padding:6px 10px;">Horario</th><th style="padding:6px 10px;">Sala</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="margin-top:16px;color:#64748b;font-size:12px;">Este aviso se gener\u00f3 autom\u00e1ticamente desde Cronograma ILCE.</p>
  </div>`;
}

function previsualizarAvisoSalaPendiente() {
  const ej = [
    { form: 'Coaching Ontológico 55', fecha: '18/11/2026', hora: '19:00', docente: 'Gisela Reyes' },
    { form: 'Coaching Educativo 63', fecha: 'Sábado (recurrente)', hora: '10:00', docente: '—' }
  ];
  const filas = ej.map((c) => `<tr>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.form}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.fecha}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${c.hora}</td>
    <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${c.docente}</td>
  </tr>`).join('');
  return `<div style="font-family:Arial,sans-serif;color:#1f2937;">
    <p>Hola</p><p>¿cómo estás?</p><p>Hay <b>2</b> actividad(es) reservada(s) sin sala todavía, esperando que se les asigne una:</p>
    <table style="border-collapse:collapse;width:100%;max-width:680px;font-size:13px;">
      <thead><tr style="background:#f1f5f9;text-align:left;"><th style="padding:6px 10px;">Formación</th><th style="padding:6px 10px;">Fecha</th><th style="padding:6px 10px;">Horario</th><th style="padding:6px 10px;">Docente</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="margin-top:12px;">Se asignan desde Inicio → "Pendientes de asignar sala", o desde Salas Zoom.</p>
    <p style="margin-top:16px;color:#64748b;font-size:12px;">Este aviso se generó automáticamente desde Cronograma ILCE.</p>
  </div>`;
}

// "cuando" es a qué dispara el envío (para la columna "Cuándo se envía", igual criterio
// que la pantalla de Emails de fichas-ilce: qué acción/cron dispara el mail, no una fecha
// puntual). "tipo" es la etiqueta corta con su propio color en la tabla, y "asunto" es el
// texto del Asunto tal cual sale (sin la cantidad, que varía en cada envío real).
const EMAILS_AUTOMATIZADOS = [
  {
    id: 'resumen-semanal',
    titulo: '📆 Resumen semanal de movimientos',
    cuando: 'Todos los lunes (automático)',
    asunto: 'Resumen semanal de clases — Cronograma ILCE',
    tipo: 'Resumen semanal',
    destinatarios: DESTINATARIOS_RESUMEN,
    descripcion: 'Lista las clases creadas, postergadas, con cambio de sala o eliminadas durante la última semana, para que el equipo esté al tanto de los movimientos en el cronograma.',
    previsualizar: previsualizarResumenSemanal
  },
  {
    id: 'aviso-fechas',
    titulo: '🗓️ Cronograma de lo que se viene (fechas)',
    cuando: 'El día 20 de cada mes (automático)',
    asunto: 'Cronograma de lo que se viene — Cronograma ILCE',
    tipo: 'Fechas y feriados',
    destinatarios: DESTINATARIOS_AVISO_FECHAS,
    descripcion: 'Lista las fechas y feriados (bloqueantes o informativos) que se vienen en las próximas semanas, para que el equipo esté al tanto con anticipación.',
    previsualizar: previsualizarAvisoFechas
  },
  {
    id: 'aviso-actividades',
    titulo: '🗓️ Cronograma de lo que se viene (actividades)',
    cuando: 'El día 25 de cada mes (automático)',
    asunto: 'Actividades del próximo mes — Cronograma ILCE',
    tipo: 'Actividades del mes',
    destinatarios: DESTINATARIOS_AVISO_ACTIVIDADES,
    descripcion: 'Lista todas las actividades y formaciones agendadas para el próximo mes, con fecha, horario y sala.',
    previsualizar: previsualizarAvisoActividades
  },
  {
    id: 'aviso-sala-pendiente',
    titulo: '⏳ Pendiente de asignar sala',
    cuando: 'Todos los días a las 07:00 (automático, solo si hay pendientes)',
    asunto: 'actividad(es) pendiente(s) de asignar sala — Cronograma ILCE',
    tipo: 'Sala pendiente',
    destinatarios: DESTINATARIOS_AVISO_SALA_PENDIENTE,
    descripcion: 'Lista las actividades que se reservaron sin elegir sala todavía (ver "Guardar sin sala" en Salas Zoom), para que se les asigne una. No se manda nada si no hay ninguna pendiente.',
    previsualizar: previsualizarAvisoSalaPendiente
  }
];

const TIPO_COLOR = {
  'Resumen semanal': 'bg-infoBg text-infoText',
  'Fechas y feriados': 'bg-warningBg text-warningText',
  'Actividades del mes': 'bg-successBg text-successText',
  'Sala pendiente': 'bg-warningBg text-warningText'
};

function nombresJoin(destinatarios) {
  const nombres = destinatarios.map((d) => d.nombre);
  if (nombres.length <= 1) return nombres[0] || '—';
  return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
}

export default function EmailsPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [previa, setPrevia] = useState(null);
  const [envios, setEnvios] = useState([]);
  const [cargandoEnvios, setCargandoEnvios] = useState(true);
  const [avisoSinRegistro, setAvisoSinRegistro] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => {
    if (!usuario) return;
    (async () => {
      try {
        const r = await fetchAutenticado('/api/emails-enviados');
        const d = await r.json();
        setEnvios(d.envios || []);
        if (d.error) setAvisoSinRegistro(true);
      } catch {
        setAvisoSinRegistro(true);
      } finally {
        setCargandoEnvios(false);
      }
    })();
  }, [usuario]);

  if (cargando || !usuario) return null;

  const q = busqueda.trim().toLowerCase();
  const enviosFiltrados = q
    ? envios.filter((e) => (e.tipo + ' ' + e.asunto + ' ' + e.destinatarios).toLowerCase().includes(q))
    : envios;

  return (
    <div className="max-w-[1300px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">📧 Emails</h1>
      <p className="text-textSec text-sm mb-5">Qué mails automáticos manda el sistema, y el registro real de cada envío.</p>

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Mails automáticos que genera el sistema</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-textSec text-left">
                <th className="p-1.5">Cuándo se envía</th>
                <th className="p-1.5">A quién</th>
                <th className="p-1.5">De / CC</th>
                <th className="p-1.5">Asunto</th>
                <th className="p-1.5">Tipo</th>
                <th className="p-1.5">Ver mail</th>
              </tr>
            </thead>
            <tbody>
              {EMAILS_AUTOMATIZADOS.map((m) => (
                <tr key={m.id} className="border-b border-border align-top">
                  <td className="p-1.5 max-w-[180px]">{m.cuando}</td>
                  <td className="p-1.5 max-w-[220px]">{nombresJoin(m.destinatarios)}</td>
                  <td className="p-1.5 whitespace-nowrap text-textSec">Cronograma ILCE</td>
                  <td className="p-1.5 max-w-[260px]">{m.asunto}</td>
                  <td className="p-1.5">
                    <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TIPO_COLOR[m.tipo] || 'bg-surface2 text-textMuted'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="p-1.5">
                    <button className="text-infoText underline whitespace-nowrap" onClick={() => setPrevia(m)}>Ver mail →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10.5px] text-textMuted mt-2">
          Cada uno describe su alcance completo al hacer clic en "Ver mail" — ahí también se ve el detalle de destinatarios y de qué depende que se mande.
        </p>
      </div>

      <div className={boxCls}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm font-semibold">Registro de envíos ({envios.length})</h2>
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs w-48"
          />
        </div>
        {cargandoEnvios ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : avisoSinRegistro ? (
          <p className="text-textSec text-xs">
            Todavía no hay registro de envíos reales — se va a empezar a completar solo, a partir del próximo mail automático que se mande.
          </p>
        ) : enviosFiltrados.length === 0 ? (
          <p className="text-textSec text-sm">{envios.length === 0 ? 'Todavía no se mandó ningún mail automático.' : 'No hay envíos que coincidan con la búsqueda.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Fecha</th><th className="p-1.5">Tipo</th><th className="p-1.5">Asunto</th>
                  <th className="p-1.5">Destinatarios</th><th className="p-1.5">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {enviosFiltrados.map((e, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-1.5 whitespace-nowrap">{new Date(e.fecha).toLocaleString('es-AR')}</td>
                    <td className="p-1.5">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TIPO_COLOR[e.tipo] || 'bg-surface2 text-textMuted'}`}>
                        {e.tipo}
                      </span>
                    </td>
                    <td className="p-1.5">{e.asunto}</td>
                    <td className="p-1.5 text-textSec">{e.destinatarios}</td>
                    <td className="p-1.5">{e.cantidad ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previa && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setPrevia(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-800">Ejemplo — {previa.titulo}</p>
                <button className="text-gray-500 text-sm" onClick={() => setPrevia(null)}>Cerrar ✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-1">{previa.cuando}</p>
              <p className="text-xs text-gray-600 mb-2">{previa.descripcion}</p>
              <p className="text-[11px] font-semibold text-gray-600 mb-0.5">Destinatarios:</p>
              <ul className="text-[11px] text-gray-600 list-disc list-inside">
                {previa.destinatarios.map((d) => <li key={d.email}>{d.nombre} ({d.email})</li>)}
              </ul>
            </div>
            <div className="p-5" dangerouslySetInnerHTML={{ __html: previa.previsualizar() }} />
          </div>
        </div>
      )}
    </div>
  );
}
