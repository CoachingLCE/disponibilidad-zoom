'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [mantenerSesion, setMantenerSesion] = useState(true);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useSession();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
        return;
      }
      login(data.usuario, data.token, mantenerSesion);
      router.push('/');
    } catch (err) {
      setError('Error de conexión. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '96px', padding: '0 24px' }}>
      <div style={{ width: 340, background: '#1a222c', border: '1px solid #2c3947', borderRadius: 16, padding: 28 }}>
        <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 650, marginBottom: 4, color: '#e8edf2' }}>
          Cronograma ILCE
        </h2>
        <p style={{ textAlign: 'center', color: '#93a3b3', fontSize: 13, marginBottom: 20 }}>
          Ingresá con tu usuario y contraseña
        </p>
        <form onSubmit={handleSubmit}>
          <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nombre@institutoilce.com"
            style={{ width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8, padding: '9px 10px', fontSize: 13.5, color: '#e8edf2', marginBottom: 12 }}
          />
          <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={verPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8, padding: '9px 34px 9px 10px', fontSize: 13.5, color: '#e8edf2' }}
            />
            <button
              type="button"
              onClick={() => setVerPassword(!verPassword)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
              title={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {verPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {error && <p style={{ color: '#f2a29c', fontSize: 12, marginBottom: 12 }}>{error}</p>}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#93a3b3', marginBottom: 16, cursor: 'pointer' }}>
            <input type="checkbox" checked={mantenerSesion} onChange={(e) => setMantenerSesion(e.target.checked)} />
            Mantener sesión abierta
          </label>
          <button
            type="submit"
            disabled={cargando}
            style={{ width: '100%', background: '#4fb3a9', color: '#0b1116', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: cargando ? 0.6 : 1 }}
          >
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p style={{ color: '#5b6b7a', fontSize: 11.5, textAlign: 'center', marginTop: 12 }}>
          ¿No tenés contraseña todavía? Pedile a un Admin que te la asigne desde "Accesos".
        </p>
      </div>
    </div>
  );
}
