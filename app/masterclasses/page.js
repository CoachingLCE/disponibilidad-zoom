'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta, toISO, colorPorSala } from '../../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';
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
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin', 'Educativo'].includes(r));

  const [masterclasses, setMasterclasses] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('recientes');
  const [seleccionada, setSeleccionada] = useState(null);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const r = await fetchAutenticado('/api/masterclasses');
      const d = await r.json();
      if (r.ok) setMasterclasses(d.masterclasses);
      else setError(d.error);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  const categorias = useMemo(() => [...new Set(masterclasses.map((m) => m.categoria))].filter(Boolean).sort(), [masterclasses]);

  // Se usa la fecha LOCAL del navegador (no toISOString, que da la fecha en UTC y puede
  // adelantarse un día entero en Argentina desde las 21:00 en adelante — el mismo bug que
  // hacía aparecer clases como "finalizada" antes de tiempo en Inicio).
  const hoyISO = toISO(new Date());

  const filtradas = useMemo(() => {
    let out = masterclasses;
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
  }, [masterclasses, filtroCategoria, busqueda, orden]);

  const proximas = filtradas.filter((m) => m.fecha && m.fecha >= hoyISO).length;

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Masterclasses</h1>
      <p className="text-textSec text-sm mb-4">
        Historial completo — {masterclasses.length} registrados, {proximas} todavía por venir.
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

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
          {puedeEditar && (
            <button
              className={`${btnCls} ml-auto`}
              onClick={() => setSeleccionada({ nueva: true, fecha: '', dia: '', horario: '', tema: '', docente: '', categoria: 'Masterclass', sala: '', mod: '', observaciones: '' })}
            >
              + Agregar masterclass
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button className={chipCls(filtroCategoria === '')} onClick={() => setFiltroCategoria('')}>Todas ({masterclasses.length})</button>
          {categorias.map((c) => (
            <button key={c} className={chipCls(filtroCategoria === c)} onClick={() => setFiltroCategoria(c)}>
              {c} ({masterclasses.filter((m) => m.categoria === c).length})
            </button>
          ))}
        </div>

        {cargandoDatos ? (
          <p className="text-textSec text-sm">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <p className="text-textSec text-sm">No hay masterclasses que coincidan con la búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-textSec text-left">
                  <th className="p-1.5">Fecha</th><th className="p-1.5">Día</th><th className="p-1.5">Horario</th>
                  <th className="p-1.5">Tema</th><th className="p-1.5">Docente</th><th className="p-1.5">Sala</th><th className="p-1.5">Moderador/a</th><th className="p-1.5">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((m) => {
                  const esFutura = m.fecha && m.fecha >= hoyISO;
                  const colorSala = m.sala ? colorPorSala(m.sala) : null;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSeleccionada(m)}
                      // Pedido de Diego: las que todavía no pasaron tienen que verse con un
                      // color bien visible (antes era un tinte verde muy sutil) — ahora
                      // llevan además un borde izquierdo de color, igual que el resto de la
                      // app marca lo "vigente" (ver .fila-masterclass-proxima en globals.css).
                      className={`border-b border-border cursor-pointer hover:bg-bg ${esFutura ? 'fila-masterclass-proxima' : 'text-textMuted opacity-70'}`}
                    >
                      <td className="p-1.5 whitespace-nowrap">{formatFechaCorta(m.fecha)}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.dia || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.horario || '—'}</td>
                      <td className="p-1.5 min-w-[220px]">{m.tema || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">{m.docente || '—'}</td>
                      <td className="p-1.5 whitespace-nowrap">
                        {m.sala ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${colorSala.dot} shrink-0`} />
                            <span className={colorSala.text}>{m.sala}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-1.5 whitespace-nowrap">{m.mod || '—'}</td>
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
        {puedeEditar ? 'Hacé clic en una fila para editarla, o usá "+ Agregar masterclass" para sumar una nueva.' : 'Hacé clic en una fila para ver el detalle completo.'}
      </p>

      {seleccionada && (
        <ModalMasterclass
          item={seleccionada}
          puedeEditar={puedeEditar}
          onCerrar={() => setSeleccionada(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}

function ModalMasterclass({ item, puedeEditar, onCerrar, onGuardado }) {
  const { fetchAutenticado } = useSession();
  const esNueva = !!item.nueva;
  const [editando, setEditando] = useState(esNueva);
  const [campos, setCampos] = useState({
    fecha: item.fecha || '', dia: item.dia || '', horario: item.horario || '', tema: item.tema || '',
    docente: item.docente || '', categoria: item.categoria || 'Masterclass', sala: item.sala || '',
    mod: item.mod || '', observaciones: item.observaciones || ''
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function set(campo, valor) { setCampos((c) => ({ ...c, [campo]: valor })); }

  async function guardar() {
    setGuardando(true); setError('');
    try {
      const r = esNueva
        ? await fetchAutenticado('/api/masterclasses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos) })
        : await fetchAutenticado(`/api/masterclasses/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'No se pudo guardar.'); return; }
      onCerrar();
      if (onGuardado) await onGuardado();
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
    setGuardando(true); setError('');
    try {
      const r = await fetchAutenticado(`/api/masterclasses/${item.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || 'No se pudo eliminar.'); return; }
      onCerrar();
      if (onGuardado) await onGuardado();
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-[480px] max-w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">{esNueva ? 'Agregar masterclass' : (editando ? 'Editar masterclass' : item.tema || item.categoria)}</h3>

        {editando ? (
          <div className="space-y-2.5 mb-3">
            <div><label className={labelCls}>Fecha</label><input type="date" value={campos.fecha} onChange={(e) => set('fecha', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Día</label><input value={campos.dia} onChange={(e) => set('dia', e.target.value)} placeholder="Viernes" className={inputCls} /></div>
            <div><label className={labelCls}>Horario</label><input value={campos.horario} onChange={(e) => set('horario', e.target.value)} placeholder="20:00 a 21:15" className={inputCls} /></div>
            <div><label className={labelCls}>Tema</label><input value={campos.tema} onChange={(e) => set('tema', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Docente</label><input value={campos.docente} onChange={(e) => set('docente', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Categoría</label><input value={campos.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Masterclass" className={inputCls} /></div>
            <div><label className={labelCls}>Sala</label><input value={campos.sala} onChange={(e) => set('sala', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Moderador/a</label><input value={campos.mod} onChange={(e) => set('mod', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Observaciones</label><input value={campos.observaciones} onChange={(e) => set('observaciones', e.target.value)} className={inputCls} /></div>
          </div>
        ) : (
          <div className="space-y-1.5 text-sm mb-3">
            <Fila label="Fecha" valor={formatFechaCorta(item.fecha)} />
            <Fila label="Día" valor={item.dia || '—'} />
            <Fila label="Horario" valor={item.horario || '—'} />
            <Fila label="Docente" valor={item.docente || '—'} />
            <Fila label="Categoría" valor={item.categoria || '—'} />
            <Fila
              label="Sala"
              valor={item.sala ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${colorPorSala(item.sala).dot} shrink-0`} />
                  <span className={colorPorSala(item.sala).text}>{item.sala}</span>
                </span>
              ) : '—'}
            />
            <Fila label="Moderador/a" valor={item.mod || '—'} />
            <Fila label="Observaciones" valor={item.observaciones || '—'} />
          </div>
        )}

        {error && <p className="text-dangerText text-xs mb-2.5">{error}</p>}

        <div className="flex gap-2 flex-wrap">
          {editando ? (
            <>
              <button className={btnCls} onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              {!esNueva && <button className={btnSecCls} onClick={() => setEditando(false)} disabled={guardando}>Cancelar</button>}
            </>
          ) : (
            puedeEditar && <button className={btnSecCls} onClick={() => setEditando(true)}>✏️ Editar</button>
          )}
          {!esNueva && puedeEditar && !editando && (
            <button className="bg-transparent text-dangerText border border-dangerText/40 rounded-lg px-3 py-1.5 text-xs" onClick={eliminar} disabled={guardando}>Eliminar</button>
          )}
          <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function Fila({ label, valor }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-textMuted">{label}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}
