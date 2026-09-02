'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta } from '../../lib/salasLogic';
import { INFO_TECNICA_DEFAULT } from '../../lib/infoTecnicaDefaults';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

const CAMPOS_VACIOS = {
  nombre: '', formato: '', mes: '', fecha: '', disertante: '', horario: '',
  formularioInscripcion: '', salaZoom: '', linkAcceso: '', moderador: ''
};

export default function InfoTecnicaPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin', 'Educativo'].includes(r));

  const [items, setItems] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);
  const [nuevo, setNuevo] = useState(CAMPOS_VACIOS);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  useEffect(() => { if (usuario) cargar(); }, [usuario]);

  async function cargar() {
    setCargandoDatos(true);
    setError(null);
    try {
      const res = await fetchAutenticado('/api/info-tecnica');
      const data = await res.json();
      if (res.ok) setItems(data.items); else setError(data.error);
    } catch (err) {
      setError('Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.'));
    } finally {
      setCargandoDatos(false);
    }
  }

  // Los 9 registros que Diego pasó están siempre disponibles acá en el código — no
  // dependen de que se hayan importado bien al Sheet. Lo que se agregue desde la app
  // se suma aparte, sin duplicar lo fijo (mismo criterio que Campañas/Enlaces de CM).
  const itemsCombinados = useMemo(() => {
    const nombresSheet = new Set(items.map((i) => i.nombre));
    const fijos = INFO_TECNICA_DEFAULT.filter((i) => !nombresSheet.has(i.nombre)).map((i, idx) => ({ ...i, id: `fijo-it-${idx}`, esFijo: true }));
    return [...fijos, ...items];
  }, [items]);

  async function agregar() {
    setMsg(null);
    if (!nuevo.nombre.trim()) { setMsg({ tipo: 'error', texto: 'Escribí el nombre de la actividad.' }); return; }
    setGuardando(true);
    try {
      const res = await fetchAutenticado('/api/info-tecnica', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo)
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Guardado.' });
      setNuevo(CAMPOS_VACIOS);
      cargar();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setGuardando(false);
    }
  }

  const ordenados = [...itemsCombinados].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1300px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Clases especiales / Información técnica</h1>
      <p className="text-textSec text-sm mb-4">
        Masterclass, Auditorio, Caja de ideas y demás — con su disertante, horario, formulario e info de Zoom.
        {!puedeEditar && ' Solo podés ver — la edición está reservada.'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Nuevo registro</h2>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
            <div className="lg:col-span-2"><label className={labelCls}>Nombre</label><input value={nuevo.nombre} onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Formato</label><input value={nuevo.formato} onChange={(e) => setNuevo((p) => ({ ...p, formato: e.target.value }))} placeholder="Masterclass, Auditorio…" className={inputCls} /></div>
            <div><label className={labelCls}>Mes</label><input value={nuevo.mes} onChange={(e) => setNuevo((p) => ({ ...p, mes: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
            <div><label className={labelCls}>Fecha</label><input type="date" value={nuevo.fecha} onChange={(e) => setNuevo((p) => ({ ...p, fecha: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Disertante</label><input value={nuevo.disertante} onChange={(e) => setNuevo((p) => ({ ...p, disertante: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Horario</label><input value={nuevo.horario} onChange={(e) => setNuevo((p) => ({ ...p, horario: e.target.value }))} placeholder="20:00 a 21:15" className={inputCls} /></div>
            <div><label className={labelCls}>Sala Zoom</label><input value={nuevo.salaZoom} onChange={(e) => setNuevo((p) => ({ ...p, salaZoom: e.target.value }))} className={inputCls} /></div>
          </div>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))' }}>
            <div><label className={labelCls}>Formulario de inscripción</label><input value={nuevo.formularioInscripcion} onChange={(e) => setNuevo((p) => ({ ...p, formularioInscripcion: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Link de acceso (Zoom)</label><input value={nuevo.linkAcceso} onChange={(e) => setNuevo((p) => ({ ...p, linkAcceso: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>Moderador</label><input value={nuevo.moderador} onChange={(e) => setNuevo((p) => ({ ...p, moderador: e.target.value }))} className={inputCls} /></div>
          </div>
          <button className={btnCls} disabled={guardando} onClick={agregar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Registros ({ordenados.length})</h2>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : ordenados.length === 0 ? (
          <p className="text-textSec text-sm">Todavía no hay nada cargado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ordenados.map((it) => (
              <div key={it.id} onClick={() => puedeEditar && !it.esFijo && setSeleccionado(it)} className={`bg-bg border border-border rounded-lg p-3 ${puedeEditar && !it.esFijo ? 'cursor-pointer' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{it.nombre}</p>
                  <span className="text-xs text-textMuted shrink-0">{it.mes} · {formatFechaCorta(it.fecha)}</span>
                </div>
                <p className="text-xs text-textSec mt-1">
                  {it.formato && <>{it.formato} · </>}
                  {it.disertante && <>Disertante: {it.disertante} · </>}
                  {it.horario}
                </p>
                <p className="text-xs text-textSec mt-0.5">
                  {it.salaZoom && <>{it.salaZoom} · </>}
                  {it.moderador && <>Moderador: {it.moderador}</>}
                </p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  {it.formularioInscripcion && <a href={it.formularioInscripcion} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-infoText hover:underline">Formulario de inscripción</a>}
                  {it.linkAcceso && <a href={it.linkAcceso} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-infoText hover:underline">Link de acceso</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {seleccionado && (
        <ModalEditar item={seleccionado} onCerrar={() => setSeleccionado(null)} fetchAutenticado={fetchAutenticado} onCambio={cargar} />
      )}
    </div>
  );
}

function ModalEditar({ item, onCerrar, fetchAutenticado, onCambio }) {
  const [campos, setCampos] = useState({ ...CAMPOS_VACIOS, ...item });
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [err, setErr] = useState('');

  function set(campo, valor) { setCampos((p) => ({ ...p, [campo]: valor })); }

  async function guardar() {
    setErr(''); setGuardando(true);
    try {
      const res = await fetchAutenticado(`/api/info-tecnica/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos)
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (e) {
      setErr('Error de conexión: ' + (e.message || 'no se pudo contactar al servidor.'));
    } finally {
      setGuardando(false);
    }
  }
  async function eliminar() {
    setErr(''); setEliminando(true);
    try {
      const res = await fetchAutenticado(`/api/info-tecnica/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setErr(data.error); return; }
      onCambio(); onCerrar();
    } catch (e) {
      setErr('Error de conexión: ' + (e.message || 'no se pudo contactar al servidor.'));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-[420px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Editar registro</h3>
        {err && <p className="text-dangerText text-xs mb-2.5">{err}</p>}

        {!confirmarEliminar ? (
          <>
            <label className={labelCls}>Nombre</label><input value={campos.nombre} onChange={(e) => set('nombre', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Formato</label><input value={campos.formato} onChange={(e) => set('formato', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Mes</label><input value={campos.mes} onChange={(e) => set('mes', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Fecha</label><input type="date" value={campos.fecha} onChange={(e) => set('fecha', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Disertante</label><input value={campos.disertante} onChange={(e) => set('disertante', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Horario</label><input value={campos.horario} onChange={(e) => set('horario', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Formulario de inscripción</label><input value={campos.formularioInscripcion} onChange={(e) => set('formularioInscripcion', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Sala Zoom</label><input value={campos.salaZoom} onChange={(e) => set('salaZoom', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Link de acceso</label><input value={campos.linkAcceso} onChange={(e) => set('linkAcceso', e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Moderador</label><input value={campos.moderador} onChange={(e) => set('moderador', e.target.value)} className={`${inputCls} mb-3`} />
            <div className="flex gap-2 flex-wrap">
              <button className={btnSecCls} onClick={onCerrar}>Cerrar</button>
              <button className={`${btnSecCls} text-dangerText`} onClick={() => setConfirmarEliminar(true)}>Eliminar</button>
              <button className={btnCls} disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </>
        ) : (
          <div>
            <p className="text-sm mb-3">¿Seguro que querés eliminar este registro? No se puede deshacer.</p>
            <div className="flex gap-2">
              <button className={btnSecCls} onClick={() => setConfirmarEliminar(false)}>Volver</button>
              <button className="bg-dangerText text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60" disabled={eliminando} onClick={eliminar}>
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
