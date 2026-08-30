'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { ICONOS, NOMBRES, formatFechaCorta, calcularFormaciones, colorFormacion, ESTADOS } from '../../lib/salasLogic';

const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

export default function FormacionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todas');

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const res = await fetchAutenticado('/api/clases');
      const data = await res.json();
      if (res.ok) setClases(data.clases); else setError(data.error);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  const filtradas = useMemo(() => {
    if (filtro === 'todas') return formaciones;
    if (filtro === 'enCurso') return formaciones.filter((f) => f.estado === 'En proceso');
    if (filtro === 'porFinalizar') return formaciones.filter((f) => f.estado === 'En proceso' && f.pct != null && f.pct >= 85);
    if (filtro === 'finalizadas') return formaciones.filter((f) => f.estado === 'Finalizó');
    return formaciones;
  }, [formaciones, filtro]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Formaciones</h1>
      <p className="text-textSec text-sm mb-4">Estado, fechas y progreso de cada edición.</p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      <div className="flex flex-wrap gap-1.5 mb-5">
        <button className={chipCls(filtro === 'todas')} onClick={() => setFiltro('todas')}>Todas</button>
        <button className={chipCls(filtro === 'enCurso')} onClick={() => setFiltro('enCurso')}>En curso</button>
        <button className={chipCls(filtro === 'porFinalizar')} onClick={() => setFiltro('porFinalizar')}>Próximas a finalizar</button>
        <button className={chipCls(filtro === 'finalizadas')} onClick={() => setFiltro('finalizadas')}>Finalizadas</button>
      </div>

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
                    <span className={`font-semibold text-sm truncate ${color.text}`}>{ICONOS[f.codigo] || ''} {NOMBRES[f.codigo] || f.codigo}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${estado.bg} ${estado.text}`}>{estado.label}</span>
                </div>
                <p className="text-xs text-textMuted mb-3">Edición {f.edicion}</p>

                {f.pct != null ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-textSec mb-1">
                      <span>Clase {f.cargadas} / {f.total}</span>
                      <span>{f.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg border border-border rounded-full overflow-hidden mb-3">
                      <div className={`h-full ${color.dot}`} style={{ width: f.pct + '%' }} />
                    </div>
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
