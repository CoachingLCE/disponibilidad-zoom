'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

const ACCIONES = [
  { href: '/cronograma', label: 'Nueva clase' },
  { href: '/salas-zoom', label: 'Postergar clase' },
  { href: '/salas-zoom', label: 'Reservar sala' },
  { href: '/incidencias', label: 'Agregar feriado' },
  { href: '/salas-zoom', label: 'Cargar horario' }
];

export default function AccionesRapidas() {
  const { usuario } = useSession();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));
  if (!puedeEditar) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {abierto && (
        <div className="absolute bottom-14 right-0 bg-surface2 border border-border rounded-xl p-1.5 w-48 shadow-lg">
          {ACCIONES.map((a, i) => (
            <button
              key={i}
              onClick={() => { setAbierto(false); router.push(a.href); }}
              className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-bg text-textSec hover:text-text"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-accentPurple to-accentMagenta text-white text-2xl font-bold flex items-center justify-center shadow-lg"
        title="Acciones rápidas"
      >
        {abierto ? '×' : '+'}
      </button>
    </div>
  );
}
