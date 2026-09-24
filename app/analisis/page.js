'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '../../lib/useSession';
import {
  SALAS, DIAS, ICONOS, NOMBRES, BUFFER_MIN, DURACIONES,
  agruparParaVista, calcularConflictosDetalle, minutosAHora, colorFormacion
} from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';
import { tienePermisoAuditoria } from '../../lib/permisos';

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

/** Ventana inmediatamente anterior, de la misma duración en días — para comparar tendencia. */
function periodoAnterior(desde, hasta) {
  const d1 = new Date(desde + 'T00:00:00'), d2 = new Date(hasta + 'T00:00:00');
  const dias = Math.round((d2 - d1) / 86400000) + 1;
  const nuevoHasta = new Date(d1); nuevoHasta.setDate(nuevoHasta.getDate() - 1);
  const nuevoDesde = new Date(nuevoHasta); nuevoDesde.setDate(nuevoDesde.getDate() - dias + 1);
  return [toISO(nuevoDesde), toISO(nuevoHasta)];
}

function variacionPct(actual, anterior) {
  if (anterior == null || anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

function diaCorto(dia) {
  return dia ? dia.charAt(0) + dia.slice(1).toLowerCase() : '—';
}

/** Suma de horas estimadas de un conjunto de filas del histórico, según la duración típica de cada formación. Solo se cuentan filas de tipo "Formación" con un código de curso conocido — el resto del histórico no trae duración y no se estima. */
function horasEstimadas(filas) {
  return filas.filter((h) => h.tipo === 'Formación' && DURACIONES[h.curso]).reduce((acc, h) => acc + DURACIONES[h.curso] / 60, 0);
}

export default function AnalisisPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [periodo, setPeriodo] = useState('mes');
  const [personalDesde, setPersonalDesde] = useState('');
  const [personalHasta, setPersonalHasta] = useState('');
  const [filtroSala, setFiltroSala] = useState('');
  const [filtroFormacion, setFiltroFormacion] = useState('');
  const [filtroDocente, setFiltroDocente] = useState('');

  const puedeVerDetalleCompleto = tienePermisoAuditoria(usuario);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

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
  const [prevDesde, prevHasta] = useMemo(() => periodoAnterior(rangoDesde, rangoHasta), [rangoDesde, rangoHasta]);

  // ---- "Vigente" — el horario recurrente semanal actual, filtrado por Sala/Formación/Docente ----
  // Importante: la mayoría de las clases viven como horario recurrente semanal, sin una
  // fecha puntual por ocurrencia — por eso el patrón de uso de salas, ocupación y
  // horarios/días críticos reflejan el HORARIO ACTUAL vigente, no un rango de fechas pasado.
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

  const postergacionesPeriodoAnterior = useMemo(() => {
    return postergaciones.filter((p) => {
      const fecha = (p.fechaRegistro || '').slice(0, 10);
      if (!fecha || fecha < prevDesde || fecha > prevHasta) return false;
      if (filtroSala && p.sala !== filtroSala) return false;
      if (filtroFormacion && p.codigo !== filtroFormacion) return false;
      return true;
    }).length;
  }, [postergaciones, prevDesde, prevHasta, filtroSala, filtroFormacion]);

  const conflictosDetalle = useMemo(() => {
    let lista = calcularConflictosDetalle(clases);
    if (filtroSala) lista = lista.filter((c) => c.sala === filtroSala);
    return lista;
  }, [clases, filtroSala]);

  // ---- Histórico con fecha real, filtrado por Formación/Docente (no tiene Sala confiable) ----
  const historicoFiltradoEntidad = useMemo(() => {
    return CRONOGRAMA_HISTORICO.filter((h) =>
      h.fecha &&
      (!filtroFormacion || h.curso === filtroFormacion) &&
      (!filtroDocente || (h.docente || '').toLowerCase().includes(filtroDocente.toLowerCase()))
    );
  }, [filtroFormacion, filtroDocente]);

  const historicoPeriodo = useMemo(
    () => historicoFiltradoEntidad.filter((h) => h.fecha >= rangoDesde && h.fecha <= rangoHasta),
    [historicoFiltradoEntidad, rangoDesde, rangoHasta]
  );
  const historicoPeriodoAnterior = useMemo(
    () => historicoFiltradoEntidad.filter((h) => h.fecha >= prevDesde && h.fecha <= prevHasta),
    [historicoFiltradoEntidad, prevDesde, prevHasta]
  );

  // ---- KPIs "vigentes" (horario semanal actual) ----
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

  // ---- Resumen ejecutivo: clases/horas/tasa por PERÍODO (fechas reales), con tendencia ----
  const resumen = useMemo(() => {
    const totalClasesPeriodo = historicoPeriodo.filter((h) => h.tipo === 'Formación').length;
    const totalClasesPeriodoAnt = historicoPeriodoAnterior.filter((h) => h.tipo === 'Formación').length;
    const totalHorasPeriodo = horasEstimadas(historicoPeriodo);
    const totalHorasPeriodoAnt = horasEstimadas(historicoPeriodoAnterior);
    const tasaPost = totalClasesPeriodo > 0 ? Math.round((postergacionesFiltradas.length / totalClasesPeriodo) * 1000) / 10 : null;
    const tasaPostAnt = totalClasesPeriodoAnt > 0 ? Math.round((postergacionesPeriodoAnterior / totalClasesPeriodoAnt) * 1000) / 10 : null;
    return {
      totalClasesPeriodo, totalHorasPeriodo, tasaPost,
      trendClases: variacionPct(totalClasesPeriodo, totalClasesPeriodoAnt),
      trendHoras: variacionPct(totalHorasPeriodo, totalHorasPeriodoAnt),
      trendTasaPp: (tasaPost != null && tasaPostAnt != null) ? Math.round((tasaPost - tasaPostAnt) * 10) / 10 : null
    };
  }, [historicoPeriodo, historicoPeriodoAnterior, postergacionesFiltradas, postergacionesPeriodoAnterior]);

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

  // ---- Demanda horaria: distribución por día (vigente) + heatmap día×horario ----
  const porDia = useMemo(() => {
    const grupos = {};
    vistaFiltrada.forEach((c) => {
      if (!c.dia) return;
      grupos[c.dia] = grupos[c.dia] || { dia: c.dia, clases: 0, horas: 0 };
      grupos[c.dia].clases++;
      grupos[c.dia].horas += c.duracion / 60;
    });
    return DIAS.filter((d) => grupos[d]).map((d) => grupos[d]);
  }, [vistaFiltrada]);

  const diaTop = useMemo(() => [...porDia].sort((a, b) => b.horas - a.horas)[0], [porDia]);

  const horariosUsados = useMemo(() => [...new Set(vistaFiltrada.map((c) => c.horaMin))].sort((a, b) => a - b), [vistaFiltrada]);

  const heatmap = useMemo(() => {
    return porDia.map(({ dia }) => ({
      dia,
      celdas: horariosUsados.map((h) => {
        const cant = vistaFiltrada.filter((c) => c.dia === dia && (h >= c.horaMin - BUFFER_MIN) && (h < c.horaMin + c.duracion)).length;
        return { horaMin: h, cant };
      })
    }));
  }, [porDia, horariosUsados, vistaFiltrada]);

  const maxSalasSimultaneas = filtroSala ? 1 : SALAS.length;

  // ---- Evolución mensual de clases dictadas (histórico real, con fecha) ----
  const evolucionClasesMensual = useMemo(() => {
    const porMes = {};
    historicoFiltradoEntidad.filter((h) => h.tipo === 'Formación').forEach((h) => {
      const mes = h.fecha.slice(0, 7);
      porMes[mes] = (porMes[mes] || 0) + 1;
    });
    const meses = Object.keys(porMes).sort().slice(-12);
    return meses.map((m, i) => {
      const anterior = i > 0 ? porMes[meses[i - 1]] : null;
      const variacion = anterior ? variacionPct(porMes[m], anterior) : null;
      return { mes: m, clases: porMes[m], variacion };
    });
  }, [historicoFiltradoEntidad]);

  // ---- Análisis por Formación/Curso (vigente + postergaciones del período) ----
  const porFormacion = useMemo(() => {
    const grupos = {};
    vistaFiltrada.forEach((c) => {
      grupos[c.codigo] = grupos[c.codigo] || { codigo: c.codigo, clases: 0, horas: 0, salas: new Set(), docentes: new Set() };
      grupos[c.codigo].clases++;
      grupos[c.codigo].horas += c.duracion / 60;
      grupos[c.codigo].salas.add(c.sala);
      if (c.docente) grupos[c.codigo].docentes.add(c.docente);
    });
    return Object.values(grupos).map((g) => {
      const postergaciones = postergacionesFiltradas.filter((p) => p.codigo === g.codigo).length;
      return {
        ...g, salas: [...g.salas], docentes: [...g.docentes], postergaciones,
        tasaPostergacion: g.clases > 0 ? Math.round((postergaciones / g.clases) * 1000) / 10 : 0
      };
    }).sort((a, b) => b.horas - a.horas);
  }, [vistaFiltrada, postergacionesFiltradas]);

  // ---- Postergaciones: desgloses ----
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

  const postergacionesPorMotivo = useMemo(() => {
    const grupos = {};
    postergacionesFiltradas.forEach((p) => { const m = p.motivo || 'Sin motivo registrado'; grupos[m] = (grupos[m] || 0) + 1; });
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

  // ---- Actividad docente (vigente: horario semanal actual) ----
  const porDocente = useMemo(() => {
    const grupos = {};
    vistaFiltrada.forEach((c) => {
      if (!c.docente) return;
      grupos[c.docente] = grupos[c.docente] || { docente: c.docente, clases: 0, horas: 0 };
      grupos[c.docente].clases++;
      grupos[c.docente].horas += c.duracion / 60;
    });
    const totalHoras = Object.values(grupos).reduce((a, g) => a + g.horas, 0);
    const postMap = Object.fromEntries(postergacionesPorDocente);
    return Object.values(grupos).map((g) => ({
      ...g,
      participacion: totalHoras ? Math.round((g.horas / totalHoras) * 100) : 0,
      postergaciones: postMap[g.docente] || 0
    })).sort((a, b) => b.horas - a.horas);
  }, [vistaFiltrada, postergacionesPorDocente]);

  // ---- Hallazgos automáticos — calculados de los datos reales de arriba, nada inventado ----
  const insights = useMemo(() => {
    const out = [];
    const horasValidas = Object.values(kpis.usoPorSala).filter((h) => h > 0);
    const promedioHoras = horasValidas.length ? horasValidas.reduce((a, b) => a + b, 0) / horasValidas.length : 0;

    if (kpis.salaTop && promedioHoras > 0 && kpis.salaTop[1] > promedioHoras * 1.5) {
      out.push({ tipo: 'warn', icono: '🏫', texto: `${kpis.salaTop[0]} es la sala más utilizada, muy por encima del promedio (${kpis.salaTop[1].toFixed(1)}hs/sem vs. ${promedioHoras.toFixed(1)}hs/sem de promedio).` });
    } else if (kpis.salaTop && kpis.salaTop[1] > 0) {
      out.push({ tipo: 'info', icono: '🏫', texto: `${kpis.salaTop[0]} es la sala más utilizada, con ${kpis.salaTop[1].toFixed(1)}hs/semana.` });
    }

    const horarioSaturado = horariosCriticos.find((h) => h.pct >= 0.9);
    if (horarioSaturado) {
      out.push({ tipo: 'warn', icono: '🕒', texto: `${minutosAHora(horarioSaturado.horaMin)} es el horario más demandado: ${horarioSaturado.salasOcupadas} de ${horarioSaturado.total} salas ocupadas (${Math.round(horarioSaturado.pct * 100)}%).` });
    } else if (horariosCriticos[0]) {
      out.push({ tipo: 'info', icono: '🕒', texto: `${minutosAHora(horariosCriticos[0].horaMin)} es el horario más demandado (${horariosCriticos[0].salasOcupadas} de ${horariosCriticos[0].total} salas).` });
    }

    if (diaTop && porDia.length > 1) {
      const promedioHorasDia = porDia.reduce((a, d) => a + d.horas, 0) / porDia.length;
      if (diaTop.horas > promedioHorasDia * 1.4) {
        out.push({ tipo: 'warn', icono: '📅', texto: `${diaCorto(diaTop.dia)} concentra más actividad que el resto: ${diaTop.horas.toFixed(1)}hs vs. ${promedioHorasDia.toFixed(1)}hs de promedio por día — posible sobrecarga operativa.` });
      } else {
        out.push({ tipo: 'info', icono: '📅', texto: `${diaCorto(diaTop.dia)} es el día con más actividad (${diaTop.horas.toFixed(1)}hs).` });
      }
    }

    if (porFormacion.length > 0) {
      const top = porFormacion[0];
      out.push({ tipo: 'info', icono: '🎓', texto: `${NOMBRES[top.codigo] || top.codigo} es la formación con mayor actividad vigente (${top.horas.toFixed(1)}hs/semana, ${top.clases} clase(s)).` });
      const conMuestraSuficiente = porFormacion.filter((f) => f.clases >= 2).sort((a, b) => b.tasaPostergacion - a.tasaPostergacion);
      const peorTasa = conMuestraSuficiente[0];
      if (peorTasa && peorTasa.tasaPostergacion > 0) {
        out.push({ tipo: peorTasa.tasaPostergacion >= 30 ? 'warn' : 'info', icono: '🔁', texto: `${NOMBRES[peorTasa.codigo] || peorTasa.codigo} tiene la mayor tasa de postergación del período: ${peorTasa.tasaPostergacion}% de sus clases vigentes (${peorTasa.postergaciones} de ${peorTasa.clases}).` });
      }
    }

    const mesActual = postergacionesPorMes[postergacionesPorMes.length - 1];
    const mesPrevio = postergacionesPorMes[postergacionesPorMes.length - 2];
    if (mesActual && mesPrevio && mesActual[1] > mesPrevio[1]) {
      out.push({ tipo: 'warn', icono: '📈', texto: `Las postergaciones subieron de ${mesPrevio[1]} a ${mesActual[1]} respecto del mes anterior.` });
    }

    const horarioVacio = horariosCriticos.filter((h) => h.pct > 0 && h.pct < 0.25);
    if (horarioVacio.length > 0) {
      out.push({ tipo: 'info', icono: '🟢', texto: `${horarioVacio.length} horario(s) tienen menos del 25% de las salas ocupadas — margen para reubicar clases ahí.` });
    }

    return out;
  }, [kpis, horariosCriticos, diaTop, porDia, porFormacion, postergacionesPorMes]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Análisis</h1>
      <p className="text-textSec text-sm mb-4">Indicadores para decidir sobre salas, clases, horarios y formaciones.</p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {/* FILTROS */}
      <div className={boxCls}>
        <p className="text-xs font-semibold text-textSec mb-2">Período (aplica al Resumen ejecutivo, Postergaciones y Evolución)</p>
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
          {/* RESUMEN EJECUTIVO */}
          <div className={boxCls}>
            <ModuloHeader
              icono="📊" titulo="Resumen ejecutivo"
              subtitulo={'Clases, horas y tasa de postergación son del período elegido, con su fecha real. Ocupación y salas utilizadas reflejan el horario semanal vigente ahora mismo — la mayoría de las clases no tiene una fecha puntual por ocurrencia. "Horas" es una estimación según la duración típica de cada formación.'}
            />
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))' }}>
              <Kpi valor={resumen.totalClasesPeriodo} label="Total de clases (período)" trend={resumen.trendClases} />
              <Kpi valor={resumen.totalHorasPeriodo.toFixed(1) + ' hs'} label="Total de horas (período, estimado)" trend={resumen.trendHoras} />
              <Kpi valor={kpis.ocupacion + '%'} label="Ocupación promedio" tag="vigente" acento={kpis.ocupacion >= 80 ? 'warning' : undefined} />
              <Kpi valor={kpis.salasUsadas} label="Salas utilizadas" tag="vigente" />
              <Kpi valor={resumen.tasaPost != null ? resumen.tasaPost + '%' : '—'} label="Tasa de postergación (período)" trend={resumen.trendTasaPp} trendEsPuntos invertir acento={resumen.tasaPost > 0 ? 'warning' : undefined} />
            </div>
          </div>

          {/* HALLAZGOS AUTOMÁTICOS */}
          <div className={boxCls}>
            <ModuloHeader icono="🔎" titulo="Hallazgos automáticos" subtitulo="Detectados a partir de los datos de arriba — nada cargado a mano." />
            {insights.length === 0 ? (
              <p className="text-successText text-sm">✔ No se detectaron situaciones para destacar con los filtros actuales.</p>
            ) : (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))' }}>
                {insights.map((i, idx) => (
                  <div key={idx} className={`rounded-xl px-3.5 py-3 text-sm font-medium flex items-start gap-2.5 ${i.tipo === 'warn' ? 'bg-warningBg text-warningText' : 'bg-infoBg text-infoText'}`}>
                    <span className="text-base leading-none">{i.icono}</span>
                    <span>{i.texto}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {conflictosDetalle.length > 0 && (
            <div className={`${boxCls} !bg-dangerBg/10 border-dangerText/30`}>
              <p className="text-sm font-semibold text-dangerText">⚠ {conflictosDetalle.length} conflicto(s) de sala detectado(s) con estos filtros — ver detalle en <Link href="/incidencias" className="underline">Alertas y feriados</Link>.</p>
            </div>
          )}

          {/* POSTERGACIONES + SALAS */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px,1fr))' }}>
            <div className={`${boxCls} mb-0`}>
              <ModuloHeader icono="🔁" titulo="Postergaciones" subtitulo="Del período elegido arriba." />
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <StatCard n={postergacionesFiltradas.length} l="Total en el período" />
                <StatCard n={resumen.tasaPost != null ? resumen.tasaPost + '%' : '—'} l="% sobre clases del período" />
                <StatCard n={postergacionesPorFormacion[0]?.[0] ? `${ICONOS[postergacionesPorFormacion[0][0]] || ''} ${NOMBRES[postergacionesPorFormacion[0][0]] || postergacionesPorFormacion[0][0]}` : '—'} l="Formación con más" chico />
                <StatCard n={postergacionesPorDocente[0]?.[0] || '—'} l="Docente con más (aprox.)" chico />
              </div>
              {postergacionesFiltradas.length === 0 ? (
                <p className="text-textSec text-sm">Sin postergaciones en el período con estos filtros.</p>
              ) : (
                <>
                  <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
                    <MiniLista titulo="Motivos más frecuentes" items={postergacionesPorMotivo} />
                    <MiniLista titulo="Por formación" items={postergacionesPorFormacion.map(([k, v]) => [NOMBRES[k] || k, v])} />
                    <MiniLista titulo="Por sala" items={postergacionesPorSala} />
                    <MiniLista titulo="Por docente (aprox.)" items={postergacionesPorDocente} />
                  </div>
                  <p className="text-xs font-semibold text-textSec mb-2">Evolución en el tiempo (todos los registros, por mes)</p>
                  <BarrasHorizontalesTiempo datos={postergacionesPorMes} />
                  <p className="text-[10.5px] text-textMuted mt-3">"Por docente" cruza cada postergación con el docente actual de esa clase — si el docente cambió después, puede no ser exacto.</p>
                </>
              )}
            </div>

            <div className={`${boxCls} mb-0`}>
              <ModuloHeader icono="🏫" titulo="Utilización de salas" subtitulo="Horario semanal vigente." />
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <StatCard n={kpis.salaTop ? kpis.salaTop[0] : '—'} l={`Más usada (${kpis.salaTop ? kpis.salaTop[1].toFixed(1) : 0}hs/sem)`} chico />
                <StatCard n={kpis.salaMenos ? kpis.salaMenos[0] : '—'} l={`Menos usada (${kpis.salaMenos ? kpis.salaMenos[1].toFixed(1) : 0}hs/sem)`} chico />
              </div>
              {ocupacionSalas.every((s) => s.cantidad === 0) ? (
                <p className="text-textSec text-sm">No hay clases cargadas para calcular ocupación con estos filtros.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {ocupacionSalas.map((s, i) => (
                    <div key={s.sala}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold flex items-center gap-1.5"><RangoBadge i={i} />{s.sala}</span>
                        <span className="text-textMuted">{s.horasOcupadas.toFixed(1)}hs / {s.horasDisponibles.toFixed(0)}hs · {s.cantidad} clase(s) · {s.pct}%</span>
                      </div>
                      <Barra pct={s.pct} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DEMANDA HORARIA */}
          <div className={boxCls}>
            <ModuloHeader icono="🕒" titulo="Demanda horaria" subtitulo="Horario semanal vigente — cuántas salas están ocupadas en simultáneo, por día y horario." />
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <StatCard n={horariosCriticos[0] ? minutosAHora(horariosCriticos[0].horaMin) : '—'} l={`Horario pico ${horariosCriticos[0] ? `(${horariosCriticos[0].salasOcupadas}/${horariosCriticos[0].total} salas)` : ''}`} chico />
              <StatCard n={diaTop ? diaCorto(diaTop.dia) : '—'} l={`Día con más actividad ${diaTop ? `(${diaTop.horas.toFixed(1)}hs)` : ''}`} chico />
            </div>

            {porDia.length === 0 ? (
              <p className="text-textSec text-sm">No hay clases cargadas con estos filtros.</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-textSec mb-2">Distribución semanal</p>
                <div className="flex flex-col gap-1.5 mb-5">
                  {porDia.map((d) => {
                    const maxHoras = Math.max(...porDia.map((x) => x.horas), 1);
                    const pct = Math.round((d.horas / maxHoras) * 100);
                    return (
                      <div key={d.dia} className="flex items-center gap-2 text-xs">
                        <span className="w-16 font-semibold">{diaCorto(d.dia)}</span>
                        <div className="flex-1 h-3 bg-bg border border-border rounded-full overflow-hidden">
                          <div className="h-full bg-accentTeal" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-textMuted w-24 text-right">{d.horas.toFixed(1)}hs · {d.clases} clase(s)</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs font-semibold text-textSec mb-2">Heatmap de ocupación (salas simultáneas por celda)</p>
                <div className="overflow-x-auto">
                  <table className="text-[11px] border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1 text-left text-textSec sticky left-0 bg-surface2">Día</th>
                        {horariosUsados.map((h) => <th key={h} className="p-1 text-textSec font-mono whitespace-nowrap">{minutosAHora(h)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.map((fila) => (
                        <tr key={fila.dia}>
                          <td className="p-1 font-semibold sticky left-0 bg-surface2 whitespace-nowrap">{diaCorto(fila.dia)}</td>
                          {fila.celdas.map((c) => (
                            <td
                              key={c.horaMin}
                              title={`${diaCorto(fila.dia)} ${minutosAHora(c.horaMin)} — ${c.cant} de ${maxSalasSimultaneas} sala(s)`}
                              className={`p-1 text-center border border-border/50 ${intensidadClase(c.cant / maxSalasSimultaneas)}`}
                            >
                              {c.cant > 0 ? c.cant : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10.5px] text-textMuted mt-2">Cada celda muestra cuántas salas están ocupadas en simultáneo en ese día/horario (con el buffer de {BUFFER_MIN} minutos entre clases).</p>
              </>
            )}
          </div>

          {/* FORMACIONES + DOCENTES */}
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px,1fr))' }}>
            <div className={`${boxCls} mb-0`}>
              <ModuloHeader icono="🎓" titulo="Formaciones" subtitulo="Horario vigente + postergaciones del período." />
              {porFormacion.length === 0 ? (
                <p className="text-textSec text-sm">No hay clases cargadas con estos filtros.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {porFormacion.map((f, i) => {
                    const color = colorFormacion(f.codigo);
                    const maxHoras = Math.max(...porFormacion.map((x) => x.horas), 1);
                    return (
                      <div key={f.codigo} className="text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold flex items-center gap-1.5 ${color.text}`}><RangoBadge i={i} />{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo}</span>
                          <span className="text-textMuted">{f.clases} clase(s) · {f.horas.toFixed(1)}hs · {f.postergaciones} postergación(es){f.tasaPostergacion > 0 ? ` (${f.tasaPostergacion}%)` : ''}</span>
                        </div>
                        <Barra pct={Math.round((f.horas / maxHoras) * 100)} colorClase="bg-accentPurple" />
                        <div className="text-[10.5px] text-textMuted mt-1">Salas: {f.salas.join(', ') || '—'} · Docentes: {f.docentes.join(', ') || '—'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {evolucionClasesMensual.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-textSec mt-4 mb-2">Evolución de clases dictadas (histórico real, por mes)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="border-b border-border text-textSec text-left"><th className="p-1.5">Mes</th><th className="p-1.5">Clases</th><th className="p-1.5">Variación</th></tr></thead>
                      <tbody>
                        {evolucionClasesMensual.map((m) => (
                          <tr key={m.mes} className="border-b border-border">
                            <td className="p-1.5">{m.mes}</td>
                            <td className="p-1.5">{m.clases}</td>
                            <td className="p-1.5">{m.variacion == null ? '—' : `${m.variacion > 0 ? '↑' : m.variacion < 0 ? '↓' : ''} ${Math.abs(m.variacion)}%`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className={`${boxCls} mb-0`}>
              <ModuloHeader icono="👤" titulo="Actividad docente" subtitulo="Horario semanal vigente." />
              {porDocente.length === 0 ? (
                <p className="text-textSec text-sm">No hay docentes cargados con estos filtros.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {porDocente.map((d, i) => (
                    <div key={d.docente} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold flex items-center gap-1.5"><RangoBadge i={i} />{d.docente}</span>
                        <span className="text-textMuted">{d.clases} clase(s) · {d.horas.toFixed(1)}hs · {d.participacion}% del total{d.postergaciones > 0 ? ` · ${d.postergaciones} postergación(es)` : ''}</span>
                      </div>
                      <Barra pct={d.participacion} colorClase="bg-accentMagenta" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Historial reciente</h2>
            {!puedeVerDetalleCompleto ? (
              <p className="text-textMuted text-sm py-2">🔒 El detalle completo del historial de acciones es visible solo para Admin/SuperAdmin. Podés verlo completo (con filtros y exportación) en <Link href="/auditoria" className="underline">Auditoría</Link> si tenés acceso.</p>
            ) : historial.length === 0 ? <p className="text-textSec text-sm">Todavía no hay movimientos registrados.</p> : (
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
            {puedeVerDetalleCompleto && (
              <p className="text-textMuted text-[10.5px] mt-2">Ver el historial completo, con filtros y exportación, en <Link href="/auditoria" className="underline">Auditoría</Link>.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ModuloHeader({ icono, titulo, subtitulo }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold flex items-center gap-2">{icono} {titulo}</h2>
      {subtitulo && <p className="text-[11px] text-textMuted mt-0.5">{subtitulo}</p>}
    </div>
  );
}

function Kpi({ valor, label, trend, trendEsPuntos, invertir, tag, acento }) {
  const colorValor = { warning: 'text-warningText', danger: 'text-dangerText' }[acento] || 'text-accentTeal';
  let colorTrend = 'text-textMuted';
  if (trend != null && trend !== 0) {
    const subiendo = trend > 0;
    const esBueno = invertir ? !subiendo : subiendo;
    colorTrend = esBueno ? 'text-successText' : 'text-dangerText';
  }
  return (
    <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className={`text-2xl font-extrabold truncate ${colorValor}`}>{valor}</div>
      <div className="text-[11.5px] text-textSec">{label}</div>
      {tag && <div className="text-[10px] text-textMuted font-semibold uppercase tracking-wide">{tag}</div>}
      {trend != null && (
        <div className={`text-[11px] font-semibold ${colorTrend}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '='} {Math.abs(trend)}{trendEsPuntos ? ' pp' : '%'} vs. período anterior
        </div>
      )}
    </div>
  );
}

function Barra({ pct, colorClase }) {
  const color = colorClase || (pct >= 80 ? 'bg-dangerText' : pct >= 50 ? 'bg-warningText' : 'bg-successText');
  return (
    <div className="w-full h-3 bg-bg border border-border rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function RangoBadge({ i }) {
  return <span className="w-4 h-4 rounded-full bg-surface2 border border-border flex items-center justify-center text-[9px] font-bold text-textSec shrink-0">{i + 1}</span>;
}

/** Barras horizontales simples para una serie mensual [ [mes, cantidad], ... ]. */
function BarrasHorizontalesTiempo({ datos }) {
  if (!datos || datos.length === 0) return <p className="text-textMuted text-xs">Sin datos.</p>;
  const max = Math.max(...datos.map(([, v]) => v), 1);
  return (
    <div className="flex flex-col gap-1">
      {datos.map(([mes, v]) => (
        <div key={mes} className="flex items-center gap-2 text-[11px]">
          <span className="font-mono w-16 text-textMuted">{mes}</span>
          <div className="flex-1 h-2.5 bg-bg border border-border rounded-full overflow-hidden">
            <div className="h-full bg-warningText" style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="text-textMuted w-6 text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Clase Tailwind de intensidad (0 a 1) para el heatmap — un único hue, más oscuro = más ocupado. */
function intensidadClase(ratio) {
  if (!ratio || ratio <= 0) return 'bg-bg';
  if (ratio <= 0.15) return 'bg-accentTeal/10';
  if (ratio <= 0.3) return 'bg-accentTeal/20';
  if (ratio <= 0.45) return 'bg-accentTeal/30';
  if (ratio <= 0.6) return 'bg-accentTeal/45';
  if (ratio <= 0.8) return 'bg-accentTeal/65';
  return 'bg-accentTeal/85';
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
