'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

const ROLES_DISPONIBLES = ['Colaborador', 'Admin', 'SuperAdmin'];
const ROLES_RESERVADOS = ['Admin', 'SuperAdmin'];

const inputStyle = {
  width: '100%', background: '#202b38', border: '1px solid #2c3947', borderRadius: 8,
  padding: '8px 10px', fontSize: 13.5, color: '#e8edf2'
};
const btnStyle = {
  background: '#4fb3a9', color: '#0b1116', border: 'none', borderRadius: 9,
  padding: '9px 16px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer'
};
const btnSecundario = {
  background: 'transparent', color: '#93a3b3', border: '1px solid #2c3947', borderRadius: 9,
  padding: '7px 12px', fontSize: 12.5, cursor: 'pointer'
};

export default function AccesosPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRoles, setNuevoRoles] = useState(['Colaborador']);

  const esSuperAdmin = (usuario?.roles || []).includes('SuperAdmin');
  const puedeGestionarAdmins = esSuperAdmin;

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarUsuarios();
  }, [usuario]);

  async function cargarUsuarios() {
    setCargandoLista(true);
    setError('');
    try {
      const res = await fetchAutenticado('/api/usuarios');
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'No se pudo cargar la lista.'); return; }
      setUsuarios(data.usuarios);
    } catch {
      setError('Error de conexión.');
    } finally {
      setCargandoLista(false);
    }
  }

  function tocaReservado(roles) {
    return roles.some((r) => ROLES_RESERVADOS.includes(r));
  }

  async function crear(e) {
    e.preventDefault();
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuevoEmail, nombre: nuevoNombre, roles: nuevoRoles })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`Usuario ${nuevoEmail} creado.`);
      setNuevoEmail(''); setNuevoNombre(''); setNuevoRoles(['Colaborador']);
      cargarUsuarios();
    } catch {
      setError('Error de conexión.');
    }
  }

  async function actualizar(email, cambios) {
    setError(''); setMensaje('');
    try {
      const res = await fetchAutenticado(`/api/usuarios/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setMensaje(`${email} actualizado.`);
      cargarUsuarios();
    } catch {
      setError('Error de conexión.');
    }
  }

  function toggleRolNuevo(rol) {
    setNuevoRoles((prev) => prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]);
  }

  if (cargando || !usuario) return null;

  return (
    <div style={{ maxWidth: 780, margin: '40px auto', padding: '0 24px 60px' }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>🔐 Accesos</h1>
      <p style={{ color: '#93a3b3', fontSize: 13, marginBottom: 20 }}>
        Gestioná quién entra a Cronograma ILCE y con qué rol.
        {!esSuperAdmin && ' Como no sos Super Admin, no podés crear ni editar usuarios Admin/SuperAdmin.'}
      </p>

      {error && <p style={{ color: '#f2a29c', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {mensaje && <p style={{ color: '#7fd4a0', fontSize: 13, marginBottom: 12 }}>{mensaje}</p>}

      <div style={{ background: '#1a222c', border: '1px solid #2c3947', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, marginBottom: 12 }}>➕ Nuevo usuario</h2>
        <form onSubmit={crear} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Email</label>
            <input type="email" required value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 4 }}>Nombre</label>
            <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 12, color: '#93a3b3', display: 'block', marginBottom: 6 }}>Roles</label>
            <div style={{ display: 'flex', gap: 14 }}>
              {ROLES_DISPONIBLES.map((rol) => {
                const bloqueado = ROLES_RESERVADOS.includes(rol) && !puedeGestionarAdmins;
                return (
                  <label key={rol} style={{ fontSize: 13, color: bloqueado ? '#5b6b7a' : '#e8edf2', display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="checkbox" disabled={bloqueado}
                      checked={nuevoRoles.includes(rol)}
                      onChange={() => toggleRolNuevo(rol)}
                    />
                    {rol}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" style={btnStyle}>Crear usuario</button>
          </div>
        </form>
      </div>

      <h2 style={{ fontSize: 14, marginBottom: 12 }}>Usuarios ({usuarios.length})</h2>
      {cargandoLista ? (
        <p style={{ color: '#93a3b3', fontSize: 13 }}>Cargando…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {usuarios.map((u) => (
            <FilaUsuario
              key={u.email}
              u={u}
              puedeEditar={!tocaReservado(u.roles) || puedeGestionarAdmins}
              onActualizar={actualizar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaUsuario({ u, puedeEditar, onActualizar }) {
  const [roles, setRoles] = useState(u.roles);
  const [nuevaPassword, setNuevaPassword] = useState('');

  function toggleRol(rol) {
    setRoles((prev) => prev.includes(rol) ? prev.filter((r) => r !== rol) : [...prev, rol]);
  }

  return (
    <div style={{ background: '#1a222c', border: '1px solid #2c3947', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div>
          <span style={{ fontWeight: 650, fontSize: 14 }}>{u.nombre}</span>
          <span style={{ color: '#93a3b3', fontSize: 12.5, marginLeft: 8 }}>{u.email}</span>
        </div>
        <span style={{ fontSize: 11.5, color: u.activo ? '#7fd4a0' : '#f2a29c' }}>
          {u.activo ? '● Activo' : '● Desactivado'} {!u.tieneContrasena && '· sin contraseña asignada'}
        </span>
      </div>

      {!puedeEditar ? (
        <p style={{ fontSize: 12, color: '#5b6b7a' }}>Solo un Super Admin puede editar este usuario.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          {ROLES_DISPONIBLES.map((rol) => (
            <label key={rol} style={{ fontSize: 12.5, display: 'flex', gap: 5, alignItems: 'center' }}>
              <input type="checkbox" checked={roles.includes(rol)} onChange={() => toggleRol(rol)} />
              {rol}
            </label>
          ))}
          <button style={btnSecundario} onClick={() => onActualizar(u.email, { roles })}>Guardar roles</button>
          <button style={btnSecundario} onClick={() => onActualizar(u.email, { activo: !u.activo })}>
            {u.activo ? 'Desactivar' : 'Reactivar'}
          </button>
          <input
            type="password" placeholder="Nueva contraseña (min 8)" value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            style={{ ...inputStyle, width: 170, padding: '6px 8px' }}
          />
          <button
            style={btnSecundario}
            onClick={() => { onActualizar(u.email, { nuevaPassword }); setNuevaPassword(''); }}
            disabled={nuevaPassword.length > 0 && nuevaPassword.length < 8}
          >
            Resetear contraseña
          </button>
        </div>
      )}
    </div>
  );
}
