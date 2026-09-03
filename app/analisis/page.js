'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import {
  SALAS, ICONOS, NOMBRES, BUFFER_MIN, TOTALES,
  agruparParaVista, calcularAlertas, calcularConflictosDetalle, minutosAHora, colorFormacion
} from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;
const selectCls = 'bg-surface2 border border-border rounded-lg px-2.5 py-1.5 text-xs';

const HORAS_DISPONIBLES_SEMANA_POR_SALA = 14.5 * 6; // ~8 a 22:30, 6 días/semana

const PERIODOS = [
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mesAnterior', label: 'Mes anterior' },
  { id: '3meses', label: 'Últimos 3 meses' },
  { id: 'personalizado', label: 'Personalizado' }
];

function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Devuelve [desde, hasta] (ISO) según el período elegido. */
function rangoDePeriodo(periodo, personalDesde, personalHasta) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (periodo === 'semana') {
    const dia = hoy.getDay();
    const diffLunes = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() + diffLunes);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return [toISO(lunes), toISO(domingo)];
  }
  if (periodo === 'mes') {
    return [toISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), toISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))];
  }
  if (periodo === 'mesAnterior') {
    return [toISO(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)), toISO(new Date(hoy.getFullYear(), hoy.getMonth(), 0))];
  }
  if (periodo === '3meses') {
    return [toISO(new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1)), toISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))];
  }
  if (periodo === 'personalizado' && personalDesde && personalHasta) {
    return [personalDesde, personalHasta];
  }
  return [toISO(hoy), toISO(hoy)];
}

export default function AnalisisPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [enviandoResumen, setEnviandoResumen] = useState(false);
  const [msgResumen, setMsgResumen] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [periodo, setPeriodo] = useState('mes');
  const [personalDesde, setPersonalDesde] = useState('');
  const [personalHasta, setPersonalHasta] = useState('');
  const [filtroSala, setFiltroSala] = useState('');
  const [filtroFormacion, setFiltroFormacion] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  const puedeAdmin = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  async function enviarResumenAhora() {
    setEnviandoResumen(true);
    setMsgResumen(null);
    try {
      const res = await fetchAutenticado('/api/cron/resumen-semanal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setMsgResumen({ tipo: 'error', texto: data.error }); return; }
      setMsgResumen({
        tipo: data.enviado ? 'ok' : 'info',
        texto: data.enviado ? `Mail enviado con ${data.cantidad} movimiento(s).` : data.motivo
      });
    } catch (err) {
      setMsgResumen({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setEnviandoResumen(false);
    }
  }

  async function cargarDatos() {
    setCargandoDatos(true);
    setError(null);
    try {
      const [rc, rf, rp, rh] = await Promise.all([
        fetchAutenticado('/api/clases'), fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/postergaciones'), fetchAutenticado('/api/historial')
      ]);
      const [dc, df, dp, dh] = await Promise.all([rc.json(), rf.json(), rp.json(), rh.json()]);
      if (rc.ok) setClases(dc.clases); else setError(dc.error);
      if (rf.ok) setFeriados(df.feriados);
      if (rp.ok) setPostergaciones(dp.postergaciones);
      if (rh.ok) setHistorial(dh.historial);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  const [rangoDesde, rangoHasta] = useMemo(
    () => rangoDePeriodo(periodo, personalDesde, personalHasta),
    [periodo, personalDesde, personalHasta]
  );

  // ---- "Semana actual" filtrada por Sala/Formación/Docente (entidad, no fecha) ----
  // Importante: la mayoría de las clases viven como horario recurrente semanal, sin una
  // fecha puntual por ocurrencia — por eso el patrón de uso de salas, ocupación y
  // horarios críticos reflejan el HORARIO ACTUAL vigente, no un rango de fechas pasado.
  // Los filtros de Sala/Formación/Docente sí se aplican a esta vista.
  const vistaFiltrada = useMemo(() => {
    let vista = agruparParaVista(clases);
    if (filtroSala) vista = vista.filter((c) => c.sala === filtroSala);
    if (filtroFormacion) vista = vista.filter((c) => c.codigo === filtroFormacion);
    if (filtroDocente) vista = vista.filter((c) => (c.docente || '').toLowerCase().includes(filtroDocente.toLowerCase()));
    return vista;
  }, [clases, filtroSala, filtroFormacion, filtroDocente]);

  const codigosUsados = useMemo(() => [...new Set(agruparParaVista(clases).map((c) => c.codigo))].sort(), [clases]);
  const docentesUsados = useMemo(() => [...new Set(agruparParaVista(clases).map((c) => c.docente).filter(Boolean))].sort(), [clases]);

  // ---- Postergaciones filtradas por período real (FechaRegistro) + entidad ----
  const postergacionesFiltradas = useMemo(() => {
    return postergaciones.filter((p) => {
      const fecha = (p.fechaRegistro || '').slice(0, 10);
      if (fecha && (fecha < rangoDesde || fecha > rangoHasta)) return false;
      if (filtroSala && p.sala !== filtroSala) return false;
      if (filtroFormacion && p.codigo !== filtroFormacion) return false;
      return true;
    });
  }, [postergaciones, rangoDesde, rangoHasta, filtroSala, filtroFormacion]);

  const conflictosDetalle = useMemo(() => {
    let lista = calcularConflictosDetalle(clases);
    if (filtroSala) lista = lista.filter((c) => c.sala === filtroSala);
    return lista;
  }, [clases, filtroSala]);

  // ---- KPIs principales ----
  const kpis = useMemo(() => {
    const horas = vistaFiltrada.reduce((acc, c) => acc + c.duracion / 60, 0);
    const salasUsadas = new Set(vistaFiltrada.map((c) => c.sala)).size;
    const horasDisponiblesTotal = (filtroSala ? 1 : SALAS.length) * HORAS_DISPONIBLES_SEMANA_POR_SALA;
    const ocupacion = horasDisponiblesTotal ? Math.round((horas / horasDisponiblesTotal) * 100) : 0;

    const usoPorSala = {};
    SALAS.forEach((s) => (usoPorSala[s] = 0));
    vistaFiltrada.forEach((c) => { usoPorSala[c.sala] = (usoPorSala[c.sala] || 0) + c.duracion / 60; });
    const salasOrdenadas = Object.entries(usoPorSala).sort((a, b) => b[1] - a[1]);

    return {
      totalClases: vistaFiltrada.length, horas, salasUsadas, ocupacion,
      salaTop: salasOrdenadas[0], salaMenos: salasOrdenadas[salasOrdenadas.length - 1],
      usoPorSala
    };
  }, [vistaFiltrada, filtroSala]);

  // ---- Ocupación de salas (detalle, ordenado de mayor a menor) ----
  const ocupacionSalas = useMemo(() => {
    return SALAS.map((s) => {
      const clasesSala = vistaFiltrada.filter((c) => c.sala === s);
      const horasOcupadas = clasesSala.reduce((acc, c) => acc + c.duracion / 60, 0);
      const pct = Math.round((horasOcupadas / HORAS_DISPONIBLES_SEMANA_POR_SALA) * 100);
      return { sala: s, horasDisponibles: HORAS_DISPONIBLES_SEMANA_POR_SALA, horasOcupadas, pct, cantidad: clasesSala.length };
    }).filter((s) => !filtroSala || s.sala === filtroSala).sort((a, b) => b.pct - a.pct);
  }, [vistaFiltrada, filtroSala]);

  // ---- Horarios críticos: para cada horaMin usado, cuántas salas distintas están
  // ocupadas en simultáneo en ese momento (considerando duración + buffer de cada clase) ----
  const horariosCriticos = useMemo(() => {
    const horasUsadas = [...new Set(vistaFiltrada.map((c) => c.horaMin))].sort((a, b) => a - b);
    return horasUsadas.map((h) => {
      const salasOcupadas = new Set(
        vistaFiltrada.filter((c) => (h >= c.horaMin - BUFFER_MIN) && (h < c.horaMin + c.duracion)).map((c) => c.sala)
      ).size;
      return { horaMin: h, salasOcupadas, total: SALAS.length, pct: salasOcupadas / SALAS.length };
    }).sort((a, b) => b.salasOcupadas - a.salasOcupadas);
  }, [vistaFiltrada]);

  // ---- Evolución mensual: datos reales dateados (histórico importado + postergaciones vivas) ----
  const evolucionMensual = useMemo(() => {
    const porMes = {};
    CRONOGRAMA_HISTORICO.filter((h) => h.tipo === 'Formación' && h.fecha).forEach((h) => {
      const mes = h.fecha.slice(0, 7);
      if (filtroFormacion && h.curso !== filtroFormacion) return;
      porMes[mes] = porMes[mes] || { clases: 0, postergaciones: 0 };
      porMes[mes].clases++;
    });
    postergaciones.forEach((p) => {
      const mes = (p.fechaRegistro || '').slice(0, 7);
      if (!mes) return;
      if (filtroFormacion && p.codigo !== filtroFormacion) return;
      porMes[mes] = porMes[mes] || { clases: 0, postergaciones: 0 };
      porMes[mes].postergaciones++;
    });
    const meses = Object.keys(porMes).sort().slice(-12);
    return meses.map((m, i) => {
      const anterior = i > 0 ? porMes[meses[i - 1]] : null;
      const variacion = anterior && anterior.clases > 0 ? Math.round(((porMes[m].clases - anterior.clases) / anterior.clases) * 1000) / 10 : null;
      return { mes: m, ...porMes[m], variacion };
    });
  }, [postergaciones, filtroFormacion]);

  // ---- Análisis por Formación/Curso ----
  const porFormacion = useMemo(() => {
    const grupos = {};
    vistaFiltrada.forEach((c) => {
      grupos[c.codigo] = grupos[c.codigo] || { codigo: c.codigo, clases: 0, horas: 0, salas: new Set(), docentes: new Set() };
      grupos[c.codigo].clases++;
      grupos[c.codigo].horas += c.duracion / 60;
      grupos[c.codigo].salas.add(c.sala);
      if (c.docente) grupos[c.codigo].docentes.add(c.docente);
    });
    return Object.values(grupos).map((g) => ({
      ...g, salas: [...g.salas], docentes: [...g.docentes],
      postergaciones: postergacionesFiltradas.filter((p) => p.codigo === g.codigo).length
    })).sort((a, b) => b.horas - a.horas);
  }, [vistaFiltrada, postergacionesFiltradas]);

  // ---- Postergaciones: bloque específico ----
  const postergacionesPorFormacion = useMemo(() => {
    const grupos = {};
    postergacionesFiltradas.forEach((p) => { grupos[p.codigo] = (grupos[p.codigo] || 0) + 1; });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  }, [postergacionesFiltradas]);

  const postergacionesPorSala = useMemo(() => {
    const grupos = {};
    postergacionesFiltradas.forEach((p) => { if (p.sala) grupos[p.sala] = (grupos[p.sala] || 0) + 1; });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  }, [postergacionesFiltradas]);

  // Por docente: no hay campo Docente en Postergaciones — se cruza con el docente
  // ACTUAL de la clase viva (mismo codigo+edicion+numero). Es una aproximación: si el
  // docente cambió después de la postergación, puede no reflejar quién daba la clase
  // en ese momento.
  const postergacionesPorDocente = useMemo(() => {
    const grupos = {};
    postergacionesFiltradas.forEach((p) => {
      const claseActual = clases.find((c) => c.codigo === p.codigo && (c.edicion || '1') === (p.edicion || '1') && c.numero === p.numero);
      const docente = claseActual?.docente || 'Sin datos';
      grupos[docente] = (grupos[docente] || 0) + 1;
    });
    return Object.entries(grupos).sort((a, b) => b[1] - a[1]);
  }, [postergacionesFiltradas, clases]);

  const postergacionesPorMes = useMemo(() => {
    const grupos = {};
    postergaciones.forEach((p) => {
      const mes = (p.fechaRegistro || '').slice(0, 7);
      if (!mes) return;
      grupos[mes] = (grupos[mes] || 0) + 1;
    });
    return Object.entries(grupos).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  }, [postergaciones]);

  // ---- Alertas / Insights — calculadas de los datos reales de arriba, nada inventado ----
  const insights = useMemo(() => {
    const out = [];
    const horasValidas = Object.values(kpis.usoPorSala).filter((h) => h > 0);
    const promedioHoras = horasValidas.length ? horasValidas.reduce((a, b) => a + b, 0) / horasValidas.length : 0;

    if (kpis.salaTop && promedioHoras > 0 && kpis.salaTop[1] > promedioHoras * 1.5) {
      out.push({ tipo: 'warn', texto: `${kpis.salaTop[0]} se usa muy por encima del promedio (${kpis.salaTop[1].toFixed(1)}hs/sem vs. ${promedioHoras.toFixed(1)}hs/sem de promedio).` });
    }
    const horarioSaturado = horariosCriticos.find((h) => h.pct >= 0.9);
    if (horarioSaturado) {
      out.push({ tipo: 'warn', texto: `${minutosAHora(horarioSaturado.horaMin)} tiene ${horarioSaturado.salasOcupadas} de ${horarioSaturado.total} salas ocupadas (${Math.round(horarioSaturado.pct * 100)}%).` });
    }
    const mesActual = postergacionesPorMes[postergacionesPorMes.length - 1];
    const mesPrevio = postergacionesPorMes[postergacionesPorMes.length - 2];
    if (mesActual && mesPrevio && mesActual[1] > mesPrevio[1]) {
      out.push({ tipo: 'warn', texto: `Las postergaciones subieron de ${mesPrevio[1]} a ${mesActual[1]} respecto del mes anterior.` });
    }
    if (postergacionesPorFormacion.length > 0) {
      const [codigo, cant] = postergacionesPorFormacion[0];
      const totalPost = postergacionesFiltradas.length;
      if (totalPost > 0 && cant / totalPost >= 0.4) {
        out.push({ tipo: 'info', texto: `${NOMBRES[codigo] || codigo} concentra ${cant} de las ${totalPost} postergaciones del período (${Math.round((cant / totalPost) * 100)}%).` });
      }
    }
    const horarioVacio = horariosCriticos.filter((h) => h.pct > 0 && h.pct < 0.25);
    if (horarioVacio.length > 0) {
      out.push({ tipo: 'info', texto: `${horarioVacio.length} horario(s) tienen menos del 25% de las salas ocupadas — margen para reubicar clases ahí.` });
    }
    const horasTotales = Object.values(kpis.usoPorSala).reduce((a, b) => a + b, 0);
    if (kpis.salaTop && horasTotales > 0 && kpis.salaTop[1] / horasTotales >= 0.35 && SALAS.length > 2) {
      out.push({ tipo: 'info', texto: `${kpis.salaTop[0]} concentra el ${Math.round((kpis.salaTop[1] / horasTotales) * 100)}% de todas las horas de uso — hay margen para repartir mejor.` });
    }
    return out;
  }, [kpis, horariosCriticos, postergacionesPorMes, postergacionesPorFormacion, postergacionesFiltradas]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Análisis</h1>
      <p className="text-textSec text-sm mb-4">Indicadores para decidir sobre salas, clases, horarios y formaciones.</p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {/* FILTROS */}
      <div className={boxCls}>
        <p className="text-xs font-semibold text-textSec mb-2">Período (aplica a Postergaciones y Evolución)</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PERIODOS.map((p) => <button key={p.id} className={chipCls(periodo === p.id)} onClick={() => setPeriodo(p.id)}>{p.label}</button>)}
        </div>
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap gap-2 mb-3">
            <input type="date" value={personalDesde} onChange={(e) => setPersonalDesde(e.target.value)} className={selectCls} />
            <span className="text-textMuted text-xs self-center">a</span>
            <input type="date" value={personalHasta} onChange={(e) => setPersonalHasta(e.target.value)} className={selectCls} />
          </div>
        )}
        <p className="text-xs font-semibold text-textSec mb-2">Filtrar por (aplica a todo lo demás)</p>
        <div className="flex flex-wrap gap-2">
          <select value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)} className={selectCls}>
            <option value="">Todas las salas</option>
            {SALAS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroFormacion} onChange={(e) => setFiltroFormacion(e.target.value)} className={selectCls}>
            <option value="">Todas las formaciones</option>
            {codigosUsados.map((c) => <option key={c} value={c}>{ICONOS[c] || ''} {NOMBRES[c] || c}</option>)}
          </select>
          <select value={filtroDocente} onChange={(e) => setFiltroDocente(e.target.value)} className={selectCls}>
            <option value="">Todos los docentes</option>
            {docentesUsados.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {(filtroSala || filtroFormacion || filtroDocente) && (
            <button className={chipCls(false)} onClick={() => { setFiltroSala(''); setFiltroFormacion(''); setFiltroDocente(''); }}>✕ Limpiar filtros</button>
          )}
        </div>
      </div>

      {cargandoDatos ? (
        <div className={boxCls}><p className="text-textSec text-sm">Cargando…</p></div>
      ) : (
        <>
          <p className="text-[11px] text-textMuted mb-2">
            Los indicadores de horario semanal (clases, horas, ocupación, salas, horarios críticos) reflejan el horario recurrente <b>vigente ahora</b> — la mayoría de las clases no tienen una fecha puntual por ocurrencia, así que no se pueden filtrar por un rango de fechas arbitrario sin perder precisión. Postergaciones y Evolución sí usan fechas reales.
          </p>

          {/* DASHBOARD DE INDICADORES */}
          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
            <StatCard n={kpis.totalClases} l="Total de clases (semana)" />
            <StatCard n={kpis.horas.toFixed(1) + ' hs'} l="Horas de clase (semana)" />
            <StatCard n={kpis.salasUsadas} l="Salas utilizadas" />
            <StatCard n={kpis.ocupacion + '%'} l="Ocupación de salas" acento={kpis.ocupacion >= 80 ? 'warning' : undefined} />
            <StatCard n={kpis.salaTop ? kpis.salaTop[0] : '—'} l={`Sala más usada (${kpis.salaTop ? kpis.salaTop[1].toFixed(1) : 0}hs)`} />
            <StatCard n={kpis.salaMenos ? kpis.salaMenos[0] : '—'} l={`Sala menos usada (${kpis.salaMenos ? kpis.salaMenos[1].toFixed(1) : 0}hs)`} />
            <StatCard n={postergacionesFiltradas.length} l="Postergaciones (período)" acento={postergacionesFiltradas.length > 0 ? 'warning' : undefined} />
            <StatCard n={conflictosDetalle.length} l="Conflictos" acento={conflictosDetalle.length > 0 ? 'danger' : undefined} />
          </div>

          {/* ALERTAS / INSIGHTS */}
          <div className={boxCls}>
            <h2 className="text-sm font-bold mb-3">⚠️ Para revisar</h2>
            {insights.length === 0 ? (
              <p className="text-successText text-sm">✔ No se detectaron situaciones para revisar con los filtros actuales.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {insights.map((i, idx) => (
                  <div key={idx} className={`rounded-lg px-3.5 py-2.5 text-sm font-medium ${i.tipo === 'warn' ? 'bg-warningBg text-warningText' : 'bg-infoBg text-infoText'}`}>
                    {i.texto}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* OCUPACIÓN DE SALAS */}
          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Ocupación de salas</h2>
            {ocupacionSalas.every((s) => s.cantidad === 0) ? (
              <p className="text-textSec text-sm">No hay clases cargadas para calcular ocupación con estos filtros.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {ocupacionSalas.map((s) => (
                  <div key={s.sala}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold">{s.sala}</span>
                      <span className="text-textMuted">{s.horasOcupadas.toFixed(1)}hs / {s.horasDisponibles.toFixed(0)}hs · {s.cantidad} clase(s) · {s.pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden">
                      <div className={`h-full ${s.pct >= 80 ? 'bg-dangerText' : s.pct >= 50 ? 'bg-warningText' : 'bg-successText'}`} style={{ width: `${Math.min(100, s.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HORARIOS CRÍTICOS */}
          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-1">Horarios críticos</h2>
            <p className="text-[11px] text-textMuted mb-3">Cuántas salas están ocupadas en simultáneo, para cada horario del horario semanal vigente.</p>
            {horariosCriticos.length === 0 ? (
              <p className="text-textSec text-sm">No hay clases cargadas con estos filtros.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {horariosCriticos.slice(0, 10).map((h) => (
                  <div key={h.horaMin} className="flex items-center gap-2 text-xs">
                    <span>{h.pct >= 0.9 ? '🔴' : h.pct >= 0.7 ? '🟠' : h.pct >= 0.4 ? '🟡' : '🟢'}</span>
                    <span className="font-mono w-14">{minutosAHora(h.horaMin)}</span>
                    <div className="flex-1 h-3 bg-bg border border-border rounded-full overflow-hidden">
                      <div className={`h-full ${h.pct >= 0.9 ? 'bg-dangerText' : h.pct >= 0.7 ? 'bg-warningText' : 'bg-successText'}`} style={{ width: `${h.pct * 100}%` }} />
                    </div>
                    <span className="text-textMuted w-20 text-right">{h.salasOcupadas} de {h.total} salas</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EVOLUCIÓN EN EL TIEMPO */}
          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-1">Evolución mensual</h2>
            <p className="text-[11px] text-textMuted mb-3">Clases: histórico real importado. Postergaciones: registradas en vivo.</p>
            {evolucionMensual.length === 0 ? (
              <p className="text-textSec text-sm">Sin datos históricos suficientes para graficar evolución.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b border-border text-textSec text-left"><th className="p-1.5">Mes</th><th className="p-1.5">Clases</th><th className="p-1.5">Variación</th><th className="p-1.5">Postergaciones</th></tr></thead>
                  <tbody>
                    {evolucionMensual.map((m) => (
                      <tr key={m.mes} className="border-b border-border">
                        <td className="p-1.5">{m.mes}</td>
                        <td className="p-1.5">{m.clases}</td>
                        <td className="p-1.5">{m.variacion == null ? '—' : `${m.variacion > 0 ? '↑' : m.variacion < 0 ? '↓' : ''} ${Math.abs(m.variacion)}%`}</td>
                        <td className="p-1.5">{m.postergaciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FORMACIÓN / CURSO */}
          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Análisis por formación</h2>
            {porFormacion.length === 0 ? (
              <p className="text-textSec text-sm">No hay clases cargadas con estos filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b border-border text-textSec text-left"><th className="p-1.5">Formación</th><th className="p-1.5">Clases</th><th className="p-1.5">Horas</th><th className="p-1.5">Salas</th><th className="p-1.5">Docentes</th><th className="p-1.5">Postergaciones</th></tr></thead>
                  <tbody>
                    {porFormacion.map((f) => {
                      const color = colorFormacion(f.codigo);
                      return (
                        <tr key={f.codigo} className="border-b border-border">
                          <td className="p-1.5"><span className={`font-semibold ${color.text}`}>{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo}</span></td>
                          <td className="p-1.5">{f.clases}</td>
                          <td className="p-1.5">{f.horas.toFixed(1)}</td>
                          <td className="p-1.5">{f.salas.join(', ')}</td>
                          <td className="p-1.5">{f.docentes.join(', ') || '—'}</td>
                          <td className="p-1.5">{f.postergaciones}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* POSTERGACIONES */}
          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Postergaciones</h2>
            <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))' }}>
              <StatCard n={postergacionesFiltradas.length} l="Total en el período" />
              <StatCard n={postergacionesPorFormacion[0]?.[0] ? `${ICONOS[postergacionesPorFormacion[0][0]] || ''} ${postergacionesPorFormacion[0][0]}` : '—'} l="Formación con más" chico />
              <StatCard n={postergacionesPorSala[0]?.[0] || '—'} l="Sala con más" chico />
              <StatCard n={postergacionesPorDocente[0]?.[0] || '—'} l="Docente con más (aprox.)" chico />
            </div>
            {postergacionesFiltradas.length === 0 ? (
              <p className="text-textSec text-sm">Sin postergaciones en el período con estos filtros.</p>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))' }}>
                <MiniLista titulo="Por formación" items={postergacionesPorFormacion.map(([k, v]) => [NOMBRES[k] || k, v])} />
                <MiniLista titulo="Por sala" items={postergacionesPorSala} />
                <MiniLista titulo="Por docente (aproximado)" items={postergacionesPorDocente} />
              </div>
            )}
            <p className="text-[10.5px] text-textMuted mt-3">
              "Por docente" cruza cada postergación con el docente actual de esa clase — si el docente cambió después, puede no ser exacto.
            </p>
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-2">Envío de mail automático</h2>
            <p className="text-xs text-textSec mb-2">
              Cada lunes se manda un resumen automático con las clases creadas, postergadas, con cambio de sala o eliminadas de la semana, a:
            </p>
            <ul className="text-xs text-textSec list-disc list-inside mb-3 space-y-0.5">
              <li>Sofía Salgueiro (sofia.salgueiro@institutoilce.com)</li>
              <li>Jennifer Rebasti (jennifer.rebasti@institutoilce.com)</li>
              <li>Macarena Zoe Juncos Abello (Macarena.Juncos@institutoilce.com)</li>
            </ul>
            {puedeAdmin && (
              <>
                <button
                  className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
                  onClick={enviarResumenAhora} disabled={enviandoResumen}
                >
                  {enviandoResumen ? 'Enviando…' : 'Enviar resumen ahora (prueba)'}
                </button>
                {msgResumen && (
                  <p className={`text-xs mt-2 ${msgResumen.tipo === 'error' ? 'text-dangerText' : msgResumen.tipo === 'ok' ? 'text-successText' : 'text-textSec'}`}>
                    {msgResumen.texto}
                  </p>
                )}
              </>
            )}
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Historial reciente</h2>
            {historial.length === 0 ? <p className="text-textSec text-sm">Todavía no hay movimientos registrados.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="border-b border-border text-textSec text-left"><th className="p-1.5">Cuándo</th><th className="p-1.5">Quién</th><th className="p-1.5">Acción</th><th className="p-1.5">Detalle</th></tr></thead>
                  <tbody>
                    {historial.slice(0, 60).map((h, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-1.5 whitespace-nowrap">{new Date(h.fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-1.5">{h.usuario}</td>
                        <td className="p-1.5">{h.accion}</td>
                        <td className="p-1.5">{h.detalle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MiniLista({ titulo, items }) {
  return (
    <div>
      <p className="text-xs font-semibold text-textSec mb-2">{titulo}</p>
      {items.length === 0 ? <p className="text-textMuted text-xs">Sin datos.</p> : (
        <div className="flex flex-col gap-1">
          {items.slice(0, 6).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-textSec truncate">{k}</span>
              <span className="text-textMuted shrink-0">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ n, l, acento, chico }) {
  const color = { warning: 'text-warningText', danger: 'text-dangerText' }[acento] || 'text-accentTeal';
  return (
    <div className="bg-bg border border-border rounded-xl p-3.5">
      <div className={`${chico ? 'text-base' : 'text-xl'} font-extrabold ${color} truncate`}>{n}</div>
      <div className="text-[11px] text-textSec mt-1">{l}</div>
    </div>
  );
}
