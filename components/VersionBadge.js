'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_VERSION, APP_UPDATED_AT } from '../lib/version';
import { CHANGELOG } from '../lib/changelog';

const s = {
  badge: {
    position: 'fixed', bottom: 12, right: 16, fontSize: 11, color: '#93a3b3',
    background: 'rgba(32,43,56,.85)', border: '1px solid #2c3947', borderRadius: 100,
    padding: '4px 12px', zIndex: 40, cursor: 'pointer'
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16
  },
  modal: {
    background: '#1a222c', border: '1px solid #2c3947', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto'
  }
};

export default function VersionBadge() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const fecha = new Date(APP_UPDATED_AT + 'T00:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Si en el futuro hay alguna pantalla pública (ej: confirmación para docentes sin login),
  // se puede ocultar el badge ahí con un chequeo de pathname acá, igual que en la otra app.
  if (pathname === '/confirmar-recepcion') return null;

  return (
    <>
      <button onClick={() => setAbierto(true)} style={s.badge} title="Ver novedades">
        v{APP_VERSION} · Actualizado {fecha}
      </button>
      {abierto && (
        <div style={s.overlay} onClick={() => setAbierto(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📋 Novedades de la app</p>
              <button onClick={() => setAbierto(false)} style={{ background: 'none', border: 'none', color: '#93a3b3', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {CHANGELOG.map((entrada) => (
                <div key={entrada.version}>
                  <p style={{ fontSize: 13, fontWeight: 650, color: '#4fb3a9', marginBottom: 6 }}>
                    v{entrada.version} · {new Date(entrada.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {entrada.cambios.map((c, i) => (
                      <li key={i} style={{ fontSize: 12.5, color: '#93a3b3', display: 'flex', gap: 8 }}>
                        <span style={{ color: '#e0a458' }}>•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
