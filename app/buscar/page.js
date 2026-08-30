'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { NOMBRES, ICONOS, minutosAHora, formatFechaCorta, agruparParaVista, calcularFormaciones } from '../../lib/salasLogic';

export default function BuscarPage() {
  return (
    <Suspense fallback={null}>
      <BuscarContenido />
    </Suspense>
  );
}

function BuscarContenido() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [clases, setClases] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    try {
      const [rc, ra] = await Promise.all([fetchAutenticado('/api/clases'), fetchAutenticado('/api/actividades')]);
      const [dc, da] = await Promise.all([rc.json(), ra.json()]);
      if (rc.ok) setClases(dc.clases);
      if (ra.ok) setActividades(da.actividades);
    } finally { setCargandoDatos(false); }
  }

  const vista = useMemo(() => agruparParaVista(clases), [clases]);
  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  const resultados = useMemo(() => {
    const termino = q.trim().toLowerCase();
    if (!termino) return [];

    const deFormaciones = formaciones
      .filter((f) => `${f.codigo} ${f.edicion} ${NOMBRES[f.codigo] || ''}`.toLowerCase().includes(termino))
      .map((f) => ({
        tipo: 'Formación', label: `${ICONOS[f.codigo] || ''} ${f.codigo} ${f.edicion}`,
        sub: NOMBRES[f.codigo], detalle: `${f.estado} · ${f.proximaTxt}`
      }));

    const deClases = vista
      .filter((c) => `${c.codigo} ${c.edicion} ${c.sala} ${NOMBRES[c.codigo] || ''}`.toLowerCase().includes(termino))
      .map((c) => ({
        tipo: 'Clase', label: `${c.label}${c.edicion ? ' · Ed. ' + c.edicion : ''}`,
        sub: c.sala, detalle: `${c.dia} ${minutosAHora(c.horaMin)}`
      }));

    const deSalas = ['Sala 1', 'Sala 2', 'Sala 3', 'Sala 4', 'Sala 5', 'Sala 6', 'Sala 7', 'Comunidad ILCE']
      .filter((s) => s.toLowerCase().includes(termino))
      .map((s) => {
        const clasesEnSala = vista.filter((c) => c.sala === s);
        return { tipo: 'Sala', label: s, sub: `${clasesEnSala.length} clase(s)/semana`, detalle: '' };
      });

    const deActividades = actividades
      .filter((a) => `${a.tipo} ${a.nombreCurso} ${a.curso}`.toLowerCase().includes(termino))
      .slice(0, 15)
      .map((a) => ({
        tipo: a.tipo, label: a.nombreCurso || a.tipo, sub: formatFechaCorta(a.fecha),
        detalle: a.horaMin != null ? minutosAHora(a.horaMin) : ''
      }));

    return [...deFormaciones, ...deClases, ...deSalas, ...deActividades];
  }, [q, vista, formaciones, actividades]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Buscar</h1>
      <p className="text-textSec text-sm mb-5">Curso, edición, formación, sala o clase — por ejemplo "CO 43" o "Sala 2".</p>

      <input
        type="text" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
        placeholder="Buscar…"
        className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm mb-5"
      />

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : !q.trim() ? (
        <p className="text-textMuted text-sm">Empezá a escribir para buscar.</p>
      ) : resultados.length === 0 ? (
        <p className="text-textSec text-sm">Sin resultados para "{q}".</p>
      ) : (
        <div className="flex flex-col gap-2">
          {resultados.map((r, i) => (
            <div key={i} className="bg-surface2 border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-textMuted uppercase">{r.tipo}</span>
                  <span className="text-sm font-medium truncate">{r.label}</span>
                </div>
                {r.sub && <div className="text-xs text-textSec mt-0.5">{r.sub}</div>}
              </div>
              {r.detalle && <span className="text-xs text-textMuted shrink-0">{r.detalle}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
