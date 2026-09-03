'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { CREDENCIALES_ZOOM_DEFAULT } from '../../lib/credencialesZoomDefaults';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';

export default function CredencialesZoomPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [credenciales, setCredenciales] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    try {
      const res = await fetchAutenticado('/api/credenciales-zoom');
      const data = await res.json();
      if (res.ok) setCredenciales(data.credenciales);
    } catch {
      // silencioso: si falla, igual se ven las fijas de abajo
    } finally {
      setCargandoDatos(false);
    }
  }

  // Las 8 credenciales que Diego pasó están siempre disponibles acá en el código — no
  // dependen de que se hayan cargado bien en el Sheet. Si en algún momento se agrega o
  // corrige una sala desde la pestaña CredencialesZoom del Sheet, esa versión pisa a la
  // fija (mismo criterio que Campañas/Enlaces/Docentes C.O).
  const combinadas = useMemo(() => {
    const salasSheet = new Set(credenciales.map((c) => c.sala));
    const fijas = CREDENCIALES_ZOOM_DEFAULT.filter((c) => !salasSheet.has(c.sala));
    return [...credenciales, ...fijas].sort((a, b) => a.sala.localeCompare(b.sala, 'es', { numeric: true }));
  }, [credenciales]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[900px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Credenciales de las salas de Zoom</h1>
      <p className="text-textSec text-sm mb-4">Usuario y contraseña de cada sala, para entrar directo cuando haga falta.</p>

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <div className={boxCls}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-2">Sala</th><th className="p-2">Usuario</th><th className="p-2">Contraseña</th>
                </tr>
              </thead>
              <tbody>
                {combinadas.map((c) => (
                  <tr key={c.sala} className="border-b border-border">
                    <td className="p-2 font-semibold">{c.sala}</td>
                    <td className="p-2">{c.usuario}</td>
                    <td className="p-2 font-mono">{c.contrasena}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-textMuted">
        Si cambia alguna contraseña, avisale a un Admin/SuperAdmin para que la actualice en la pestaña "CredencialesZoom" del Google Sheet.
      </p>
    </div>
  );
}
