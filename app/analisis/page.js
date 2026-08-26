'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { SALAS, ICONOS, DIAS, agruparParaVista } from '../../lib/salasLogic';

export default function AnalisisPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  async function cargarDatos() {
    setCargandoDatos(true);
    try {
      const [rc, rh] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/historial')]);
      const [dc, dh] = await Promise.all([rc.json(), rh.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rh.ok) setHistorial(dh.historial);
    } finally { setCargandoDatos(false); }
  }

  const stats = useMemo(() => {
    const vista = agruparParaVista(clases);
    const usoSala = {};
    SALAS.forEach((s) => (usoSala[s] = 0));
    let horas = 0;
    vista.forEach((c) => { usoSala[c.sala] = (usoSala[c.sala] || 0) + 1; horas += c.duracion / 60; });
    const salaTop = Object.entries(usoSala).sort((a, b) => b[1] - a[1])[0];
    const clasesSemana = vista.filter((c) => DIAS.includes(c.dia)).length;
    const porCurso = {};
    vista.forEach((c) => { porCurso[c.codigo] = (porCurso[c.codigo] || 0) + 1; });
    const cursoTop = Object.entries(porCurso).sort((a, b) => b[1] - a[1])[0];
    return { salaTop, clasesSemana, horas, cursoTop };
  }, [clases]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">📊 Análisis</h1>
      <p className="text-textSec text-sm mb-5">Estadísticas generales e historial de acciones.</p>

      <div className="bg-surface2 border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-semibold mb-3">Estadísticas generales</h2>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
            <StatCard n={stats.salaTop ? stats.salaTop[0] : '—'} l={`Sala más usada (${stats.salaTop ? stats.salaTop[1] : 0} clases/sem)`} />
            <StatCard n={stats.clasesSemana} l="Promedio semanal de clases" />
            <StatCard n={stats.horas.toFixed(1) + ' hs'} l="Horas de Zoom por semana" />
            <StatCard n={stats.cursoTop ? `${ICONOS[stats.cursoTop[0]] || ''} ${stats.cursoTop[0]}` : '—'} l={`Curso con más actividad (${stats.cursoTop ? stats.cursoTop[1] : 0}/sem)`} />
          </div>
        )}
      </div>

      <div className="bg-surface2 border border-border rounded-2xl p-5">
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
    </div>
  );
}

function StatCard({ n, l }) {
  return (
    <div className="bg-bg border border-border rounded-xl p-3.5">
      <div className="text-xl font-extrabold text-accentTeal">{n}</div>
      <div className="text-[11px] text-textSec mt-1">{l}</div>
    </div>
  );
}
