'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { SALAS, ICONOS, DIAS, agruparParaVista, calcularAlertas, calcularFormaciones } from '../../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';

export default function AnalisisPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, rf, rp, rh] = await Promise.all([
        fetchAutenticado('/api/clases'), fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/postergaciones'), fetchAutenticado('/api/historial')
      ]);
      const [dc, df, dp, dh] = await Promise.all([rc.json(), rf.json(), rp.json(), rh.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (rp.ok) setPostergaciones(dp.postergaciones);
      if (rh.ok) setHistorial(dh.historial);
    } finally { setCargandoDatos(false); }
  }

  const stats = useMemo(() => {
    const vista = agruparParaVista(clases);
    const usoSala = {};
    SALAS.forEach((s) => (usoSala[s] = 0));
    let horas = 0;
    const porDia = {};
    DIAS.forEach((d) => (porDia[d] = 0));
    const porCurso = {};
    vista.forEach((c) => {
      usoSala[c.sala] = (usoSala[c.sala] || 0) + 1;
      horas += c.duracion / 60;
      porDia[c.dia] = (porDia[c.dia] || 0) + 1;
      porCurso[c.codigo] = (porCurso[c.codigo] || 0) + 1;
    });
    const salaOrdenadas = Object.entries(usoSala).sort((a, b) => b[1] - a[1]);
    const cursoOrdenados = Object.entries(porCurso).sort((a, b) => b[1] - a[1]);
    const alertas = calcularAlertas(clases, feriados);
    const formaciones = calcularFormaciones(clases);
    const formacionesActivas = formaciones.filter((f) => f.estado === 'En proceso').length;
    const horasDisponiblesPorSala = 14.5 * 6; // ~8 a 22:30, 6 días/semana
    const utilizacion = Math.round((horas / (SALAS.length * horasDisponiblesPorSala)) * 100);
    return {
      clasesSemana: vista.length, horas, utilizacion, porSala: usoSala,
      salaTop: salaOrdenadas[0], salaMenos: salaOrdenadas[salaOrdenadas.length - 1],
      cursoOrdenados, porDia, formacionesActivas, alertasCount: alertas.length
    };
  }, [clases, feriados]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Análisis</h1>
      <p className="text-textSec text-sm mb-5">Métricas, uso de salas e historial de acciones.</p>

      {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : (
        <>
          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <StatCard n={stats.clasesSemana} l="Clases por semana" />
            <StatCard n={stats.horas.toFixed(1) + ' hs'} l="Horas de Zoom por semana" />
            <StatCard n={stats.utilizacion + '%'} l="Utilización de salas" />
            <StatCard n={stats.salaTop ? stats.salaTop[0] : '—'} l={`Sala más usada (${stats.salaTop ? stats.salaTop[1] : 0}/sem)`} />
            <StatCard n={stats.salaMenos ? stats.salaMenos[0] : '—'} l={`Sala menos usada (${stats.salaMenos ? stats.salaMenos[1] : 0}/sem)`} />
            <StatCard n={stats.formacionesActivas} l="Formaciones activas" />
            <StatCard n={postergaciones.length} l="Clases postergadas" acento={postergaciones.length > 0 ? 'warning' : undefined} />
            <StatCard n={stats.alertasCount} l="Conflictos" acento={stats.alertasCount > 0 ? 'danger' : undefined} />
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Uso de salas (clases/semana)</h2>
            <BarChart data={SALAS.map((s) => ({ label: s, valor: stats.porSala[s] || 0 }))} />
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Clases por día</h2>
            <BarChart data={DIAS.slice(0, 6).map((d) => ({ label: d.charAt(0) + d.slice(1).toLowerCase(), valor: stats.porDia[d] || 0 }))} />
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-3">Clases por formación</h2>
            <BarChart data={stats.cursoOrdenados.map(([c, v]) => ({ label: `${ICONOS[c] || ''} ${c}`, valor: v }))} />
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

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.valor || 0));
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-textSec w-20 shrink-0 truncate">{d.label}</span>
          <div className="flex-1 h-4 bg-bg border border-border rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accentPurple to-accentMagenta" style={{ width: `${((d.valor || 0) / max) * 100}%` }} />
          </div>
          <span className="text-xs text-textMuted w-6 text-right shrink-0">{d.valor || 0}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ n, l, acento }) {
  const color = { warning: 'text-warningText', danger: 'text-dangerText' }[acento] || 'text-accentTeal';
  return (
    <div className="bg-bg border border-border rounded-xl p-3.5">
      <div className={`text-xl font-extrabold ${color}`}>{n}</div>
      <div className="text-[11px] text-textSec mt-1">{l}</div>
    </div>
  );
}
