'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

export default function HomePage() {
  const { usuario, cargando, logout } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  if (cargando) return null;
  if (!usuario) return null;

  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Cronograma ILCE</h1>
      <p style={{ color: '#93a3b3', fontSize: 14, marginBottom: 24 }}>
        Hola {usuario.nombre} — rol{usuario.roles.length > 1 ? 'es' : ''}: {usuario.roles.join(', ')}
      </p>
      <p style={{ color: '#93a3b3', fontSize: 13.5, lineHeight: 1.6 }}>
        Login funcionando ✔. Este es el esqueleto base — los módulos (Inicio, Cronograma, Formaciones,
        Salas Zoom, Incidencias, Análisis) del prototipo se migran acá arriba, módulo por módulo,
        reemplazando localStorage por llamadas autenticadas a <code>/api/...</code>.
      </p>
      <button
        onClick={logout}
        style={{ marginTop: 20, background: 'transparent', border: '1px solid #2c3947', color: '#93a3b3', borderRadius: 9, padding: '9px 16px', cursor: 'pointer' }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
