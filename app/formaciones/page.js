'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { ICONOS, NOMBRES, formatFechaCorta, calcularFormaciones, colorFormacion, ESTADOS } from '../../lib/salasLogic';
import { CRONOGRAMA_HISTORICO } from '../../lib/cronogramaHistorico';

const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

export default function FormacionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [formacionesManual, setFormacionesManual] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');
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
    return out;
  }, []);

  // Combina lo calculado automáticamente desde el horario (calcularFormaciones) con, en
  // orden de confiabilidad: 1) el histórico real (fechas verdaderas de clases que ya
  // pasaron), 2) las fechas cargadas a mano en la pestaña "Formaciones" del Sheet.
  const formaciones = useMemo(() => {
    const base = calcularFormaciones(clases);
    const hoyISO = new Date().toISOString().slice(0, 10);
    return base.map((f) => {
      const historico = historicoPorEdicion[`${f.codigo}|${f.numero}`];
      const manual = formacionesManual.find((m) => m.codigo === f.codigo && m.edicion === f.numero);

      if (historico) {
        const total = historico.total || f.total;
        // El histórico puede tener registrada solo ALGUNA de las clases de esta edición
        // (no necesariamente todas) — por eso la fecha de inicio real SÍ es confiable, pero
        // "cuántas ya pasaron" se estima mejor por tiempo transcurrido (1 clase por semana)
        // que por cuántas filas quedaron logueadas en ese Excel puntual.
        const inicio = new Date(historico.fechaInicio + 'T00:00:00');
        const finEstimado = new Date(inicio); finEstimado.setDate(inicio.getDate() + (total - 1) * 7);
        const fechaFinalEstimada = finEstimado.toISOString().slice(0, 10);
        const semanasPasadas = Math.floor((new Date(hoyISO) - inicio) / (7 * 24 * 60 * 60 * 1000));
        const cargadasEstimadas = Math.max(historico.cargadas, Math.min(total, semanasPasadas + 1));
        const finalPasado = fechaFinalEstimada < hoyISO;
        const completo = total && cargadasEstimadas >= total;
        const estado = completo || finalPasado ? 'Finalizó' : 'En proceso';
        const pct = total ? Math.min(100, Math.round((cargadasEstimadas / total) * 100)) : null;
        return {
          ...f, fechaInicio: historico.fechaInicio, fechaFinal: fechaFinalEstimada,
          cargadas: Math.min(cargadasEstimadas, total), total, estado, pct,
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
  }, [clases, formacionesManual, historicoPorEdicion]);

  const filtradas = useMemo(() => {
    let out = formaciones;
    if (filtro === 'enCurso') out = out.filter((f) => f.estado === 'En proceso');
    else if (filtro === 'porFinalizar') out = out.filter((f) => f.estado === 'En proceso' && f.pct != null && f.pct >= 85);
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
            const estado = f.estado === 'Finalizó' ? ESTADOS.finalizada : ESTADOS.normal;
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
