'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { ICONOS, NOMBRES, TOTALES, formatFechaCorta, calcularFormaciones, colorFormacion, ESTADOS, calcularFechaFinCurso, claseActualPorFecha } from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';
import { FECHAS_INICIO_REALES } from '../../lib/fechasInicioReales';

const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

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

  // El histórico (mismo Excel que ya se importó como referencia) tiene, para cada clase de
  // Formación que realmente pasó, su fecha real y a qué Edición pertenece — es la fuente más
  // confiable de todas para saber cuándo arrancó y cuántas clases lleva cada edición puntual.
  const historicoPorEdicion = useMemo(() => {
    const grupos = {};
    CRONOGRAMA_HISTORICO.filter((h) => h.tipo === 'Formación' && h.edicion && h.fecha).forEach((h) => {
      const key = `${h.curso}|${h.edicion}`;
      (grupos[key] = grupos[key] || []).push(h);
    });
    const out = {};
    Object.keys(grupos).forEach((key) => {
      const grupo = grupos[key];
      const fechas = grupo.map((h) => h.fecha).sort();
      out[key] = {
        fechaInicio: fechas[0], fechaFinal: fechas[fechas.length - 1],
        cargadas: grupo.length, total: parseInt(grupo[0].clasesTotal, 10) || null
      };
    });
    // Las fechas de inicio confirmadas a mano por Diego (lib/fechasInicioReales.js) son más
    // confiables que las que salen de mirar qué clases se llegaron a cargar en el horario
    // — cuando existen, pisan la fecha de inicio de acá (no tocan cargadas/total).
    Object.keys(FECHAS_INICIO_REALES).forEach((key) => {
      out[key] = { cargadas: 0, total: null, ...out[key], fechaInicio: FECHAS_INICIO_REALES[key] };
    });
    return out;
  }, []);

  // Combina lo calculado automáticamente desde el horario (calcularFormaciones) con, en
  // orden de confiabilidad: 1) el histórico real (fechas verdaderas de clases que ya
  // pasaron), 2) las fechas cargadas a mano en la pestaña "Formaciones" del Sheet.
  const formaciones = useMemo(() => {
    const base = calcularFormaciones(clases);
    const hoyISO = new Date().toISOString().slice(0, 10);
    const enriquecidas = base.map((f) => {
      const historico = historicoPorEdicion[`${f.codigo}|${f.numero}`];
      const manual = formacionesManual.find((m) => m.codigo === f.codigo && m.edicion === f.numero);

      if (historico) {
        const total = historico.total || f.total;
        // El histórico puede tener registrada solo ALGUNA de las clases de esta edición
        // (no necesariamente todas) — por eso la fecha de inicio real SÍ es confiable, pero
        // "cuántas ya pasaron" se estima mejor por tiempo transcurrido que por cuántas filas
        // quedaron logueadas en ese Excel puntual. calcularFechaFinCurso/claseActualPorFecha
        // respetan los 2 recesos de 2 semanas de Ontológico (clase 16→17 y 32→33) — antes
        // se asumía 1 clase por semana corrida, lo que adelantaba varias semanas la fecha
        // de fin estimada de cada edición de CO.
        const fechaFinalEstimada = calcularFechaFinCurso(f.codigo, historico.fechaInicio, total);
        const cargadasEstimadas = Math.max(historico.cargadas, claseActualPorFecha(f.codigo, historico.fechaInicio, total, hoyISO) || 0);
        const finalPasado = fechaFinalEstimada < hoyISO;
        const completo = total && cargadasEstimadas >= total;
        const estado = completo || finalPasado ? 'Finalizó' : 'En proceso';
        const pct = total ? Math.min(100, Math.round((cargadasEstimadas / total) * 100)) : null;
        // El cuatrimestre hay que recalcularlo acá con cargadasEstimadas (la cantidad real,
        // ajustada por histórico/fecha) — antes se dejaba el que traía `f` de calcularFormaciones,
        // calculado con la cantidad "cruda" del horario, que no siempre coincide y hacía
        // aparecer, por ej., una edición en la clase 21/48 (2do cuatrimestre) marcada como 3ro.
        const cuatrimestre = total === 48 ? Math.min(Math.ceil(cargadasEstimadas / 16), 3) || 1 : null;
        return {
          ...f, fechaInicio: historico.fechaInicio, fechaFinal: fechaFinalEstimada,
          cargadas: Math.min(cargadasEstimadas, total), total, estado, pct, cuatrimestre,
          proximaTxt: estado === 'Finalizó' ? '—' : f.proximaTxt
        };
      }

      if (!manual) return f;

      let fechaFinal = manual.fechaFinal || f.fechaFinal;
      if (!fechaFinal && manual.fechaInicio && f.total) {
        const est = new Date(manual.fechaInicio + 'T00:00:00');
        est.setDate(est.getDate() + (f.total - 1) * 7);
        fechaFinal = est.toISOString().slice(0, 10);
      }
      const finalPasado = fechaFinal ? fechaFinal < hoyISO : false;
      const estado = manual.estado === 'Finalizó' || finalPasado ? 'Finalizó' : f.estado;

      return {
        ...f,
        fechaInicio: manual.fechaInicio || f.fechaInicio,
        fechaFinal: fechaFinal || f.fechaFinal,
        estado,
        pct: estado === 'Finalizó' ? 100 : f.pct
      };
    });

    // Las de arriba son las que TODAVÍA ocupan una sala en el horario en vivo. Pero una
    // edición que ya terminó hace tiempo generalmente deja de tener sala asignada — y
    // sin embargo el histórico SÍ la tiene registrada. Sin este paso, esas ediciones
    // nunca aparecían como tarjeta (ni "Finalizó" ni ninguna otra), aunque el dato
    // exista. Acá se agregan como tarjetas propias, calculadas 100% desde el histórico.
    const presentes = new Set(enriquecidas.map((f) => `${f.codigo}|${f.numero}`));
    const soloHistoricas = Object.entries(historicoPorEdicion)
      .filter(([key]) => !presentes.has(key))
      .map(([key, historico]) => {
        const [codigo, numero] = key.split('|');
        // Si el histórico no trae total (típico de una edición que todavía no arrancó y
        // por eso nunca se cargó ninguna clase suya), se usa el total fijo del curso — antes
        // esto hacía que la tarjeta se descartara entera y la edición nunca apareciera.
        const total = historico.total || TOTALES[codigo] || null;
        if (!total) return null; // sin total no se puede estimar nada con confianza
        const fechaFinalEstimada = calcularFechaFinCurso(codigo, historico.fechaInicio, total);
        const cargadasEstimadas = Math.max(historico.cargadas, claseActualPorFecha(codigo, historico.fechaInicio, total, hoyISO) || 0);
        const finalPasado = fechaFinalEstimada < hoyISO;
        const completo = cargadasEstimadas >= total;
        const estado = completo || finalPasado ? 'Finalizó' : 'En proceso';
        const pct = Math.min(100, Math.round((cargadasEstimadas / total) * 100));
        // El cuatrimestre solo aplica a Coaching Ontológico (único curso de 48 clases) —
        // el resto no tiene concepto de cuatrimestre y no debe entrar en ese filtro.
        const cuatrimestre = total === 48 ? Math.min(Math.ceil(cargadasEstimadas / 16), 3) || 1 : null;
        return {
          codigo, numero, edicion: numero,
          fechaInicio: historico.fechaInicio, fechaFinal: fechaFinalEstimada,
          cargadas: Math.min(cargadasEstimadas, total), total, estado, pct,
          proximaTxt: estado === 'Finalizó' ? '—' : 'Sin sala asignada actualmente',
          cuatrimestre
        };
      })
      .filter(Boolean);

    return [...enriquecidas, ...soloHistoricas].map((f) => {
      // Una edición con fecha de inicio confirmada pero que todavía no arrancó (fecha en
      // el futuro) es "Próximamente" — antes se la mostraba como "En proceso" con progreso
      // en 0% (o directamente no aparecía, ver el fallback de total más arriba).
      if (f.estado !== 'Finalizó' && f.fechaInicio && f.fechaInicio > hoyISO) {
        f = { ...f, estado: 'Próximamente', cargadas: 0, pct: 0, proximaTxt: `Comienza ${formatFechaCorta(f.fechaInicio)}` };
      }
      // Vencimiento del proceso de certificación: 1 mes después de finalizar para
      // formaciones cortas (16 clases). Para Coaching Ontológico son 4 meses hasta la
      // edición 29 y 2 meses desde la edición 30 en adelante (cambio de política real,
      // indicado por Diego) — se puede seguir ajustando puntualmente por edición cargando
      // "MesesCertificacion" en la pestaña Formaciones del Sheet.
      if (!f.fechaFinal) return f;
      const manual = formacionesManual.find((m) => m.codigo === f.codigo && m.edicion === f.numero);
      const defaultCO = parseInt(f.numero, 10) >= 30 ? 2 : 4;
      const meses = manual?.mesesCertificacion ?? (f.codigo === 'CO' ? defaultCO : 1);
      const venc = new Date(f.fechaFinal + 'T00:00:00');
      venc.setMonth(venc.getMonth() + meses);
      return { ...f, vencimientoCertificacion: venc.toISOString().slice(0, 10), mesesCertificacion: meses };
    });
  }, [clases, formacionesManual, historicoPorEdicion]);

  const filtradas = useMemo(() => {
    let out = formaciones;
    if (filtro === 'enCurso') out = out.filter((f) => f.estado === 'En proceso');
    else if (filtro === 'porFinalizar') out = out.filter((f) => f.estado === 'En proceso' && f.pct != null && f.pct >= 85);
    else if (filtro === 'proximamente') out = out.filter((f) => f.estado === 'Próximamente');
    else if (filtro === 'finalizadas') out = out.filter((f) => f.estado === 'Finalizó');
    if (filtroCurso) out = out.filter((f) => f.codigo === filtroCurso);
    if (filtroCuatrimestre) out = out.filter((f) => f.cuatrimestre === parseInt(filtroCuatrimestre, 10));
    return out;
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
            const color = colorFormacion(f.codigo);
            const estado = f.estado === 'Finalizó' ? ESTADOS.finalizada : f.estado === 'Próximamente' ? ESTADOS.proximamente : ESTADOS.normal;
            return (
              <div key={f.codigo + f.edicion} className={`bg-surface2 border-l-4 ${color.border} border-t border-r border-b border-border rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />
                    <span className={`font-semibold text-sm truncate ${color.text}`}>{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo} {f.numero}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${estado.bg} ${estado.text}`}>{estado.label}</span>
                </div>

                {f.total === 48 && f.cuatrimestre && (
                  <p className="text-[11px] text-textMuted mb-1.5">{f.cuatrimestre}º cuatrimestre (clases {(f.cuatrimestre - 1) * 16 + 1}-{f.cuatrimestre * 16})</p>
                )}

                {f.pct != null ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-textSec mb-1">
                      <span>Clase {Math.min(f.cargadas, f.total)} / {f.total}</span>
                      <span>{f.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden mb-3">
                      <div className={`h-full ${color.dot}`} style={{ width: f.pct + '%' }} />
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
    </div>
  );
}
