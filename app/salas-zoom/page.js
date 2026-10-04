'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, TOTALES, NOMBRES, ICONOS,
  minutosAHora, horaAMinutos, formatFechaCorta, agruparParaVista, colorFormacion, colorPorSala, calcularNumeroSesion,
  calcularRangosCuatrimestresCO
} from '../../lib/salasLogic';
import { CREDENCIALES_ZOOM_DEFAULT } from '../../lib/credencialesZoomDefaults';
import { interpretarTexto } from '../../lib/lecturaInteligente';
import { tienePermisoEditarDocentesCO } from '../../lib/permisos';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';
const tabCls = (activo) => `rounded-lg px-3.5 py-1.5 text-xs font-semibold border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

// Estilos propios del panel "Agregar al cronograma" — un poco más "dashboard" que el resto
// de las cajas de la página (boxCls/inputCls/labelCls), pero sin tocar esos estilos
// compartidos con otras pantallas/vistas de este mismo archivo.
// Pedido de Diego (02/10/2026, rediseño UX/UI — sin tocar lógica): pantalla más compacta y
// con menos "cajas dentro de cajas". El panel principal se achica (menos padding) y las
// subsecciones pierden el borde/sombra propios — quedan como fondo sutil + título, la
// separación la dan los títulos y el espaciado, no un recuadro completo.
const panelCls = 'bg-surface2 border border-border/70 rounded-2xl p-4 sm:p-5 mb-4';
const campoCls = 'w-full h-9 bg-surface2 border border-border rounded-lg px-2.5 text-sm';
const campoLabelCls = 'text-[12px] text-textSec block mb-1 font-medium';
const btnPrimaryCls = 'inline-flex items-center gap-2 bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 shrink-0 h-9';
// 2ª vuelta de UX/UI (pedido de Diego, 02/10/2026): "sigue sintiéndose como un formulario
// gigante dentro de una tarjeta gigante" — se saca el fondo+borde propio de cada subsección
// (seccionCls) y se reemplaza por un título chico + una línea divisoria fina entre secciones
// (seccionDivCls), igual que un formulario prolijo de una sola pieza en vez de cajas
// apiladas. `:first-child` saca el padding/borde superior de la primera sección de cada rama.
const seccionDivCls = 'pt-3 mt-3 border-t border-border/40 first:pt-0 first:mt-0 first:border-t-0';
const seccionTituloCls = 'text-[12px] font-semibold text-text/85 mb-2';
// Textos de ayuda cortos tipo "ⓘ ..." (pedido de Diego: nada de párrafos largos sueltos en
// el formulario) — ver <AyudaCorta>.
const ayudaCls = 'flex items-start gap-1 text-[12px] text-textMuted leading-snug mt-1.5';
// El toggle "¿Mismo docente...?" pasa a un control segmentado (dos mitades de un mismo
// bloque, no dos botones sueltos) — más compacto y se lee como una sola elección.
const segmentadoCls = 'inline-flex h-8 rounded-lg border border-border bg-surface2 p-0.5 gap-0.5';
const segmentoCls = (activo) => `px-3 rounded-[7px] text-[12px] font-medium transition-colors ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white' : 'text-textSec'}`;
// Un color por cuatrimestre, nada más para diferenciarlos de un vistazo en el formulario.
const COLORES_CUATRIMESTRE = ['rgb(var(--color-accentTeal))', 'rgb(var(--color-accentPurple))', 'rgb(var(--color-accentMagenta))'];

const HORAS_OPCIONES = (() => {
  const out = [];
  for (let m = 8 * 60; m <= 22.5 * 60; m += 30) out.push(minutosAHora(m));
  return out;
})();

// useSearchParams (para precargar el formulario desde el link "Cargar actividad →" de
// Inicio) obliga a Next a envolver la página en un Suspense — si no, falla el build al
// intentar generar la página estáticamente ("should be wrapped in a suspense boundary").
export default function SalasZoomPage() {
  return (
    <Suspense fallback={null}>
      <SalasZoomPageInterna />
    </Suspense>
  );
}

function SalasZoomPageInterna() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));
  const puedeEditarCronograma = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin', 'Educativo'].includes(r));

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [credenciales, setCredenciales] = useState([]);
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [vista, setVista] = useState('estado');
  const [diaSala, setDiaSala] = useState('LUNES');

  const [accion, setAccion] = useState(null);

  // Al venir del link "Cargar actividad →" de una alerta de Inicio (edición de C.O. vigente
  // pero sin clase creada todavía), se manda la edición/fecha/docente por query params para
  // precargar el formulario de "Nueva clase" de acá abajo, en vez de que Diego tenga que
  // volver a tipear todo lo que ya se sabe.
  const searchParams = useSearchParams();
  const prefill = useMemo(() => {
    const curso = searchParams.get('prefillCurso');
    if (!curso) return null;
    return {
      curso,
      edicion: searchParams.get('prefillEdicion') || '',
      fecha: searchParams.get('prefillFecha') || '',
      docente: searchParams.get('prefillDocente') || '',
      staff: searchParams.get('prefillStaff') || '',
      horario: searchParams.get('prefillHorario') || ''
    };
  }, [searchParams]);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) { cargarDatos(); cargarCredenciales(); }
  }, [usuario]);

  async function cargarCredenciales() {
    try {
      const res = await fetchAutenticado('/api/credenciales-zoom');
      const data = await res.json();
      if (res.ok) setCredenciales(data.credenciales);
    } catch {
      // silencioso: si falla, el panel simplemente queda vacío
    }
  }

  async function cargarDatos() {
    setCargandoDatos(true);
    setErrorCarga(null);
    try {
      const [rc, rf] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados')
      ]);
      const dc = await rc.json();
      const df = await rf.json();
      if (rf.ok) setFeriados(df.feriados); else setErrorCarga(df.error);
      if (rc.ok) {
        setClases(dc.clases);
        // Se quitó (30/09/2026) la auto-carga silenciosa del horario de EJEMPLO y la
        // limpieza automática de duplicados que corrían acá solas, sin que nadie las pidiera,
        // cada vez que se entraba a esta pantalla. La auto-carga llegó a escribir datos de
        // ejemplo (Oratoria 19, CE 65, CO 46, CO 42, CDEP 14, con salas inventadas) DIRECTO
        // en el Google Sheet real de Diego cuando la cantidad de clases cargadas bajaba de 41
        // (el tamaño del horario de ejemplo) — se vieron como si fueran clases reales de hoy
        // y generaron mucha confusión. Ninguna de las dos vuelve a correr sola; si hace falta
        // limpiar duplicados de verdad, se hace a pedido explícito (ver /api/clases/limpiar-duplicados).
      } else {
        setErrorCarga(dc.error);
      }
    } catch (err) {
      setErrorCarga('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  const vistaAgrupada = useMemo(() => agruparParaVista(clases), [clases]);
  // El campo Numero de la clase identifica la EDICIÓN (ej: "CO 51"), no la sesión semanal
  // — se recalcula la posición real (mismo criterio que Cronograma) para no mostrar
  // "Clase 51 de 48" en una edición 51 recién arrancada.
  const sesionPorId = useMemo(() => calcularNumeroSesion(clases), [clases]);
  const diaHoy = DIAS_JS[new Date().getDay()];
  // Credenciales combinadas: las cargadas en el Sheet pisan a las fijas del código,
  // igual criterio que la pantalla de Credenciales Zoom.
  const credencialesCombinadas = useMemo(() => {
    const salasSheet = new Set(credenciales.map((c) => c.sala));
    const fijas = CREDENCIALES_ZOOM_DEFAULT.filter((c) => !salasSheet.has(c.sala));
    return [...credenciales, ...fijas];
  }, [credenciales]);

  if (cargando || !usuario) return null;

  const vistaAgrupadaHoy = vistaAgrupada.filter((c) => c.dia === diaHoy)
    .map((c) => ({ ...c, inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }));
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const ocupadasCount = SALAS.filter((s) => vistaAgrupadaHoy.some((o) => o.sala === s && ahoraMin >= o.inicio && ahoraMin < o.fin)).length;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-16">
      {/* Pedido de Diego (02/10/2026, 2ª vuelta): "Agregar actividad" (acá) y "Agregar al
          cronograma" (título del panel de abajo) decían casi lo mismo una arriba de la otra —
          se saca este título cuando el panel va a aparecer, porque el panel ya cumple ese rol;
          sin permiso para cargar (sin panel) se mantiene, porque si no la pantalla queda sin
          título. */}
      {!puedeEditar && (
        <>
          <h1 className="text-xl mb-1">Agregar actividad</h1>
          <p className="text-textSec text-sm mb-3.5">
            Horario semanal de las 8 salas — ver disponibilidad.
            Tu rol (Colaborador) solo puede ver, no puede cargar ni reservar.
          </p>
        </>
      )}

      {errorCarga && (
        <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{errorCarga}</div>
      )}

      {/* Sección principal: cargar algo al cronograma es lo primero que se hace al entrar acá —
          la disponibilidad de salas (antes arriba de todo) pasa a ser información de apoyo. */}
      {puedeEditar && (
        <PanelReservar fetchAutenticado={fetchAutenticado} onReservado={cargarDatos} usuario={usuario} prefill={prefill} />
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-2.5">Disponibilidad de salas</h2>

        {/* Pedido de Diego (02/10/2026): los 3 KPI de salas eran demasiado grandes para ser
            información secundaria de apoyo — pasan a una sola barra compacta. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-textSec bg-bg/60 border border-border/50 rounded-lg px-3 py-2 mb-3">
          <span><span className="font-semibold text-text">{SALAS.length}</span> Salas totales</span>
          <span className="text-border">·</span>
          <span><span className="font-semibold text-successText">{SALAS.length - ocupadasCount}</span> Disponibles</span>
          <span className="text-border">·</span>
          <span><span className="font-semibold text-warningText">{ocupadasCount}</span> Ocupadas</span>
        </div>

        <div className="flex gap-2 mb-3.5">
          <button className={tabCls(vista === 'estado')} onClick={() => setVista('estado')}>Estado ahora</button>
          <button className={tabCls(vista === 'grilla')} onClick={() => setVista('grilla')}>Grilla semanal</button>
          <button className={tabCls(vista === 'porSala')} onClick={() => setVista('porSala')}>Vista por sala</button>
        </div>

        {cargandoDatos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : vista === 'grilla' ? (
          <VistaGrilla vista={vistaAgrupada} diaHoy={diaHoy} sesionPorId={sesionPorId} onClick={(c) => setAccion({ clase: c })} />
        ) : vista === 'porSala' ? (
          <VistaPorSala vista={vistaAgrupada} diaSala={diaSala} setDiaSala={setDiaSala} />
        ) : (
          <VistaEstado vista={vistaAgrupada} diaHoy={diaHoy} onClick={(c) => setAccion({ clase: c })} />
        )}
      </div>

      {credenciales.length > 0 && (
        <div className={boxCls}>
          <button className="flex items-center justify-between w-full text-left" onClick={() => setMostrarCredenciales((v) => !v)}>
            <h2 className="text-sm font-semibold">🔑 Usuarios y contraseñas de las salas de Zoom</h2>
            <span className="text-textMuted text-xs">{mostrarCredenciales ? 'Ocultar ▲' : 'Mostrar ▼'}</span>
          </button>
          {mostrarCredenciales && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-textSec text-left">
                    <th className="p-1.5">Sala</th><th className="p-1.5">Usuario</th><th className="p-1.5">Contraseña</th>
                  </tr>
                </thead>
                <tbody>
                  {credenciales.map((c) => (
                    <tr key={c.sala} className="border-b border-border">
                      <td className="p-1.5 font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(c.sala).dot} shrink-0`} />
                          <span className={colorPorSala(c.sala).text}>{c.sala}</span>
                        </span>
                      </td>
                      <td className="p-1.5">{c.usuario}</td>
                      <td className="p-1.5 font-mono">{c.contrasena}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {accion && (
        <ModalAccion
          clase={accion.clase} onCerrar={() => setAccion(null)} fetchAutenticado={fetchAutenticado} onCambio={cargarDatos}
          puedeEditarCronograma={puedeEditarCronograma} credenciales={credencialesCombinadas} numeroSesion={sesionPorId[accion.clase.id]}
        />
      )}
    </div>
  );
}

function VistaGrilla({ vista, diaHoy, onClick, sesionPorId = {} }) {
  const horas = [...new Set(vista.map((c) => c.horaMin))].sort((a, b) => a - b);
  const diasUsados = DIAS.filter((d) => vista.some((c) => c.dia === d));
  if (horas.length === 0) return <p className="text-textSec text-sm">No hay clases cargadas.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr>
            <th className="text-[12px] text-textSec uppercase px-1.5 py-2 border-b border-border text-center">Hora</th>
            {diasUsados.map((d) => (
              <th key={d} className={`text-[12px] uppercase px-1.5 py-2 border-b border-border text-center ${d === diaHoy ? 'text-accentTeal' : 'text-text'}`}>
                {d}{d === diaHoy ? ' · hoy' : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {horas.map((h) => (
            <tr key={h}>
              <td className="border border-border align-top p-1 font-mono text-textSec whitespace-nowrap">{minutosAHora(h)}</td>
              {diasUsados.map((d) => {
                const items = vista.filter((c) => c.dia === d && c.horaMin === h);
                return (
                  <td key={d} className="border border-border align-top p-1 min-w-[100px]">
                    {items.map((c) => {
                      const color = colorFormacion(c.codigo);
                      return (
                        <div
                          key={c.id}
                          onClick={() => onClick && onClick(c)}
                          className={`${color.bg} ${color.text} border-l-2 ${color.border} rounded-md px-2 py-1 text-[12px] font-bold mb-1 ${onClick ? 'cursor-pointer' : ''} ${c.pasada ? 'opacity-45 line-through' : ''}`}
                        >
                          {ICONOS[c.codigo] || ''} {c.label}
                          <span className="block font-medium text-[12px] opacity-85">{c.sala}</span>
                          {(sesionPorId[c.id] || c.numero) && (
                            <span className="block font-medium text-[12px] opacity-80">
                              Clase {sesionPorId[c.id] || (c.serieTotal > 1 ? c.serieIndex : c.numero)}{TOTALES[c.codigo] ? ' de ' + TOTALES[c.codigo] : ''}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VistaPorSala({ vista, diaSala, setDiaSala }) {
  const diasUsados = DIAS.filter((d) => vista.some((c) => c.dia === d));
  const DIA_MIN = 9 * 60, DIA_MAX = 22.5 * 60, span = DIA_MAX - DIA_MIN;

  return (
    <div>
      <div className="mb-3.5">
        <label className={labelCls}>Día</label>
        <select value={diaSala} onChange={(e) => setDiaSala(e.target.value)} className={`${inputCls} w-52`}>
          {(diasUsados.length ? diasUsados : DIAS).map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      {SALAS.map((sala) => {
        const ocupaciones = vista.filter((c) => c.dia === diaSala && c.sala === sala);
        return (
          <div key={sala} className="grid grid-cols-[110px_1fr] gap-2.5 items-center mb-2">
            <div className="text-xs font-semibold">{sala}</div>
            <div className="relative h-[30px] bg-bg border border-border rounded-md">
              {ocupaciones.map((c) => {
                const inicio = c.horaMin - BUFFER_MIN, fin = c.horaMin + c.duracion;
                const left = Math.max(0, (inicio - DIA_MIN) / span * 100);
                const width = Math.min(100 - left, (fin - inicio) / span * 100);
                return (
                  <div
                    key={c.id} title={`${c.label} — abre ${minutosAHora(inicio)}`}
                    className={`absolute top-0.5 bottom-0.5 rounded text-white text-[12px] font-bold flex items-center px-1.5 overflow-hidden ${c.pasada ? 'bg-textMuted' : 'bg-gradient-to-r from-accentPurple to-accentMagenta'}`}
                    style={{ left: left + '%', width: width + '%' }}
                  >
                    {c.label}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VistaEstado({ vista, diaHoy, onClick }) {
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();

  return (
    <div>
      {/* Pedido de Diego (02/10/2026): esta línea es apoyo, no debe competir con el contenido
          principal — se achica y se baja el contraste. */}
      <p className="text-[12px] text-textMuted mb-2.5">Hoy {diaHoy.charAt(0) + diaHoy.slice(1).toLowerCase()}, {minutosAHora(horaActual)} hs.</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px,100%),1fr))' }}>
        {SALAS.map((sala) => {
          const ocupHoy = vista.filter((c) => c.dia === diaHoy && c.sala === sala)
            .map((c) => ({ ...c, inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }))
            .sort((a, b) => a.inicio - b.inicio);
          const enClase = ocupHoy.find((o) => horaActual >= o.horaMin && horaActual < o.fin);
          const enBuffer = !enClase && ocupHoy.find((o) => horaActual >= o.inicio && horaActual < o.horaMin);
          const actual = enClase || enBuffer;
          const proxima = !actual && ocupHoy.find((o) => o.inicio > horaActual);
          const proximaPronto = proxima && (proxima.inicio - horaActual) <= 30;
          const libre = !actual;
          const color = actual ? colorFormacion(actual.codigo) : null;

          const estadoTxt = actual ? 'OCUPADA' : proximaPronto ? 'PRÓXIMA' : 'LIBRE';
          const estadoCls = actual
            ? 'bg-dangerText/20 text-dangerText'
            : proximaPronto
              ? 'bg-warningText/20 text-warningText'
              : 'bg-successText/20 text-successText';

          return (
            <div
              key={sala}
              onClick={() => actual && onClick && onClick(actual)}
              className={`rounded-lg border-l-[3px] ${color ? color.border : 'border-border'} border-t border-r border-b border-border/70 bg-surface2 px-3 py-2 ${actual && onClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-xs truncate">{sala}</span>
                <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${estadoCls}`}>{estadoTxt}</span>
              </div>
              {actual ? (
                <>
                  <div className={`text-[12px] font-medium mt-0.5 truncate ${color.text}`}>{actual.label}</div>
                  <div className="text-[12px] text-textMuted">
                    {minutosAHora(actual.horaMin)}–{minutosAHora(actual.fin)} · {enBuffer ? 'preparación' : 'en curso'}
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-textSec mt-0.5 truncate">
                  {proxima ? `Próxima: ${minutosAHora(proxima.horaMin)} · ${proxima.label}` : 'Sin clases el resto del día'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TIPOS = ['Formación', 'BLOG', 'Masterclass', 'Reuniones', 'Capacitación', 'Jornada', 'Clases de apoyo', 'Auditorio', 'Caja de ideas', 'Encuentro Potencia', 'Laboratorio C.O', 'Clase especial', 'Equipo docente', 'Otro'];
// "Período docente C.O." no es una actividad con fecha puntual — es la asignación de un
// docente/staff a una edición durante varias semanas (lo que antes se cargaba en Docentes
// C.O → "Nuevo período"). Se agrega acá para tener un solo lugar de carga, pero solo lo ve
// quien realmente puede tocar esos datos (ver tienePermisoEditarDocentesCO).
const TIPO_PERIODO_DOCENTE = 'Período docente C.O.';
const CUATRIMESTRES_CO = [
  { id: '1', label: '1er cuatrimestre (clases 1-16)' },
  { id: '2', label: '2do cuatrimestre (clases 17-32)' },
  { id: '3', label: '3er cuatrimestre (clases 33-48)' }
];
const CURSOS_MATERIA = [
  ['CO', 'Coaching Ontológico'], ['CE', 'Coaching Educativo'], ['CEQUI', 'Coaching de Equipos'],
  ['CDEP', 'Coaching Deportivo'], ['CV', 'Coaching Vocacional'], ['OR', 'Oratoria'], ['IE', 'Inteligencia Emocional'],
  ['OTRO_Copywriting', 'Copywriting para redes sociales'], ['OTRO_Mindfulness', 'Mindfulness'],
  ['OTRO_Formador', 'Formador para formadores'], ['OTRO_PNL', 'PNL'], ['', '— Ninguno / no aplica —']
];

// El campo "Horario" de Docentes C.O. es texto libre cargado a mano (ej: "19.00 a 21.00
// horas", "19:00 a 21:00hs") — para precargar la hora del formulario de acá abajo se intenta
// leer el primer número que aparece, tolerando "." o ":" como separador de minutos. Si no
// se puede interpretar, no rompe nada: el campo queda con su valor por defecto (18:00).
function horaDesdeTextoHorario(horario) {
  if (!horario) return null;
  const m = String(horario).match(/(\d{1,2})[.:hH](\d{2})/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  // Los horarios del formulario van en pasos de 30' (08:00, 08:30, …) — se redondea al más
  // cercano para que la hora parseada siempre matchee una opción real del selector.
  let totalMin = hh * 60 + mm;
  totalMin = Math.round(totalMin / 30) * 30;
  const hFinal = Math.floor(totalMin / 60);
  const mFinal = totalMin % 60;
  return `${String(hFinal).padStart(2, '0')}:${String(mFinal).padStart(2, '0')}`;
}

function PanelReservar({ fetchAutenticado, onReservado, usuario, prefill }) {
  const puedeEditarDocentesCO = tienePermisoEditarDocentesCO(usuario);
  // Sofía, Paula y SuperAdmin además ven la opción para cargar un período de Docentes C.O
  // desde acá — el resto del equipo con acceso a Salas Zoom no la ve, porque no tiene
  // permiso para tocar esos datos igual (evita que elijan la opción y se encuentren con
  // un error al guardar).
  const tiposDisponibles = puedeEditarDocentesCO ? [...TIPOS, TIPO_PERIODO_DOCENTE] : TIPOS;

  const [tipo, setTipo] = useState('Formación');
  const [fecha, setFecha] = useState('');
  const [horaTxt, setHoraTxt] = useState('18:00');
  const [codigo, setCodigo] = useState('CO');
  const [edicion, setEdicion] = useState('1');
  const [numero, setNumero] = useState('1');
  const [cantidad, setCantidad] = useState(TOTALES.CO || 1);
  const [docente, setDocente] = useState('');
  const [staff, setStaff] = useState('');
  // Docente/staff por cuatrimestre, solo para crear una edición completa de C.O. (48 clases
  // desde la 1) — si es el mismo en los 3, se sigue usando el Docente/Staff de siempre.
  const [mismoDocenteCuatrimestres, setMismoDocenteCuatrimestres] = useState(true);
  const [cuatrimestreDocentes, setCuatrimestreDocentes] = useState([
    { docente: '', staff: '' }, { docente: '', staff: '' }, { docente: '', staff: '' }
  ]);
  function setCuatDocente(i, campo, valor) {
    setCuatrimestreDocentes((arr) => arr.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  }
  const esEdicionNuevaCO = tipo === 'Formación' && codigo === 'CO' && numero.trim() === '1';
  // Vista previa (estimada) de los 3 rangos de fechas de cuatrimestre, en base a la fecha de
  // la 1ª clase ya cargada más abajo — para que Diego vea de entrada cuándo arranca/termina
  // cada bloque sin tener que calcularlo a mano. No descuenta feriados (ver comentario en
  // calcularRangosCuatrimestresCO).
  const rangosCuatrimestres = useMemo(
    () => (esEdicionNuevaCO ? calcularRangosCuatrimestresCO(fecha) : null),
    [esEdicionNuevaCO, fecha]
  );
  const [tematica, setTematica] = useState('');
  const [obs, setObs] = useState('');
  // Campos propios de Masterclass (van a Info. técnica, no al cronograma general)
  const [nombreActividad, setNombreActividad] = useState('');
  const [horarioLibre, setHorarioLibre] = useState('');
  const [formularioInscripcion, setFormularioInscripcion] = useState('');
  const [linkAcceso, setLinkAcceso] = useState('');
  const [moderador, setModerador] = useState('');
  // Campos propios de Período docente C.O. (van a Docentes C.O, no al cronograma general)
  const [diaPeriodo, setDiaPeriodo] = useState('');
  const [desdePeriodo, setDesdePeriodo] = useState('');
  const [hastaPeriodo, setHastaPeriodo] = useState('');
  const [salaPeriodo, setSalaPeriodo] = useState('');
  const [cuatrimestrePeriodo, setCuatrimestrePeriodo] = useState('');

  // Al venir del link "Cargar actividad →" de una alerta de Inicio, precarga acá el
  // formulario con lo que ya se sabe de esa edición (curso, edición, fecha de inicio del
  // período vigente, docente/staff) — Diego solo tiene que revisar y elegir sala/horario.
  // Se aplica una sola vez (guardado en `prefillAplicado`) para no pisar cambios que el
  // usuario haga a mano después si el componente se vuelve a renderizar.
  const [prefillAplicado, setPrefillAplicado] = useState(false);
  useEffect(() => {
    if (!prefill || prefillAplicado) return;
    setPrefillAplicado(true);
    setTipo('Formación');
    setCodigo(prefill.curso);
    setEdicion(prefill.edicion || '');
    setNumero('1'); // primera clase de la edición — dispara el flujo de edición completa para C.O.
    setCantidad(TOTALES[prefill.curso] || 1);
    if (prefill.fecha) setFecha(prefill.fecha);
    if (prefill.docente) setDocente(prefill.docente);
    if (prefill.staff) setStaff(prefill.staff);
    const horaDetectada = horaDesdeTextoHorario(prefill.horario);
    if (horaDetectada) setHoraTxt(horaDetectada);
  }, [prefill, prefillAplicado]);

  // Vuelca lo que detectó la Lectura Inteligente en los campos normales del formulario —
  // el operador siempre puede revisar/corregir antes de guardar, nunca se guarda solo.
  function aplicarLectura(r) {
    if (r.curso) {
      setTipo('Formación');
      setCodigo(r.curso.codigo);
      setCantidad(r.cantidad || TOTALES[r.curso.codigo] || 1);
    } else if (r.cantidad) {
      setCantidad(r.cantidad);
    }
    if (r.edicion) setEdicion(r.edicion);
    if (r.horaTxt) setHoraTxt(r.horaTxt);
    if (r.fechaSugerida) setFecha(r.fechaSugerida);
    if (r.docente) setDocente(r.docente);
    if (r.staff) setStaff(r.staff);
  }
  const [salaEspecial, setSalaEspecial] = useState('');
  // Sala que la persona elige de entrada para una Formación (opcional): no se reserva sola —
  // se sigue chequeando contra las salas ya ocupadas — pero permite elegirla en vez de tener
  // que adivinar cuál tocar en la grilla de resultados.
  const [salaPreferida, setSalaPreferida] = useState('');
  const [resultado, setResultado] = useState(null);
  const [msg, setMsg] = useState(null);

  // Si el docente/staff cambia entre cuatrimestres, se manda el detalle de los 3; si es el
  // mismo, no hace falta — el servidor usa el Docente/Staff único para los 3 igual.
  function datosCuatrimestresCO() {
    if (!esEdicionNuevaCO || mismoDocenteCuatrimestres) return {};
    return { cuatrimestres: cuatrimestreDocentes };
  }
  function errorCuatrimestresCO() {
    if (!esEdicionNuevaCO || mismoDocenteCuatrimestres) return null;
    const falta = cuatrimestreDocentes.findIndex((c) => !c.docente.trim());
    if (falta !== -1) return `Falta el docente del ${CUATRIMESTRES_CO[falta].label}.`;
    return null;
  }
  function reiniciarCamposCuatrimestre() {
    setMismoDocenteCuatrimestres(true);
    setCuatrimestreDocentes([{ docente: '', staff: '' }, { docente: '', staff: '' }, { docente: '', staff: '' }]);
  }

  async function consultar() {
    setMsg(null); setResultado(null);
    if (!fecha) { setMsg({ tipo: 'error', texto: 'Elegí la fecha.' }); return; }
    const errorCuat = errorCuatrimestresCO();
    if (errorCuat) { setMsg({ tipo: 'error', texto: errorCuat }); return; }
    try {
      const res = await fetchAutenticado('/api/clases/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaTxt, codigo, edicion, numero, cantidad })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setResultado(data);
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  async function reservarEn(sala) {
    const errorCuat = errorCuatrimestresCO();
    if (errorCuat) { setMsg({ tipo: 'error', texto: errorCuat }); return; }
    try {
      const res = await fetchAutenticado('/api/clases/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaTxt, codigo, edicion, numero, cantidad, sala, docente, staff, tematica, observaciones: obs, ...datosCuatrimestresCO() })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({
        tipo: data.periodosOmitidosPorChoque?.length ? 'aviso' : 'ok',
        texto: `Reservado en ${sala} (${data.agregadas} clase(s)).${data.corridas?.length ? ' Se corrieron por feriado: ' + data.corridas.join('; ') : ''}`
          + (data.periodosOmitidosPorChoque?.length ? ` ⚠️ No se generó el período de Docentes C.O. para: ${data.periodosOmitidosPorChoque.join('; ')} — ya había uno cargado, revisalo en Docentes C.O.` : '')
      });
      setResultado(null); setDocente(''); setStaff(''); setTematica(''); setObs(''); setSalaPreferida(''); reiniciarCamposCuatrimestre();
      onReservado();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  // Guardar la clase sin elegir sala todavía — no pierde el lugar en el cronograma (docente,
  // horario, edición quedan cargados) y aparece en Inicio → "Pendientes de asignar sala" para
  // que alguien con permiso le complete la sala más tarde.
  async function reservarSinSala() {
    const errorCuat = errorCuatrimestresCO();
    if (errorCuat) { setMsg({ tipo: 'error', texto: errorCuat }); return; }
    try {
      const res = await fetchAutenticado('/api/clases/reservar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, horaTxt, codigo, edicion, numero, cantidad, sinSala: true, docente, staff, tematica, observaciones: obs, ...datosCuatrimestresCO() })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({
        tipo: 'aviso',
        texto: `Guardado sin sala (${data.agregadas} clase(s)) — quedó pendiente de asignar en Inicio.${data.corridas?.length ? ' Se corrieron por feriado: ' + data.corridas.join('; ') : ''}`
          + (data.periodosOmitidosPorChoque?.length ? ` ⚠️ No se generó el período de Docentes C.O. para: ${data.periodosOmitidosPorChoque.join('; ')} — ya había uno cargado, revisalo en Docentes C.O.` : '')
      });
      setResultado(null); setDocente(''); setStaff(''); setTematica(''); setObs(''); setSalaPreferida(''); reiniciarCamposCuatrimestre();
      onReservado();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  async function agregarActividadNoFormacion() {
    setMsg(null);
    if (!fecha || !horaTxt) { setMsg({ tipo: 'error', texto: 'Elegí fecha y hora.' }); return; }
    try {
      const res = await fetchAutenticado('/api/actividades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, tipo, curso: codigo, edicion, horaTxt, docente, tematica, observaciones: obs, sala: salaEspecial })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({
        tipo: data.avisoDocente ? 'aviso' : 'ok',
        texto: data.avisoDocente ? `"${tipo}" agregado. ⚠️ ${data.avisoDocente}` : `"${tipo}" agregado al cronograma.`
      });
      setTematica(''); setObs(''); setSalaEspecial('');
      onReservado();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  // Masterclass (y formatos similares de Info. técnica): esto no se agrega al cronograma
  // general — se guarda como registro de Info. técnica, igual que "Nuevo registro" hacía
  // antes desde esa pantalla.
  async function agregarMasterclass() {
    setMsg(null);
    if (!nombreActividad.trim()) { setMsg({ tipo: 'error', texto: 'Escribí el nombre de la actividad.' }); return; }
    if (!fecha) { setMsg({ tipo: 'error', texto: 'Elegí la fecha.' }); return; }
    try {
      const mesTxt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'long' });
      const res = await fetchAutenticado('/api/info-tecnica', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreActividad, formato: tipo, mes: mesTxt, fecha, disertante: docente, horario: horarioLibre,
          formularioInscripcion, salaZoom: salaEspecial, linkAcceso, moderador
        })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: `"${nombreActividad}" agregado a Info. técnica.` });
      setNombreActividad(''); setDocente(''); setHorarioLibre(''); setFormularioInscripcion('');
      setLinkAcceso(''); setModerador(''); setSalaEspecial(''); setObs('');
      onReservado();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  // Período docente C.O.: tampoco es una actividad del cronograma — es una asignación de
  // Docentes C.O, igual que "Nuevo período" hacía antes desde esa pantalla.
  async function agregarPeriodoDocente() {
    setMsg(null);
    if (!edicion.trim()) { setMsg({ tipo: 'error', texto: 'Elegí la edición.' }); return; }
    try {
      const res = await fetchAutenticado('/api/docentes-co', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edicion: edicion.trim(), dia: diaPeriodo, horario: horarioLibre, desde: desdePeriodo, hasta: hastaPeriodo,
          docente, staff, sala: salaPeriodo, cuatrimestre: cuatrimestrePeriodo, observaciones: obs
        })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: `Período de Edición ${edicion} guardado en Docentes C.O.` });
      setDocente(''); setStaff(''); setObs(''); setDesdePeriodo(''); setHastaPeriodo(''); setDiaPeriodo(''); setHorarioLibre('');
      setSalaPeriodo(''); setCuatrimestrePeriodo('');
      onReservado();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    }
  }

  const esFormacion = tipo === 'Formación';
  const esMasterclass = tipo === 'Masterclass';
  const esPeriodoDocente = tipo === TIPO_PERIODO_DOCENTE;

  return (
    <div className={panelCls}>
      {/* Pedido de Diego (2ª vuelta): un solo título para toda la pantalla, sin repetirlo —
          ver el h1 condicional en SalasZoomPageInterna más arriba en este archivo. */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-accentPurple to-accentMagenta flex items-center justify-center text-white text-xs shrink-0">📅</span>
        <h2 className="text-[15px] font-semibold">Agregar al cronograma</h2>
      </div>
      <p className="text-[12px] text-textSec mb-2.5 sm:ml-[30px] sm:-mt-0.5">
        Cargá una clase, formación o actividad.
      </p>

      {prefillAplicado && (
        <p className="text-xs bg-infoBg text-infoText border border-infoText/40 rounded-lg px-3 py-2 mb-2.5">
          ✓ Precargado desde la alerta de Inicio — revisá los datos y elegí sala/horario antes de guardar.
        </p>
      )}

      <LecturaInteligente onAplicar={aplicarLectura} />

      <div className={seccionDivCls}>
        <p className={seccionTituloCls}>Tipo de evento</p>
        <select value={tipo} onChange={(e) => { setTipo(e.target.value); setResultado(null); setMsg(null); }} className={`${campoCls} max-w-sm`}>
          {tiposDisponibles.map((t) => <option key={t} value={t}>{t === 'Formación' ? 'Formación / Curso' : t}</option>)}
        </select>
      </div>

      {esPeriodoDocente ? (
        <>
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Edición y horario</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Edición (ej: 45)</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Día</label><input value={diaPeriodo} onChange={(e) => setDiaPeriodo(e.target.value)} placeholder="Martes" className={campoCls} /></div>
              <div><label className={campoLabelCls}>Horario</label><input value={horarioLibre} onChange={(e) => setHorarioLibre(e.target.value)} placeholder="19:00 a 21:00" className={campoCls} /></div>
              <div><label className={campoLabelCls}>Desde</label><input type="date" value={desdePeriodo} onChange={(e) => setDesdePeriodo(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Hasta</label><input type="date" value={hastaPeriodo} onChange={(e) => setHastaPeriodo(e.target.value)} className={campoCls} /></div>
            </div>
          </div>
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Docente, staff y sala</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Staff</label><input value={staff} onChange={(e) => setStaff(e.target.value)} className={campoCls} /></div>
              <div>
                <label className={campoLabelCls}>Sala</label>
                <select value={salaPeriodo} onChange={(e) => setSalaPeriodo(e.target.value)} className={campoCls}>
                  <option value="">Sin definir</option>
                  {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={campoLabelCls}>Cuatrimestre</label>
                <select value={cuatrimestrePeriodo} onChange={(e) => setCuatrimestrePeriodo(e.target.value)} className={campoCls}>
                  <option value="">Sin definir</option>
                  {CUATRIMESTRES_CO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-2.5"><label className={campoLabelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={campoCls} /></div>
          </div>
        </>
      ) : esMasterclass ? (
        <>
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Actividad y horario</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px,100%),1fr))' }}>
              <div className="sm:col-span-2"><label className={campoLabelCls}>Nombre</label><input value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} placeholder="ej: Efecto Florida" className={campoCls} /></div>
              <div><label className={campoLabelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Horario</label><input value={horarioLibre} onChange={(e) => setHorarioLibre(e.target.value)} placeholder="20:00 a 21:15" className={campoCls} /></div>
            </div>
          </div>
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Disertante, sala y moderación</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Disertante</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Sala de Zoom</label>
                <select value={salaEspecial} onChange={(e) => setSalaEspecial(e.target.value)} className={campoCls}>
                  <option value="">Sin sala asignada</option>
                  {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className={campoLabelCls}>Moderador</label><input value={moderador} onChange={(e) => setModerador(e.target.value)} className={campoCls} /></div>
            </div>
          </div>
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Inscripción y acceso</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Formulario de inscripción</label><input value={formularioInscripcion} onChange={(e) => setFormularioInscripcion(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Link de acceso (Zoom)</label><input value={linkAcceso} onChange={(e) => setLinkAcceso(e.target.value)} className={campoCls} /></div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 1. Datos del evento */}
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Datos del evento</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={campoCls} /></div>
              <div><label className={campoLabelCls}>Hora</label>
                <select value={horaTxt} onChange={(e) => setHoraTxt(e.target.value)} className={campoCls}>
                  {HORAS_OPCIONES.map((h) => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div><label className={campoLabelCls}>{esFormacion ? 'Curso' : 'Curso/Materia'}</label>
                {esFormacion ? (
                  <select
                    value={codigo}
                    onChange={(e) => { setCodigo(e.target.value); setCantidad(TOTALES[e.target.value] || 1); }}
                    className={campoCls}
                  >
                    {Object.keys(NOMBRES).filter((c) => c !== 'O').map((c) => <option key={c} value={c}>{ICONOS[c]} {NOMBRES[c]}</option>)}
                  </select>
                ) : (
                  <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className={campoCls}>
                    {CURSOS_MATERIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* 2. Datos de la clase */}
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Datos de la clase</p>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px,100%),1fr))' }}>
              <div><label className={campoLabelCls}>Edición{esFormacion ? ' (ej: 51)' : ''}</label><input value={edicion} onChange={(e) => setEdicion(e.target.value)} className={campoCls} /></div>
              {esFormacion && (
                <>
                  <div>
                    <label className={campoLabelCls}>Nº de esta clase</label>
                    <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="1" className={campoCls} />
                  </div>
                  <div>
                    <label className={campoLabelCls}>Cantidad</label>
                    {/* Pedido de Diego: esto es información (el total fijo del curso), no una
                        acción — se ve como un dato calculado, no como un input más. */}
                    <div
                      title="En una Formación la cantidad de clases es fija (el total del curso) — no se puede cargar un número distinto."
                      className="w-full h-9 flex items-center px-2.5 text-sm text-textSec bg-transparent border border-dashed border-border rounded-lg"
                    >
                      {cantidad} <span className="text-[12px] text-textMuted ml-1.5">(fijo)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {esFormacion && (
              <p className={ayudaCls}><span className="shrink-0">ⓘ</span><span>Es el número de clase (1, 2, 3…), no el número de edición.</span></p>
            )}
          </div>

          {/* 3. Equipo docente */}
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Equipo docente</p>
            {esEdicionNuevaCO ? (
              <div>
                <label className={campoLabelCls}>¿Mismo docente y staff en los 3 cuatrimestres?</label>
                <div className={`${segmentadoCls} mb-2.5`}>
                  <button type="button" onClick={() => setMismoDocenteCuatrimestres(true)} className={segmentoCls(mismoDocenteCuatrimestres)}>Sí, el mismo</button>
                  <button type="button" onClick={() => setMismoDocenteCuatrimestres(false)} className={segmentoCls(!mismoDocenteCuatrimestres)}>Cambia por cuatrimestre</button>
                </div>
                {rangosCuatrimestres ? (
                  <div className="grid gap-2 sm:grid-cols-3 mb-2.5">
                    {CUATRIMESTRES_CO.map((c, i) => (
                      <div key={c.id} className="px-2.5 py-2 rounded-lg bg-surface2/60" style={{ borderLeft: `3px solid ${COLORES_CUATRIMESTRE[i]}` }}>
                        <p className="text-[12px] font-semibold text-textMuted uppercase tracking-wide mb-0.5">{c.label.replace(/ \(.*\)/, '')}</p>
                        <p className="text-[12px]">{formatFechaCorta(rangosCuatrimestres[i].desde)} – {formatFechaCorta(rangosCuatrimestres[i].hasta)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={ayudaCls}><span className="shrink-0">ⓘ</span><span>Cargá la fecha de la 1ª clase para ver las fechas estimadas de cada cuatrimestre.</span></p>
                )}
                {/* Progressive disclosure: los campos por cuatrimestre solo aparecen si NO es
                    el mismo docente/staff en los 3 — pedido de Diego, para no mostrar ruido
                    quien no lo necesita. */}
                {mismoDocenteCuatrimestres ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div><label className={campoLabelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={campoCls} /></div>
                    <div><label className={campoLabelCls}>Staff (opcional)</label><input value={staff} onChange={(e) => setStaff(e.target.value)} className={campoCls} /></div>
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {CUATRIMESTRES_CO.map((c, i) => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-surface2/60" style={{ borderLeft: `3px solid ${COLORES_CUATRIMESTRE[i]}` }}>
                        <p className="text-[12px] font-semibold mb-1.5 leading-tight">{c.label}</p>
                        <input placeholder="Docente" value={cuatrimestreDocentes[i].docente} onChange={(e) => setCuatDocente(i, 'docente', e.target.value)} className={`${campoCls} mb-1.5`} />
                        <input placeholder="Staff (opcional)" value={cuatrimestreDocentes[i].staff} onChange={(e) => setCuatDocente(i, 'staff', e.target.value)} className={campoCls} />
                      </div>
                    ))}
                  </div>
                )}
                <p className={ayudaCls}><span className="shrink-0">ⓘ</span><span>Se guardan los 3 períodos (1°, 2° y 3° cuatrimestre) en Docentes C.O. automáticamente al reservar.</span></p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 max-w-xl">
                <div><label className={campoLabelCls}>Docente</label><input value={docente} onChange={(e) => setDocente(e.target.value)} className={campoCls} /></div>
                {esFormacion && (
                  <div><label className={campoLabelCls}>Staff (opcional)</label><input value={staff} onChange={(e) => setStaff(e.target.value)} className={campoCls} /></div>
                )}
              </div>
            )}
          </div>

          {/* 4. Sala */}
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Sala</p>
            {esFormacion ? (
              <div className="max-w-xs">
                <label className={campoLabelCls}>Sala de Zoom preferida (opcional)</label>
                <select value={salaPreferida} onChange={(e) => setSalaPreferida(e.target.value)} className={campoCls}>
                  <option value="">Automática</option>
                  {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className={ayudaCls}><span className="shrink-0">ⓘ</span><span>Si elegís una, te la marcamos abajo si está libre en ese horario; si no, buscamos la primera disponible.</span></p>
              </div>
            ) : (
              <div className="max-w-xs">
                <label className={campoLabelCls}>Sala de Zoom (opcional)</label>
                <select value={salaEspecial} onChange={(e) => setSalaEspecial(e.target.value)} className={campoCls}>
                  <option value="">Sin sala asignada</option>
                  {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* 5. Información adicional */}
          <div className={seccionDivCls}>
            <p className={seccionTituloCls}>Información adicional</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {!esFormacion && (
                <div><label className={campoLabelCls}>Temática</label><input value={tematica} onChange={(e) => setTematica(e.target.value)} className={campoCls} /></div>
              )}
              <div className={!esFormacion ? '' : 'sm:col-span-2'}><label className={campoLabelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={campoCls} /></div>
            </div>
          </div>
        </>
      )}

      {/* Pedido de Diego: que la acción principal no quede "perdida" al final de todo —
          la línea divisoria + el padding la separan como un paso propio, el siguiente
          después de completar fecha/hora/sala, en vez de una fila más del formulario. */}
      <div className="flex items-center justify-end gap-3 flex-wrap pt-3 mt-1 border-t border-border/40">
        {msg && <p className={`text-xs flex-1 min-w-[200px] ${msg.tipo === 'error' ? 'text-dangerText' : msg.tipo === 'aviso' ? 'text-warningText' : 'text-successText'}`}>{msg.texto}</p>}
        {esFormacion ? (
          <button className={btnPrimaryCls} onClick={consultar}><span aria-hidden>🔎</span> Buscar disponibilidad</button>
        ) : esMasterclass ? (
          <button className={btnPrimaryCls} onClick={agregarMasterclass}><span aria-hidden>+</span> Agregar a Info. técnica</button>
        ) : esPeriodoDocente ? (
          <button className={btnPrimaryCls} onClick={agregarPeriodoDocente}><span aria-hidden>+</span> Guardar período</button>
        ) : (
          <button className={btnPrimaryCls} onClick={agregarActividadNoFormacion}><span aria-hidden>📅</span> Agregar al cronograma</button>
        )}
      </div>

      {resultado && (
        <div className="mt-3.5">
          {resultado.conflictoDocente && (
            <div className="px-3.5 py-2.5 rounded-lg mb-3 font-semibold text-sm bg-warningBg text-warningText">
              ⚠️ {resultado.conflictoDocente}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className={`px-3.5 py-2.5 rounded-lg font-semibold text-sm ${resultado.libres.length ? 'bg-successBg text-successText' : 'bg-dangerBg text-dangerText'}`}>
              {resultado.libres.length ? `Sí hay lugar — ${resultado.libres.length} sala(s) libre(s)` : 'No hay lugar — las 8 salas están ocupadas'}
            </div>
            <button className={btnSecCls} onClick={reservarSinSala} title="Reserva el horario y la edición sin sala todavía — queda pendiente de asignar en Inicio.">
              Guardar sin sala (queda pendiente)
            </button>
          </div>
          {salaPreferida && (
            resultado.ocupadas.find((o) => o.sala === salaPreferida) ? (
              <div className="px-3.5 py-2.5 rounded-lg mb-3 text-sm bg-warningBg text-warningText">
                ⚠️ La sala que elegiste ({salaPreferida}) está ocupada en ese horario — elegí otra de las libres abajo.
              </div>
            ) : (
              <div className="px-3.5 py-2.5 rounded-lg mb-3 text-sm bg-successBg text-successText">
                ✓ {salaPreferida} está libre en ese horario — marcada abajo.
              </div>
            )
          )}
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px,100%),1fr))' }}>
            {SALAS.map((s) => {
              const ocupada = resultado.ocupadas.find((o) => o.sala === s);
              const esPreferida = salaPreferida === s;
              return (
                <div key={s} className={`bg-bg border rounded-lg p-3 ${ocupada ? 'opacity-70 border-border' : esPreferida ? 'border-accentPurple ring-1 ring-accentPurple' : 'border-border'}`}>
                  <div className="font-semibold text-sm flex items-center gap-1.5">● {s}
                    {esPreferida && <span className="text-[12px] font-medium px-1.5 py-0.5 rounded-full bg-accentPurple text-white">Tu elección</span>}
                  </div>
                  <div className="text-[12px] text-textSec mb-2">
                    {ocupada ? `Ocupada por ${ocupada.label} (libera ${minutosAHora(ocupada.libera)})` : 'Libre en ese horario'}
                  </div>
                  <button disabled={!!ocupada} className={`${btnCls} w-full`} onClick={() => reservarEn(s)}>
                    {ocupada ? 'Ocupada' : 'Reservar acá'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

const MOTIVOS = [
  { id: 'salud', label: '🩺 Problemas de salud del docente' },
  { id: 'conectividad', label: '🌐 Problemas de conectividad' },
  { id: 'ausencia', label: '🎓 Ausencia de estudiantes' },
  { id: 'evento', label: '🏟️ Evento institucional' },
  { id: 'feriado_extra', label: '📅 Feriado extraordinario' },
  { id: 'otro', label: '✏️ Otro' }
];

function LecturaInteligente({ onAplicar }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cursoElegidoIdx, setCursoElegidoIdx] = useState(0);
  const [aplicado, setAplicado] = useState(false);

  // Se interpreta solo, medio segundo después de que la persona deja de tipear/pegar — sin
  // botón "Interpretar" de por medio, que era un paso extra que no aportaba nada.
  useEffect(() => {
    if (!texto.trim()) { setResultado(null); return; }
    const id = setTimeout(() => {
      setResultado(interpretarTexto(texto));
      setCursoElegidoIdx(0);
      setAplicado(false);
    }, 500);
    return () => clearTimeout(id);
  }, [texto]);

  function aplicar() {
    const curso = resultado.candidatosCurso?.[cursoElegidoIdx] || resultado.curso;
    onAplicar({ ...resultado, curso });
    setAplicado(true);
  }

  // Se aplica solo al formulario de abajo apenas hay algo detectado (o cuando se cambia la
  // coincidencia elegida en "Encontré varias coincidencias") — antes había que acordarse de
  // apretar "Aplicar al formulario" para que se reflejara. El botón queda como forma manual
  // de volver a aplicar (por ej. después de tocar algo abajo a mano).
  useEffect(() => {
    if (!resultado) return;
    if (!(resultado.curso || resultado.edicion || resultado.cantidad || resultado.horaTxt || resultado.diaDetectado || resultado.docente || resultado.staff)) return;
    aplicar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, cursoElegidoIdx]);

  function limpiar() {
    setTexto(''); setResultado(null); setAplicado(false);
  }
  // Acción manual (pedido de Diego, 2ª vuelta): además de interpretar solo medio segundo
  // después de dejar de tipear, se puede forzar ya mismo — por ej. recién pegado el texto,
  // sin esperar. No duplica lógica: llama a la misma interpretarTexto() de siempre.
  function interpretarAhora() {
    if (!texto.trim()) return;
    setResultado(interpretarTexto(texto));
    setCursoElegidoIdx(0);
    setAplicado(false);
  }

  const cursoFinal = resultado?.candidatosCurso?.[cursoElegidoIdx] || null;
  const hayAlgoDetectado = resultado && (resultado.curso || resultado.edicion || resultado.cantidad || resultado.horaTxt || resultado.diaDetectado || resultado.docente || resultado.staff);

  return (
    <div className="bg-surface2 border border-border rounded-xl p-3 mb-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-accentPurple text-sm">✨</span>
        <span className="text-[13px] font-semibold">Lectura inteligente</span>
        <span className="text-[12px] text-textMuted font-normal">— pegá el texto y completamos automáticamente los campos</span>
      </div>

      <div className="relative mb-2">
        <textarea
          value={texto} onChange={(e) => setTexto(e.target.value)} rows={2}
          placeholder={'Ej: coaching ontologico 22 viernes 18 hs 48 alumnos profe Diego'}
          style={{ height: '58px', resize: 'none' }}
          className="w-full bg-bg border border-border rounded-lg pl-2.5 pr-20 py-1.5 text-sm"
        />
        {texto.trim() && (
          <button
            type="button" onClick={interpretarAhora}
            className="absolute right-1.5 bottom-1.5 text-[12px] font-semibold text-accentPurple hover:underline px-1.5 py-1"
          >
            Interpretar →
          </button>
        )}
      </div>

      {texto.trim() && !resultado && (
        <p className="text-textMuted text-xs mb-1">Analizando…</p>
      )}

      {resultado && !hayAlgoDetectado && (
        <p className="text-xs text-textMuted">No pude identificar nada en ese texto — completá el formulario a mano.</p>
      )}

      {resultado && hayAlgoDetectado && (
        <div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {cursoFinal ? (
              <ChipDetectado ok={cursoFinal.exacta} texto={`Curso: ${cursoFinal.nombre}`} />
            ) : (
              <ChipDetectado ok={false} vacio texto="Curso: no identificado" />
            )}
            {resultado.edicion && <ChipDetectado ok texto={`Edición: ${resultado.edicion}`} />}
            {resultado.cantidad != null && <ChipDetectado ok texto={`Cantidad: ${resultado.cantidad}`} />}
            {resultado.horaTxt && <ChipDetectado ok texto={`Hora: ${resultado.horaTxt}`} />}
            {resultado.diaDetectado && (
              <ChipDetectado ok={false} texto={`Día: ${resultado.diaDetectado} (fecha sugerida ${formatFechaCorta(resultado.fechaSugerida)}, revisá)`} />
            )}
            {resultado.docente && <ChipDetectado ok texto={`Docente: ${resultado.docente}`} />}
            {resultado.staff && <ChipDetectado ok texto={`Staff: ${resultado.staff}`} />}
          </div>

          {resultado.candidatosCurso && resultado.candidatosCurso.length > 1 && (
            <div className="mb-3">
              <label className={labelCls}>Encontré varias coincidencias — elegí la correcta</label>
              <select value={cursoElegidoIdx} onChange={(e) => setCursoElegidoIdx(parseInt(e.target.value, 10))} className={`${inputCls} max-w-xs`}>
                {resultado.candidatosCurso.map((c, i) => <option key={c.codigo} value={i}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button className={btnCls} onClick={aplicar}>Aplicar al formulario</button>
            <button className={btnSecCls} onClick={limpiar}>Limpiar</button>
            {aplicado && <span className="text-xs text-successText">✓ Aplicado — revisá los campos de abajo antes de guardar.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function ChipDetectado({ ok, vacio, texto }) {
  if (vacio) return <span className="text-xs px-2.5 py-1 rounded-full bg-surface2 text-textMuted border border-border">— {texto}</span>;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${ok ? 'bg-successBg text-successText border-successText/30' : 'bg-warningBg text-warningText border-warningText/30'}`}>
      {ok ? '✓' : '⚠'} {texto}
    </span>
  );
}

function ModalAccion({ clase, onCerrar, fetchAutenticado, onCambio, puedeEditarCronograma = true, credenciales = [], numeroSesion }) {
  const [paso, setPaso] = useState('menu');
  const credencialSala = credenciales.find((c) => c.sala === clase.sala);
  const [nuevaSala, setNuevaSala] = useState('');
  const [diaCampo, setDiaCampo] = useState(clase.dia);
  const [horaCampo, setHoraCampo] = useState(minutosAHora(clase.horaMin));
  const [motivoId, setMotivoId] = useState('salud');
  const [obs, setObs] = useState('');
  const [docenteCampo, setDocenteCampo] = useState(clase.docente || '');
  const [staffCampo, setStaffCampo] = useState(clase.staff || '');
  const [observacionesCampo, setObservacionesCampo] = useState(clase.observaciones || '');
  const [err, setErr] = useState('');

  async function editarCampos() {
    setErr('');
    try {
      const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docente: docenteCampo, staff: staffCampo, observaciones: observacionesCampo })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (err) {
      setErr('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    }
  }

  async function cambiarSala() {
    setErr('');
    try {
      const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevaSala })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (err) {
      setErr('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    }
  }
  async function cambiarDiaHora() {
    setErr('');
    try {
      const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevoDia: diaCampo, nuevaHoraMin: horaAMinutos(horaCampo) })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (err) {
      setErr('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    }
  }
  async function cancelar() {
    setErr('');
    try {
      const res = await fetchAutenticado(`/api/clases/${encodeURIComponent(clase.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (err) {
      setErr('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    }
  }
  async function postergar() {
    setErr('');
    try {
      const res = await fetchAutenticado('/api/clases/postergar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: clase.id, motivoId, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (err) {
      setErr('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="mt-0 mb-1 text-base font-semibold">{NOMBRES[clase.codigo] || clase.label}{(clase.numero || clase.edicion) ? ' · Edición ' + (clase.numero || clase.edicion) : ''}</h3>
        <p className="text-textSec text-xs mb-1">
          {clase.dia} {minutosAHora(clase.horaMin)} · {clase.sala}{clase.fecha ? ' · ' + formatFechaCorta(clase.fecha) : ''}
        </p>
        {numeroSesion && TOTALES[clase.codigo] && (
          <p className="text-textMuted text-xs mb-2.5">Clase {numeroSesion} de {TOTALES[clase.codigo]}</p>
        )}

        {paso === 'menu' && credencialSala && (
          <div className="bg-bg border border-border rounded-lg p-3 mb-3.5 text-xs space-y-1">
            <p className="font-semibold text-[12px] text-textSec mb-1">🔑 Datos de acceso a {clase.sala}</p>
            <p><span className="text-textMuted">Usuario:</span> {credencialSala.usuario}</p>
            <p><span className="text-textMuted">Contraseña:</span> <span className="font-mono">{credencialSala.contrasena}</span></p>
            {credencialSala.idReunion && <p><span className="text-textMuted">ID de reunión:</span> <span className="font-mono">{credencialSala.idReunion}</span></p>}
          </div>
        )}
        {err && <p className="text-dangerText text-xs mb-2.5">{err}</p>}

        {paso === 'menu' && (
          <div className="flex flex-col gap-2">
            {puedeEditarCronograma && (
              <>
                <button className={`${btnSecCls} text-left`} onClick={() => setPaso('campos')}>✏️ Editar docente / temática / observaciones</button>
                <button className={`${btnSecCls} text-left`} onClick={() => setPaso('sala')}>🔁 Cambiar sala</button>
                <button className={`${btnSecCls} text-left`} onClick={() => setPaso('diahora')}>📅 Cambiar día / horario</button>
                <button className={`${btnSecCls} text-left disabled:opacity-40`} disabled={!clase.fecha} onClick={() => setPaso('postergar')}>
                  ⏰ Postergar clase{!clase.fecha ? ' (necesita fecha)' : ''}
                </button>
                <button className={`${btnSecCls} text-left text-dangerText`} onClick={() => setPaso('cancelar')}>🗑️ Cancelar clase</button>
              </>
            )}
            <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
          </div>
        )}

        {paso === 'campos' && (
          <div>
            <label className={labelCls}>Docente</label>
            <input value={docenteCampo} onChange={(e) => setDocenteCampo(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Staff</label>
            <input value={staffCampo} onChange={(e) => setStaffCampo(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Observaciones</label>
            <input value={observacionesCampo} onChange={(e) => setObservacionesCampo(e.target.value)} className={`${inputCls} mb-3`} />
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className={btnCls} onClick={editarCampos}>Guardar cambios</button>
            </div>
          </div>
        )}

        {paso === 'sala' && (
          <div>
            <label className={labelCls}>Nueva sala</label>
            <select value={nuevaSala} onChange={(e) => setNuevaSala(e.target.value)} className={`${inputCls} mb-3`}>
              <option value="">Elegí una sala</option>
              {SALAS.filter((s) => s !== clase.sala).map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className={btnCls} disabled={!nuevaSala} onClick={cambiarSala}>Cambiar</button>
            </div>
          </div>
        )}

        {paso === 'diahora' && (
          <div>
            <p className="text-textMuted text-xs mb-2.5">Pensado para corregir una clase recurrente que quedó cargada en el día u horario equivocado (ej. cargada un martes cuando en realidad es un miércoles).</p>
            <label className={labelCls}>Día</label>
            <select value={diaCampo} onChange={(e) => setDiaCampo(e.target.value)} className={`${inputCls} mb-2.5`}>
              {DIAS.map((d) => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
            </select>
            <label className={labelCls}>Horario</label>
            <select value={horaCampo} onChange={(e) => setHoraCampo(e.target.value)} className={`${inputCls} mb-3`}>
              {HORAS_OPCIONES.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button
                className={btnCls}
                disabled={diaCampo === clase.dia && horaAMinutos(horaCampo) === clase.horaMin}
                onClick={cambiarDiaHora}
              >
                Guardar
              </button>
            </div>
          </div>
        )}

        {paso === 'cancelar' && (
          <div>
            <p className="text-sm mb-3">¿Seguro que querés cancelar esta clase? No se puede deshacer.</p>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className="bg-dangerText text-white rounded-lg px-4 py-2 text-sm font-semibold" onClick={cancelar}>Sí, cancelar</button>
            </div>
          </div>
        )}

        {paso === 'postergar' && (
          <div>
            <label className={labelCls}>Motivo</label>
            <select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} className={`${inputCls} mb-2.5`}>
              {MOTIVOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <label className={labelCls}>Observaciones (opcional)</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)} className={`${inputCls} mb-3`} />
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setPaso('menu')}>Volver</button>
              <button className={btnCls} onClick={postergar}>Postergar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
