'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';

const ACCIONES = [
  { href: '/cronograma', label: 'Nueva clase' },
  { href: '/salas-zoom', label: 'Postergar clase' },
  { href: '/salas-zoom', label: 'Reservar sala' },
  { href: '/incidencias', label: 'Agregar feriado' },
  { href: '/salas-zoom', label: 'Agregar actividad' }
];

export default function AccionesRapidas() {
  const { usuario } = useSession();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  const puedeEditar = (usuario?.roles || []).some((r) => ['Admin', 'SuperAdmin'].includes(r));
  if (!puedeEditar) return null;

  return (
    // Los 3 botones flotantes (badge de versión, este "+", "❓ Necesito ayuda") comparten
    // right-4 y quedan apilados con espacio entre sí, de abajo hacia arriba: badge (bottom-3)
    // → "+" (bottom-12) → ayuda (bottom-28, ver TourGuiado.js) — antes se pisaban entre sí.
    // z-[95] cuando está abierto: el botón "❓ Necesito ayuda" y el badge de versión son
    // fixed con su propio z-index (90 y 40 respectivamente) — al comparar stacking contexts
    // distintos gana el de mayor z-index del contenedor "fixed" entero, no el de sus hijos,
    // así que había que subir ACÁ (no solo en el menú) para que no tapen los botones del menú.
    <div className={`fixed bottom-12 right-4 ${abierto ? 'z-[95]' : 'z-40'}`}>
      {abierto && (
        <div className="absolute bottom-32 right-0 bg-surface2 border border-border rounded-xl p-1.5 w-48 shadow-lg">
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
