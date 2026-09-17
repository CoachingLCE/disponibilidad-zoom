'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta } from '../../lib/salasLogic';
import { MASTERCLASSES_HISTORICO } from '../../lib/masterclassesHistorico';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const chipCls = (activo) => `text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${activo ? 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white border-transparent' : 'bg-transparent text-textSec border-border'}`;

const CATEGORIA_COLOR = {
  Masterclass: 'bg-accentPurple/10 text-accentPurple',
  'Caja de ideas': 'bg-successText/10 text-successText',
  Capacitación: 'bg-infoText/10 text-infoText',
  Networking: 'bg-warningText/10 text-warningText',
  Supervisión: 'bg-orange-400/10 text-orange-400',
  Auditorio: 'bg-pink-400/10 text-pink-400'
};

export default function MasterclassesPage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes');

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);

  const categorias = useMemo(() => [...new Set(MASTERCLASSES_HISTORICO.map((m) => m.categoria))].sort(), []);

  const hoyISO = new Date().toISOString().slice(0, 10);

  const filtradas = useMemo(() => {
    let out = MASTERCLASSES_HISTORICO;
    if (filtroCategoria) out = out.filter((m) => m.categoria === filtroCategoria);
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      out = out.filter((m) =>
        (m.tema || '').toLowerCase().includes(q) ||
        (m.docente || '').toLowerCase().includes(q) ||
        (m.sala || '').toLowerCase().includes(q)
      );
    }
    const ordenado = [...out].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    return orden === 'recientes' ? ordenado.reverse() : ordenado;
  }, [filtroCategoria, busqueda, orden]);

  const proximas = filtradas.filter((m) => m.fecha && m.fecha >= hoyISO).length;

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Masterclasses</h1>
      <p className="text-textSec text-sm mb-4">
        Historial completo — {MASTERCLASSES_HISTORICO.length} registrados, {proximas} todavía por venir.
      </p>

      <div className={boxCls}>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por tema, docente o sala…"
            className={`${inputCls} max-w-xs`}
          />
          <select value={orden} onChange={(e) => setOrden(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="recientes">Más recientes primero</option>
            <option value="antiguas">Más antiguas primero</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button className={chipCls(filtroCategoria === '')} onClick={() => setFiltroCategoria('')}>Todas ({MASTERCLASSES_HISTORICO.length})</button>
          {categorias.map((c) => (
            <button key={c} className={chipCls(filtroCategoria === c)} onClick={() => setFiltroCategoria(c)}>
              {c} ({MASTERCLASSES_HISTORICO.filter((m) => m.categoria === c).length})
            </button>
          ))}
        </div>

        {filtradas.length === 0 ? (
          <p className="text-textSec text-sm">No hay masterclasses que coincidan con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Fecha</th><th className="p-1.5">Día</th><th className="p-1.5">Horario</th>
                  <th className="p-1.5">Tema</th><th className="p-1.5">Docente</th><th className="p-1.5">Sala / Mod.</th><th className="p-1.5">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((m, i) => {
                  const esFutura = m.fecha && m.fecha >= hoyISO;
                  return (
                    <tr key={i} className={`border-b border-border ${esFutura ? 'bg-successBg/10' : ''}`}>
                      <td className="p-1.5 whitespace-nowrap">{formatFechaCorta(m.fecha)}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.dia || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.horario || '—'}</td>
                      <td className="p-1.5 min-w-[220px]">{m.tema || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.docente || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.sala ? `${m.sala}${m.mod ? ' · ' + m.mod : ''}` : '—'}</td>
                      <td className="p-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORIA_COLOR[m.categoria] || 'bg-surface2 text-textMuted'}`}>
                          {m.categoria}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-textMuted">
        Cargado desde la planilla histórica — para sumar una masterclass nueva, avisale a un Admin para que la agregue acá o desde Salas Zoom ("Agregar actividad", tipo Masterclass).
      </p>
    </div>
  );
}
