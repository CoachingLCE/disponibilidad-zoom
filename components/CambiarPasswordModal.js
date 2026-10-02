'use client';
import { useState } from 'react';
import { useSession } from '../lib/useSession';

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

// Pedido de Diego ("AGREGAR LOS OJITOS"): botón de mostrar/ocultar para cada campo de
// contraseña, igual al ícono de ojo que ya se usa en la mayoría de los formularios de
// login — acá no existía todavía, así que no había forma de revisar lo que se tipeó antes
// de guardar.
function BotonOjo({ visible, onClick }) {
  return (
    <button
      type="button" onClick={onClick} tabIndex={-1}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted hover:text-text"
      title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
    >
      {visible ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6 0 9.5 5.5 9.5 7a10.9 10.9 0 0 1-2.1 2.9M6.6 6.6C4 8.3 2.5 10.9 2.5 12c0 1.5 3.5 7 9.5 7 1.4 0 2.7-.3 3.9-.8" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
          <circle cx="12" cy="12" r="2.75" />
        </svg>
      )}
    </button>
  );
}

export default function CambiarPasswordModal({ onCerrar }) {
  const { fetchAutenticado } = useSession();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setMsg(null);
    if (passwordNueva.length < 8) { setMsg({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 8 caracteres.' }); return; }
    if (passwordNueva !== confirmar) { setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' }); return; }
    setCargando(true);
    try {
      const res = await fetchAutenticado('/api/auth/cambiar-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordActual, passwordNueva })
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ tipo: 'error', texto: data.error }); return; }
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada.' });
      setPasswordActual(''); setPasswordNueva(''); setConfirmar('');
    } catch (err) {
      setMsg({ tipo: 'error', texto: 'Error de conexión: ' + (err.message || 'no se pudo contactar al servidor.') });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCerrar}>
      <div className="bg-surface2 border border-border rounded-2xl p-5 w-80" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-3">Cambiar mi contraseña</h3>
        <form onSubmit={guardar}>
          <label className="text-xs text-textSec block mb-1">Contraseña actual (si ya tenías una)</label>
          <div className="relative mb-3">
            <input type={verActual ? 'text' : 'password'} value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={`${inputCls} pr-8`} />
            <BotonOjo visible={verActual} onClick={() => setVerActual((v) => !v)} />
          </div>
          <label className="text-xs text-textSec block mb-1">Contraseña nueva (mínimo 8 caracteres)</label>
          <div className="relative mb-3">
            <input type={verNueva ? 'text' : 'password'} value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} className={`${inputCls} pr-8`} />
            <BotonOjo visible={verNueva} onClick={() => setVerNueva((v) => !v)} />
          </div>
          <label className="text-xs text-textSec block mb-1">Confirmar contraseña nueva</label>
          <div className="relative mb-3">
            <input type={verConfirmar ? 'text' : 'password'} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={`${inputCls} pr-8`} />
            <BotonOjo visible={verConfirmar} onClick={() => setVerConfirmar((v) => !v)} />
          </div>
          {msg && <p className={`text-xs mb-3 ${msg.tipo === 'error' ? 'text-dangerText' : 'text-successText'}`}>{msg.texto}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnSecCls} onClick={onCerrar}>Cerrar</button>
            <button type="submit" className={btnCls} disabled={cargando}>{cargando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
