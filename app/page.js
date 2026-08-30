'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN, ICONOS, NOMBRES,
  minutosAHora, formatFechaCorta, agruparParaVista, calcularAlertas, calcularFormaciones, colorFormacion, ESTADOS
} from '../lib/salasLogic';

const cardCls = 'bg-surface2 border border-border rounded-xl p-4';
const sectionCls = 'bg-surface2 border border-border rounded-xl p-5 mb-4';

export default function InicioPage() {
  const { usuario, cargando, fetchAutenticado } = useSession();
  const router = useRouter();

  const [clases, setClases] = useState([]);
  const [feriados, setFeriados] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [postergaciones, setPostergaciones] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    if (!cargando && !usuario) router.push('/login');
  }, [cargando, usuario, router]);

  useEffect(() => {
    if (usuario) cargarTodo();
  }, [usuario]);

  async function cargarTodo() {
    setCargandoDatos(true);
    try {
      const [rc, rf, ra, rp] = await Promise.all([
        fetchAutenticado('/api/clases'),
        fetchAutenticado('/api/feriados'),
        fetchAutenticado('/api/actividades'),
        fetchAutenticado('/api/postergaciones')
      ]);
      const [dc, df, da, dp] = await Promise.all([rc.json(), rf.json(), ra.json(), rp.json()]);
      if (rc.ok) setClases(dc.clases);
      if (rf.ok) setFeriados(df.feriados);
      if (ra.ok) setActividades(da.actividades);
      if (rp.ok) setPostergaciones(dp.postergaciones);
    } finally {
      setCargandoDatos(false);
    }
  }

  const vista = useMemo(() => agruparParaVista(clases), [clases]);
  const alertas = useMemo(() => calcularAlertas(clases, feriados), [clases, feriados]);
  const formaciones = useMemo(() => calcularFormaciones(clases), [clases]);

  const ahora = new Date();
  const diaHoy = DIAS_JS[ahora.getDay()];
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyISO = ahora.toISOString().slice(0, 10);

  let ocupadasAhora = 0;
  SALAS.forEach((sala) => {
    const ocupHoy = vista.filter((c) => c.dia === diaHoy && c.sala === sala)
      .map((c) => ({ inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }));
    if (ocupHoy.some((o) => horaActual >= o.inicio && horaActual < o.fin)) ocupadasAhora++;
  });
  const libresAhora = SALAS.length - ocupadasAhora;

  const actividadesTodas = useMemo(() => {
    const deClases = clases.filter((c) => c.fecha).map((c) => ({
      fecha: c.fecha, dia: c.dia, curso: c.codigo, nombreCurso: NOMBRES[c.codigo] || c.codigo,
      edicion: c.edicion, numero: c.numero, horaMin: c.horaMin, sala: c.sala, esFormacion: true
    }));
    const deOtras = actividades.filter((a) => a.fecha).map((a) => ({
      fecha: a.fecha, dia: a.dia, curso: '', nombreCurso: a.nombreCurso || a.tipo,
      edicion: '', numero: '', horaMin: a.horaMin, sala: '', esFormacion: false
    }));
    return deClases.concat(deOtras).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  }, [clases, actividades]);

  const agendaHoy = actividadesTodas.filter((a) => a.fecha === hoyISO).sort((a, b) => (a.horaMin || 0) - (b.horaMin || 0));
  const proximas = actividadesTodas.filter((a) => a.fecha > hoyISO).slice(0, 8);
  const proximaClase = agendaHoy.find((a) => a.horaMin > horaActual) || proximas[0] || null;
  const formacionesEnCurso = formaciones.filter((f) => f.estado === 'En proceso').length;

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-6 pb-16">
      <div className="mb-5">
        <h1 className="text-lg font-semibold">HOY</h1>
        <p className="text-textSec text-sm mt-0.5">
          {agendaHoy.length} clase{agendaHoy.length !== 1 ? 's' : ''} · {ocupadasAhora} sala{ocupadasAhora !== 1 ? 's' : ''} ocupada{ocupadasAhora !== 1 ? 's' : ''} · {libresAhora} disponible{libresAhora !== 1 ? 's' : ''}
        </p>
      </div>

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))' }}>
            <Metrica valor={agendaHoy.length} label="Clases hoy" />
            <Metrica
              valor={proximaClase ? minutosAHora(proximaClase.horaMin) : '—'}
              label={proximaClase ? `Próxima: ${proximaClase.nombreCurso}` : 'Próxima clase'}
              chico
            />
            <Metrica valor={`${ocupadasAhora}/${SALAS.length}`} label="Salas ocupadas" acento={ocupadasAhora > 0 ? 'warning' : undefined} />
            <Metrica valor={libresAhora} label="Salas disponibles" acento="success" />
            <Metrica valor={alertas.length} label="Incidencias activas" acento={alertas.length > 0 ? 'danger' : undefined} />
            <Metrica valor={formacionesEnCurso} label="Formaciones activas" />
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-1">Agenda de hoy</h2>
            <p className="text-xs text-textMuted mb-3">{formatFechaCorta(hoyISO)}</p>
            {agendaHoy.length === 0 ? (
              <p className="text-textSec text-sm py-2">Sin actividades cargadas para hoy.</p>
            ) : (
              <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))' }}>
                {agendaHoy.map((a, i) => {
                  const enCurso = a.horaMin != null && horaActual >= a.horaMin - BUFFER_MIN && horaActual < a.horaMin + 90;
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  return (
                    <div key={i} className={`border-l-4 ${color ? color.border : 'border-infoText/40'} border-t border-r border-b border-border rounded-lg p-3`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-textSec">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {enCurso && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADOS.enCurso.bg} ${ESTADOS.enCurso.text}`}>
                            {ESTADOS.enCurso.label.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {color && <span className={`w-2 h-2 rounded-full ${color.dot} shrink-0`} />}
                        <span className={`text-sm font-medium truncate ${color ? color.text : ''}`}>{ICONOS[a.curso] || ''} {a.nombreCurso}</span>
                      </div>
                      {a.esFormacion && (
                        <p className="text-xs text-textMuted">Clase {a.numero} · Edición {a.edicion}</p>
                      )}
                      {a.sala && <p className="text-xs text-textMuted">{a.sala}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-2">Alertas activas</h2>
            {alertas.length === 0 ? (
              <p className="text-textSec text-sm py-1">Sin conflictos detectados por ahora.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {alertas.map((a, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 text-xs font-medium ${a.tipo === 'warn' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'}`}>
                    {a.texto}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={sectionCls}>
            <h2 className="text-sm font-semibold mb-2">Próximas clases</h2>
            {proximas.length === 0 ? (
              <p className="text-textSec text-sm py-1">No hay próximas actividades cargadas.</p>
            ) : (
              <div>
                {proximas.map((a, i) => {
                  const color = a.esFormacion ? colorFormacion(a.curso) : null;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-textMuted w-20 shrink-0">{formatFechaCorta(a.fecha)}</span>
                        <span className="font-mono text-xs text-textSec w-12 shrink-0">{a.horaMin != null ? minutosAHora(a.horaMin) : '—'}</span>
                        {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot} shrink-0`} />}
                        <span className={`text-sm truncate ${color ? color.text : ''}`}>{a.nombreCurso}{a.esFormacion ? ` · Ed. ${a.edicion}` : ''}</span>
                      </div>
                      {a.sala && <span className="text-xs text-textMuted shrink-0">{a.sala}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metrica({ valor, label, acento, chico }) {
  const color = {
    success: 'text-successText', warning: 'text-warningText', danger: 'text-dangerText'
  }[acento] || 'text-text';
  return (
    <div className={cardCls}>
      <div className={`${chico ? 'text-lg' : 'text-2xl'} font-bold ${color}`}>{valor}</div>
      <div className="text-[11px] text-textSec mt-0.5 truncate">{label}</div>
    </div>
  );
}
