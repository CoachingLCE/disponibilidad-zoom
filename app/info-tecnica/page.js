'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';
import { formatFechaCorta } from '../../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';
const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const labelCls = 'text-xs text-textSec block mb-1 font-semibold';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-2.5 py-1.5 text-xs';

export default function InfoTecnicaPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin', 'Educativo'].includes(r));

  const [items, setItems] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [error, setError] = useState(null);
  const [seleccionado, setSeleccionado] = useState(null);

  const [fecha, setFecha] = useState('');
  const [nombreActividad, setNombreActividad] = useState('');
  const [linkZoom, setLinkZoom] = useState('');
  const [grabacion, setGrabacion] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [responsable, setResponsable] = useState('');
  const [obs, setObs] = useState('');
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

  async function agregar() {
    setMsg(null);
    if (!nombreActividad.trim()) { setMsg({ tipo: 'error', texto: 'Escribí el nombre de la actividad.' }); return; }
    setGuardando(true);
    try {
      const res = await fetchAutenticado('/api/info-tecnica', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, nombreActividad, linkZoom, grabacion, plataforma, responsable, observaciones: obs })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Guardado.' });
      setNombreActividad(''); setLinkZoom(''); setGrabacion(''); setPlataforma(''); setResponsable(''); setObs('');
      cargar();
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setGuardando(false);
    }
  }

  const ordenados = [...items].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Clases especiales / Información técnica</h1>
      <p className="text-textSec text-sm mb-4">
        Datos técnicos de clases especiales: link de Zoom, grabación, plataforma, responsable.
        {!puedeEditar && ' Solo podés ver — la edición está reservada.'}
      </p>
      {error && <div className="bg-dangerBg text-dangerText rounded-lg px-4 py-3 text-sm mb-4">{error}</div>}

      {puedeEditar && (
        <div className={boxCls}>
          <h2 className="text-sm font-semibold mb-3">Nuevo registro</h2>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))' }}>
            <div><label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Actividad</label><input value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Plataforma</label><input value={plataforma} onChange={(e) => setPlataforma(e.target.value)} placeholder="Zoom, Meet, etc." className={inputCls} /></div>
            <div><label className={labelCls}>Responsable</label><input value={responsable} onChange={(e) => setResponsable(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))' }}>
            <div><label className={labelCls}>Link de Zoom</label><input value={linkZoom} onChange={(e) => setLinkZoom(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Link de grabación</label><input value={grabacion} onChange={(e) => setGrabacion(e.target.value)} className={inputCls} /></div>
          </div>
          <div className="mb-3"><label className={labelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={inputCls} /></div>
          <button className={btnCls} disabled={guardando} onClick={agregar}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          {msg && <p className={`text-xs mt-2.5 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
        </div>
      )}

      <div className={boxCls}>
        <h2 className="text-sm font-semibold mb-3">Registros</h2>
        {cargandoDatos ? <p className="text-textSec text-sm">Cargando…</p> : ordenados.length === 0 ? (
          <p className="text-textSec text-sm">Todavía no hay nada cargado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ordenados.map((it) => (
              <div key={it.id} onClick={() => puedeEditar && setSeleccionado(it)} className={`bg-bg border border-border rounded-lg p-3 ${puedeEditar ? 'cursor-pointer' : ''}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{it.nombreActividad}</p>
                  <span className="text-xs text-textMuted">{formatFechaCorta(it.fecha)}</span>
                </div>
                <p className="text-xs text-textSec mt-1">
                  {it.plataforma && <>Plataforma: {it.plataforma} · </>}
                  {it.responsable && <>Responsable: {it.responsable}</>}
                </p>
                {it.linkZoom && <p className="text-xs text-infoText mt-0.5 truncate">Zoom: {it.linkZoom}</p>}
                {it.grabacion && <p className="text-xs text-infoText mt-0.5 truncate">Grabación: {it.grabacion}</p>}
                {it.observaciones && <p className="text-xs text-textMuted mt-1">{it.observaciones}</p>}
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
  const [fecha, setFecha] = useState(item.fecha);
  const [nombreActividad, setNombreActividad] = useState(item.nombreActividad);
  const [linkZoom, setLinkZoom] = useState(item.linkZoom);
  const [grabacion, setGrabacion] = useState(item.grabacion);
  const [plataforma, setPlataforma] = useState(item.plataforma);
  const [responsable, setResponsable] = useState(item.responsable);
  const [obs, setObs] = useState(item.observaciones);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [err, setErr] = useState('');

  async function guardar() {
    setErr(''); setGuardando(true);
    try {
      const res = await fetchAutenticado(`/api/info-tecnica/${encodeURIComponent(item.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, nombreActividad, linkZoom, grabacion, plataforma, responsable, observaciones: obs })
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
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-96" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Editar registro</h3>
        {err && <p className="text-dangerText text-xs mb-2.5">{err}</p>}

        {!confirmarEliminar ? (
          <>
            <label className={labelCls}>Fecha</label><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Actividad</label><input value={nombreActividad} onChange={(e) => setNombreActividad(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Plataforma</label><input value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Responsable</label><input value={responsable} onChange={(e) => setResponsable(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Link de Zoom</label><input value={linkZoom} onChange={(e) => setLinkZoom(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Link de grabación</label><input value={grabacion} onChange={(e) => setGrabacion(e.target.value)} className={`${inputCls} mb-2.5`} />
            <label className={labelCls}>Observaciones</label><input value={obs} onChange={(e) => setObs(e.target.value)} className={`${inputCls} mb-3`} />
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
