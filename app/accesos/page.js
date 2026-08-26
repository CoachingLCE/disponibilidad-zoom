'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../lib/useSession';

const ROLES_DISPONIBLES = ['Colaborador', 'Admin', 'SuperAdmin'];
const ROLES_RESERVADOS = ['Admin', 'SuperAdmin'];

const inputCls = 'w-full bg-bg border border-border rounded-lg px-2.5 py-2 text-sm';
const btnCls = 'bg-gradient-to-r from-accentPurple to-accentMagenta text-white rounded-lg px-4 py-2 text-sm font-semibold';
const btnSecCls = 'bg-transparent text-textSec border border-border rounded-lg px-3 py-1.5 text-xs';

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
    <div className="max-w-3xl mx-auto px-6 pb-16 pt-10">
      <h1 className="text-xl mb-1">🔐 Accesos</h1>
      <p className="text-textSec text-sm mb-5">
        Gestioná quién entra a Cronograma ILCE y con qué rol.
        {!esSuperAdmin && ' Como no sos Super Admin, no podés crear ni editar usuarios Admin/SuperAdmin.'}
      </p>

      {error && <p className="text-dangerText text-sm mb-3">{error}</p>}
      {mensaje && <p className="text-successText text-sm mb-3">{mensaje}</p>}

      <div className="bg-surface2 border border-border rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">➕ Nuevo usuario</h2>
        <form onSubmit={crear} className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs text-textSec block mb-1">Email</label>
            <input type="email" required value={nuevoEmail} onChange={(e) => setNuevoEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-textSec block mb-1">Nombre</label>
            <input type="text" required value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-textSec block mb-1.5">Roles</label>
            <div className="flex gap-4">
              {ROLES_DISPONIBLES.map((rol) => {
                const bloqueado = ROLES_RESERVADOS.includes(rol) && !puedeGestionarAdmins;
                return (
                  <label key={rol} className={`text-sm flex gap-1.5 items-center ${bloqueado ? 'text-textMuted' : 'text-text'}`}>
                    <input type="checkbox" disabled={bloqueado} checked={nuevoRoles.includes(rol)} onChange={() => toggleRolNuevo(rol)} />
                    {rol}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="col-span-2">
            <button type="submit" className={btnCls}>Crear usuario</button>
          </div>
        </form>
      </div>

      <h2 className="text-sm font-semibold mb-3">Usuarios ({usuarios.length})</h2>
      {cargandoLista ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
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
    <div className="bg-surface2 border border-border rounded-xl p-3.5">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <span className="font-semibold text-sm">{u.nombre}</span>
          <span className="text-textSec text-xs ml-2">{u.email}</span>
        </div>
        <span className={`text-[11.5px] ${u.activo ? 'text-successText' : 'text-dangerText'}`}>
          {u.activo ? '● Activo' : '● Desactivado'} {!u.tieneContrasena && '· sin contraseña asignada'}
        </span>
      </div>

      {!puedeEditar ? (
        <p className="text-xs text-textMuted">Solo un Super Admin puede editar este usuario.</p>
      ) : (
        <div className="flex flex-wrap gap-3.5 items-center">
          {ROLES_DISPONIBLES.map((rol) => (
            <label key={rol} className="text-xs flex gap-1 items-center">
              <input type="checkbox" checked={roles.includes(rol)} onChange={() => toggleRol(rol)} />
              {rol}
            </label>
          ))}
          <button className={btnSecCls} onClick={() => onActualizar(u.email, { roles })}>Guardar roles</button>
          <button className={btnSecCls} onClick={() => onActualizar(u.email, { activo: !u.activo })}>
            {u.activo ? 'Desactivar' : 'Reactivar'}
          </button>
          <input
            type="password" placeholder="Nueva contraseña (min 8)" value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs w-44"
          />
          <button
            className={btnSecCls}
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
