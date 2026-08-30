'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

export default function CronogramaCMPage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">Cronograma CM</h1>
      <div className="bg-surface2 border border-border rounded-2xl p-10 mt-6 text-center">
        <p className="text-2xl font-semibold text-textSec mb-2">Próximamente</p>
        <p className="text-sm text-textMuted">Este módulo todavía no está disponible.</p>
      </div>
    </div>
  );
}
