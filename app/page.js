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

  const puedeVerAccesos = (usuario.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-semibold mb-1">Cronograma ILCE</h1>
      <p className="text-textSec text-sm mb-6">
        Hola {usuario.nombre} — rol{usuario.roles.length > 1 ? 'es' : ''}: {usuario.roles.join(', ')}
      </p>
      <p className="text-textSec text-[13.5px] leading-relaxed">
        Login funcionando ✔. Los módulos (Inicio, Cronograma, Formaciones, Salas Zoom, Incidencias,
        Análisis) del prototipo se migran acá, módulo por módulo, reemplazando localStorage por
        llamadas autenticadas a <code>/api/...</code>.
      </p>
      <div className="flex gap-2.5 mt-5">
        <a
          href="/salas-zoom"
          className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2.5 font-semibold text-sm"
        >
          🎥 Salas Zoom
        </a>
        {puedeVerAccesos && (
          <a
            href="/accesos"
            className="bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2.5 font-semibold text-sm"
          >
            🔐 Accesos
          </a>
        )}
        <button
          onClick={logout}
          className="bg-transparent border border-border text-textSec rounded-lg px-4 py-2.5 text-sm"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
