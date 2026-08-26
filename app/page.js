'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../lib/useSession';
import {
  SALAS, DIAS, DIAS_JS, BUFFER_MIN,
  minutosAHora, formatFechaCorta, agruparParaVista, calcularAlertas
} from '../lib/salasLogic';

const boxCls = 'bg-surface2 border border-border rounded-2xl p-5 mb-4';

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

  const ahora = new Date();
  const diaHoy = DIAS_JS[ahora.getDay()];
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  const hoyISO = ahora.toISOString().slice(0, 10);

  let ocupadasAhora = 0;
  let proximaLibera = null;
  SALAS.forEach((sala) => {
    const ocupHoy = vista.filter((c) => c.dia === diaHoy && c.sala === sala)
      .map((c) => ({ ...c, inicio: c.horaMin - BUFFER_MIN, fin: c.horaMin + c.duracion }));
    const actual = ocupHoy.find((o) => horaActual >= o.inicio && horaActual < o.fin);
    if (actual) {
      ocupadasAhora++;
      if (!proximaLibera || actual.fin < proximaLibera.fin) proximaLibera = { sala, fin: actual.fin };
    }
  });
  const libresAhora = SALAS.length - ocupadasAhora;
  const clasesHoyVista = vista.filter((c) => c.dia === diaHoy);
  const clasesSemana = vista.filter((c) => DIAS.includes(c.dia)).length;

  const actividadesTodas = useMemo(() => {
    const deClases = clases.filter((c) => c.fecha).map((c) => ({
      fecha: c.fecha, tipo: 'Formación', label: c.label + (c.edicion ? ' (Ed. ' + c.edicion + ')' : ''),
      horaMin: c.horaMin, sala: c.sala
    }));
    const deOtras = actividades.map((a) => ({
      fecha: a.fecha, tipo: a.tipo, label: (a.nombreCurso || a.tipo) + (a.tematica ? ' — ' + a.tematica : ''),
      horaMin: a.horaMin, sala: ''
    }));
    return deClases.concat(deOtras).filter((a) => a.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaMin || 0) - (b.horaMin || 0));
  }, [clases, actividades]);

  const deHoy = actividadesTodas.filter((a) => a.fecha === hoyISO);
  const proximas = actividadesTodas.filter((a) => a.fecha > hoyISO).slice(0, 8);

  let proxima = clasesHoyVista.filter((c) => c.horaMin > horaActual).sort((a, b) => a.horaMin - b.horaMin)[0];
  let proximaEsHoy = true;
  if (!proxima) {
    const orden = DIAS_JS.slice(1).concat(DIAS_JS[0]);
    const idxHoy = orden.indexOf(diaHoy);
    for (let i = 1; i <= 7 && !proxima; i++) {
      const d = orden[(idxHoy + i) % 7];
      const cand = vista.filter((c) => c.dia === d).sort((a, b) => a.horaMin - b.horaMin);
      if (cand.length) { proxima = cand[0]; proximaEsHoy = false; }
    }
  }

  if (cargando || !usuario) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
      <h1 className="text-xl mb-1">🏠 Inicio</h1>
      <p className="text-textSec text-sm mb-5">Resumen general de Cronograma ILCE.</p>

      {cargandoDatos ? (
        <p className="text-textSec text-sm">Cargando…</p>
      ) : (
        <>
          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px,1fr))' }}>
            <Metrica n={SALAS.length} l="Salas" />
            <Metrica n={libresAhora} l="Libres ahora" />
            <Metrica n={ocupadasAhora} l="Ocupadas ahora" warn={ocupadasAhora > 0} />
            <Metrica n={clasesHoyVista.length} l="Clases hoy" />
            <Metrica n={clasesSemana} l="Clases esta semana" />
          </div>

          <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))' }}>
            <div className="bg-infoBg border border-infoText/25 rounded-xl px-4 py-3.5">
              <div className="text-[11px] text-infoText font-bold uppercase tracking-wide mb-1.5">Próxima clase</div>
              {proxima ? (
                <>
                  <div className="text-sm font-bold">{proxima.label} · {proxima.sala}</div>
                  <div className="text-xs text-textSec mt-0.5">
                    {proximaEsHoy ? 'Hoy' : proxima.dia} {minutosAHora(proxima.horaMin)}
                    {proximaEsHoy && ` · en ${proxima.horaMin - horaActual} min`}
                  </div>
                </>
              ) : <div className="text-sm font-bold">No hay clases próximas cargadas</div>}
            </div>
            <div className="bg-infoBg border border-infoText/25 rounded-xl px-4 py-3.5">
              <div className="text-[11px] text-infoText font-bold uppercase tracking-wide mb-1.5">Próxima sala en liberarse</div>
              {proximaLibera ? (
                <>
                  <div className="text-sm font-bold">{proximaLibera.sala}</div>
                  <div className="text-xs text-textSec mt-0.5">a las {minutosAHora(proximaLibera.fin)}</div>
                </>
              ) : <div className="text-sm font-bold">Todas libres ahora</div>}
            </div>
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-2">📆 Actividades de hoy</h2>
            {deHoy.length === 0 ? <p className="text-textSec text-sm">No hay actividades cargadas para hoy.</p> : (
              <div className="flex flex-col gap-1.5">
                {deHoy.map((a, i) => (
                  <div key={i} className="bg-infoBg text-infoText rounded-lg px-3 py-2 text-xs">
                    {minutosAHora(a.horaMin)} · {a.tipo} · {a.label}{a.sala ? ' · ' + a.sala : ''}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-2">⏭️ Próximas actividades</h2>
            {proximas.length === 0 ? <p className="text-textSec text-sm">No hay próximas actividades cargadas.</p> : (
              <div className="flex flex-col gap-1.5">
                {proximas.map((a, i) => (
                  <div key={i} className="bg-infoBg text-infoText rounded-lg px-3 py-2 text-xs">
                    {formatFechaCorta(a.fecha)} {minutosAHora(a.horaMin)} · {a.tipo} · {a.label}{a.sala ? ' · ' + a.sala : ''}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-2">⚠️ Alertas y conflictos</h2>
            {alertas.length === 0 ? <p className="text-textSec text-sm">✔ Sin conflictos detectados por ahora.</p> : (
              <div className="flex flex-col gap-1.5">
                {alertas.map((a, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 text-xs font-semibold ${a.tipo === 'warn' ? 'bg-dangerBg text-dangerText' : 'bg-warningBg text-warningText'}`}>
                    ⚠ {a.texto}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={boxCls}>
            <h2 className="text-sm font-semibold mb-2">🟡 Clases postergadas</h2>
            {postergaciones.length === 0 ? <p className="text-textSec text-sm">No hay clases postergadas.</p> : (
              <Metrica n={postergaciones.length} l="Postergaciones en total" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Metrica({ n, l, warn }) {
  return (
    <div className="bg-surface2 border border-border rounded-xl p-3.5 text-center">
      <div className={`text-2xl font-extrabold ${warn ? 'text-warningText' : 'text-accentTeal'}`}>{n}</div>
      <div className="text-[11px] text-textSec mt-1 font-semibold">{l}</div>
    </div>
  );
}
