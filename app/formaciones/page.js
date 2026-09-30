'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { ICONOS, NOMBRES, TOTALES, formatFechaCorta, calcularFormacionesEnriquecidas, colorFormacion, ESTADOS } from '../../lib/salasLogic';
import { tienePermisoEditarCronograma } from '../../lib/permisos';

const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

const DIAS_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const _normDia = (d) => (d || '').toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
// La clase de hoy todavía no terminó (aún no llegó, o está ocurriendo) — para no contarla como dada.
function claseHoyNoTerminada(f) {
  if (!f.patronDia || f.patronHora == null) return false;
  const ahora = new Date();
  if (_normDia(f.patronDia) !== _normDia(DIAS_SEMANA[ahora.getDay()])) return false;
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  return min < f.patronHora + (f.patronDur || 90);
}
// Una formación está "en vivo" si hoy es su día recurrente y la hora actual cae dentro de la clase.
function formacionEnVivo(f) {
  if (!f.patronDia || f.patronHora == null) return false;
  const ahora = new Date();
  if (_normDia(f.patronDia) !== _normDia(DIAS_SEMANA[ahora.getDay()])) return false;
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  return min >= f.patronHora && min < f.patronHora + (f.patronDur || 90);
}

export default function FormacionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [formacionesManual, setFormacionesManual] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('enCurso');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroCuatrimestre, setFiltroCuatrimestre] = useState('');
  // Pedido de Diego: "TE DIJE SI HAGO CLIC ACA TENGO QUE PODER EDITAR LA INFO" — la tarjeta
  // de una formación abre este modal con sus datos cargados a mano (fecha de inicio, fecha
  // de finalización, estado y meses para certificación), igual que ya se puede corregir la
  // fecha de inicio desde el detalle de una clase en Cronograma.
  const [seleccionada, setSeleccionada] = useState(null);
  const puedeEditar = tienePermisoEditarCronograma(usuario);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const [rc, rf] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/formaciones')]);
      const [dc, df] = await Promise.all([rc.json(), rf.json()]);
      if (rc.ok) setClases(dc.clases); else setError(dc.error);
      if (rf.ok) setFormacionesManual(df.formaciones);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  // Antes esta pantalla armaba a mano la mezcla de fuentes (histórico + fechas confirmadas
  // + pestaña Formaciones del Sheet) — ahora llama a la ÚNICA función compartida en
  // lib/salasLogic.js, la misma que usa Inicio, para que las dos pantallas SIEMPRE digan lo
  // mismo de una edición (pedido de Diego: que esta información viva en un solo lugar).
  const formaciones = useMemo(
    () => calcularFormacionesEnriquecidas(clases, formacionesManual),
    [clases, formacionesManual]
  );

  const filtradas = useMemo(() => {
    let out = formaciones;
    if (filtro === 'enCurso') out = out.filter((f) => f.estado === 'En proceso');
    else if (filtro === 'porFinalizar') out = out.filter((f) => f.estado === 'En proceso' && f.pct != null && f.pct >= 85);
    else if (filtro === 'proximamente') out = out.filter((f) => f.estado === 'Próximamente');
    else if (filtro === 'finalizadas') out = out.filter((f) => f.estado === 'Finalizó');
    if (filtroCurso) out = out.filter((f) => f.codigo === filtroCurso);
    if (filtroCuatrimestre) out = out.filter((f) => f.cuatrimestre === parseInt(filtroCuatrimestre, 10));
    // Orden pedido por Diego: de la más reciente a la más antigua. fechaFinal/fechaInicio
    // ya vienen como texto ISO (YYYY-MM-DD), así que comparan bien como texto. Antes no
    // se ordenaba nada y las tarjetas salían en el orden "crudo" del horario (ej. Coaching
    // Deportivo 11, 12, 13, 1, 2, 3…).
    return [...out].sort((a, b) => {
      const da = a.fechaFinal || a.fechaInicio || '';
      const db = b.fechaFinal || b.fechaInicio || '';
      return db.localeCompare(da);
    });
  }, [formaciones, filtro, filtroCurso, filtroCuatrimestre]);

  const cursosUsados = [...new Set(formaciones.map((f) => f.codigo))].sort();
  const hayCuatrimestres = formaciones.some((f) => f.cuatrimestre != null && f.cuatrimestre > 1) || formaciones.some((f) => f.total === 48);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Formaciones</h1>
      <p className="text-textSec text-sm mb-4">Estado, fechas y progreso de cada edición.</p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <div className="flex flex-wrap gap-1.5 mb-2">
        <button className={chipCls(filtro === 'todas')} onClick={() => setFiltro('todas')}>Todas</button>
        <button className={chipCls(filtro === 'enCurso')} onClick={() => setFiltro('enCurso')}>En curso</button>
        <button className={chipCls(filtro === 'porFinalizar')} onClick={() => setFiltro('porFinalizar')}>Próximas a finalizar</button>
        <button className={chipCls(filtro === 'proximamente')} onClick={() => setFiltro('proximamente')}>Próximamente</button>
        <button className={chipCls(filtro === 'finalizadas')} onClick={() => setFiltro('finalizadas')}>Finalizadas</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        <button className={chipCls(filtroCurso === '')} onClick={() => setFiltroCurso('')}>Todas las formaciones</button>
        {cursosUsados.map((c) => (
          <button key={c} className={chipCls(filtroCurso === c)} onClick={() => setFiltroCurso(c)}>
            {ICONOS[c] || ''} {NOMBRES[c] || c}
          </button>
        ))}
      </div>
      {hayCuatrimestres && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button className={chipCls(filtroCuatrimestre === '')} onClick={() => setFiltroCuatrimestre('')}>Todos los cuatrimestres</button>
          <button className={chipCls(filtroCuatrimestre === '1')} onClick={() => setFiltroCuatrimestre('1')}>1er cuatrimestre</button>
          <button className={chipCls(filtroCuatrimestre === '2')} onClick={() => setFiltroCuatrimestre('2')}>2do cuatrimestre</button>
          <button className={chipCls(filtroCuatrimestre === '3')} onClick={() => setFiltroCuatrimestre('3')}>3er cuatrimestre</button>
        </div>
      )}

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-textSec text-sm">No hay formaciones que coincidan con este filtro.</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))' }}>
          {filtradas.map((f) => {
            // Una edición Finalizada se ve en gris apagado en vez del color propio del curso —
            // antes se veía igual de "viva" que una en curso y solo se distinguía por el
            // pequeño cartel "Finalizada" arriba a la derecha, fácil de pasar por alto.
            const color = f.estado === 'Finalizó'
              ? { dot: 'bg-textMuted', text: 'text-textMuted', bg: 'bg-textMuted/10', border: 'border-textMuted/40' }
              : colorFormacion(f.codigo);
            const estado = f.estado === 'Finalizó' ? ESTADOS.finalizada : f.estado === 'Próximamente' ? ESTADOS.proximamente : ESTADOS.normal;
            const enVivo = formacionEnVivo(f);
            return (
              <div
                key={f.codigo + f.edicion}
                onClick={() => setSeleccionada(f)}
                className={`bg-surface2 border-l-4 ${color.border} border-t border-r border-b border-border rounded-xl p-4 cursor-pointer hover:brightness-110 transition`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />
                    <span className={`font-semibold text-sm truncate ${color.text}`}>{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo} {f.numero}</span>
                  </div>
                  {enVivo
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 en-vivo-badge">🔴 EN VIVO</span>
                    : <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${estado.bg} ${estado.text}`}>{estado.label}</span>}
                </div>

                {f.total === 48 && f.cuatrimestre && (
                  <p className="text-[11px] text-textMuted mb-1.5">{f.cuatrimestre}º cuatrimestre (clases {(f.cuatrimestre - 1) * 16 + 1}-{f.cuatrimestre * 16})</p>
                )}

                {f.pct != null ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-textSec mb-1">
                      <span>Clase {Math.max(0, Math.min(f.cargadas, f.total) - (f.estado !== 'Finalizó' && claseHoyNoTerminada(f) ? 1 : 0))} / {f.total}</span>
                      <span>{f.pct}%</span>
                    </div>
                    {/* Pedido de Diego: que la barra se vea "creciendo" — fina al arrancar la
                        edición, cada vez más gruesa a medida que se completa — en vez de una
                        franja pareja de punta a punta. Se logra con un clip-path en cuña: el
                        propio relleno (ancho = pct%) va de fino en su borde izquierdo a full
                        alto en el derecho, así cuanto más avanzada la edición, más gruesa se ve. */}
                    <div className="w-full h-2.5 bg-bg border border-border rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full ${color.dot}`}
                        style={{ width: f.pct + '%', clipPath: 'polygon(0% 35%, 100% 0%, 100% 100%, 0% 65%)' }}
                      />
                    </div>
                    {f.cargadas > f.total && f.estado !== 'Finalizó' && (
                      <p className="text-[10.5px] text-warningText mb-2">
                        El número de esta edición ({f.cargadas}) supera el total de clases del curso ({f.total}) — probablemente ya arrancó otro ciclo. Progreso aproximado.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-textMuted mb-3">Sin datos de progreso</p>
                )}

                <div className="text-xs text-textSec space-y-0.5">
                  <p>Inicio: {formatFechaCorta(f.fechaInicio)}</p>
                  <p>Finalización: {formatFechaCorta(f.fechaFinal)}</p>
                  {f.vencimientoCertificacion && (
                    <p>Vencimiento certificación: {formatFechaCorta(f.vencimientoCertificacion)} <span className="text-textMuted">({f.mesesCertificacion} {f.mesesCertificacion === 1 ? 'mes' : 'meses'})</span></p>
                  )}
                  <p className="text-text font-medium">Próxima clase: {f.proximaTxt}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {seleccionada && (
        <ModalEditarFormacion
          formacion={seleccionada}
          manual={formacionesManual.find((m) => m.codigo === seleccionada.codigo && String(m.edicion) === String(seleccionada.numero))}
          puedeEditar={puedeEditar}
          fetchAutenticado={fetchAutenticado}
          onCerrar={() => setSeleccionada(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}

function Fila({ label, valor }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-textMuted">{label}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

function ModalEditarFormacion({ formacion: f, manual, puedeEditar, fetchAutenticado, onCerrar, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [fechaInicioE, setFechaInicioE] = useState(manual?.fechaInicio || f.fechaInicio || '');
  const [fechaFinalE, setFechaFinalE] = useState(manual?.fechaFinal || '');
  const [estadoE, setEstadoE] = useState(manual?.estado || '');
  const [mesesE, setMesesE] = useState(manual?.mesesCertificacion != null ? String(manual.mesesCertificacion) : '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function valoresIniciales() {
    setFechaInicioE(manual?.fechaInicio || f.fechaInicio || '');
    setFechaFinalE(manual?.fechaFinal || '');
    setEstadoE(manual?.estado || '');
    setMesesE(manual?.mesesCertificacion != null ? String(manual.mesesCertificacion) : '');
  }

  async function guardar() {
    setGuardando(true); setError('');
    try {
      const r = await fetchAutenticado('/api/formaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: f.codigo,
          edicion: f.numero,
          fechaInicio: fechaInicioE,
          fechaFinal: fechaFinalE,
          estado: estadoE,
          mesesCertificacion: mesesE ? parseInt(mesesE, 10) : ''
        })
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'No se pudo guardar.'); }
      setEditando(false);
      if (onGuardado) await onGuardado();
      onCerrar();
    } catch (e) {
      setError(e.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setEditando(false); setError('');
    valoresIniciales();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96 max-w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo} · Edición {f.numero}</h3>
        <p className="text-textSec text-xs mb-4">{f.pct != null ? `Clase ${Math.min(f.cargadas, f.total)} de ${f.total}` : 'Sin datos de progreso'} · {f.estado}</p>
        <div className="space-y-1.5 text-sm mb-4">
          {editando ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Fecha de inicio</span>
                <input type="date" className="bg-bg border border-border rounded-lg px-2 py-1 text-sm" value={fechaInicioE} onChange={(e) => setFechaInicioE(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Fecha de finalización</span>
                <input type="date" className="bg-bg border border-border rounded-lg px-2 py-1 text-sm" value={fechaFinalE} onChange={(e) => setFechaFinalE(e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Estado</span>
                <select className="bg-bg border border-border rounded-lg px-2 py-1 text-sm" value={estadoE} onChange={(e) => setEstadoE(e.target.value)}>
                  <option value="">Automático</option>
                  <option value="Finalizó">Forzar Finalizada</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-textMuted">Meses para certificación</span>
                <input type="number" min="0" className="bg-bg border border-border rounded-lg px-2 py-1 text-sm w-20" value={mesesE} onChange={(e) => setMesesE(e.target.value)} placeholder="auto" />
              </div>
              <p className="text-[11px] text-textMuted pt-1">Dejar la fecha de finalización o los meses en blanco para que se calculen solos.</p>
            </>
          ) : (
            <>
              <Fila label="Inicio" valor={formatFechaCorta(f.fechaInicio)} />
              <Fila label="Finalización" valor={formatFechaCorta(f.fechaFinal)} />
              {f.vencimientoCertificacion && (
                <Fila label="Vencimiento certificación" valor={`${formatFechaCorta(f.vencimientoCertificacion)} (${f.mesesCertificacion} ${f.mesesCertificacion === 1 ? 'mes' : 'meses'})`} />
              )}
              <Fila label="Próxima clase" valor={f.proximaTxt} />
            </>
          )}
        </div>
        {error && <p className="text-dangerText text-xs mb-3">{error}</p>}
        {puedeEditar ? (
          editando ? (
            <div className="flex gap-2 mb-3">
              <button className={btnCls} onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              <button className={btnSecCls} onClick={cancelar} disabled={guardando}>Cancelar</button>
            </div>
          ) : (
            <button className={`${btnSecCls} mb-3`} onClick={() => setEditando(true)}>✏️ Editar fecha de inicio, finalización, estado o certificación</button>
          )
        ) : null}
        <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
      </div>
    </div>
  );
}
