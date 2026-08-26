'use client';
import { useState } from 'react';

export default function SetupPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMensaje(null);
    setCargando(true);
    try {
      const res = await fetch('/api/auth/bootstrap-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, bootstrapKey })
      });
      const data = await res.json();
      if (!res.ok) {
        setMensaje({ tipo: 'error', texto: data.error || 'Algo salió mal.' });
      } else {
        setMensaje({ tipo: 'ok', texto: 'Contraseña asignada. Ya podés ir a /login y entrar.' });
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error de conexión.' });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 96, padding: '0 24px' }}>
      <div style={{ width: 360, background: '#1a222c', border: '1px solid #2c3947', borderRadius: 16, padding: 28 }}>
        <h2 style={{ textAlign: 'center', fontSize: 17, fontWeight: 650, marginBottom: 4, color: '#e8edf2' }}>
          Asignar primera contraseña
        </h2>
        <p style={{ textAlign: 'center', color: '#93a3b3', fontSize: 12.5, marginBottom: 20 }}>
          Solo funciona para un usuario que todavía no tiene contraseña asignada en el Sheet.
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Tu email (tal cual está en la pestaña Usuarios)</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8, padding: '9px 10px', fontSize: 13.5, color: '#e8edf2', marginBottom: 12 }}
          />
          <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Nueva contraseña (mínimo 8 caracteres)</label>
          <input
            type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8, padding: '9px 10px', fontSize: 13.5, color: '#e8edf2', marginBottom: 12 }}
          />
          <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Llave de arranque (SETUP_BOOTSTRAP_KEY de Vercel)</label>
          <input
            type="password" required value={bootstrapKey} onChange={(e) => setBootstrapKey(e.target.value)}
            style={{ width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8, padding: '9px 10px', fontSize: 13.5, color: '#e8edf2', marginBottom: 16 }}
          />
          {mensaje && (
            <p style={{ fontSize: 12.5, marginBottom: 12, color: mensaje.tipo === 'error' ? '#f2a29c' : '#7fd4a0' }}>
              {mensaje.texto}
            </p>
          )}
          <button
            type="submit" disabled={cargando}
            style={{ width: '100%', background: '#4fb3a9', color: '#0b1116', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: cargando ? 0.6 : 1 }}
          >
            {cargando ? 'Guardando…' : 'Asignar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
