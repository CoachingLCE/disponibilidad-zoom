'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { ICONOS, NOMBRES, formatFechaCorta, calcularFormaciones } from '../../lib/salasLogic';

export default function FormacionesPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [clases, setClases] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    const res = await fetchAutenticado('/api/clases');
    const data = await res.json();
    if (res.ok) setClases(data.clases);
    setCargandoDatos(false);
  }

  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">🎓 Formaciones</h1>
      <p className="text-textSec text-sm mb-5">Estado, fechas y progreso de cada edición.</p>

      <div className="bg-surface2 border border-border rounded-2xl p-5">
        {cargandoDatos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : formaciones.length === 0 ? (
          <p className="text-textSec text-sm">Todavía no hay formaciones con fechas cargadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-2">Formación</th><th className="p-2">Fecha inicio</th><th className="p-2">Fecha final</th>
                  <th className="p-2">Estado</th><th className="p-2">Progreso</th><th className="p-2">Próxima clase</th>
                </tr>
              </thead>
              <tbody>
                {formaciones.map((f) => (
                  <tr key={f.codigo + f.edicion} className="border-b border-border">
                    <td className="p-2 font-semibold">{ICONOS[f.codigo] || ''} {f.codigo} {f.edicion}</td>
                    <td className="p-2">{formatFechaCorta(f.fechaInicio)}</td>
                    <td className="p-2">{formatFechaCorta(f.fechaFinal)}</td>
                    <td className="p-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${f.estado === 'Finalizó' ? 'bg-dangerBg text-dangerText' : 'bg-successBg text-successText'}`}>
                        {f.estado}
                      </span>
                    </td>
                    <td className="p-2">
                      {f.pct != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-bg border border-border rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-accentPurple to-accentMagenta" style={{ width: f.pct + '%' }} />
                          </div>
                          <span className="text-textSec">{f.cargadas}/{f.total}</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="p-2">{f.proximaTxt}</td>
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
