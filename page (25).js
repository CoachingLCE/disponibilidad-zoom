'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Mail, Calendar, HardDrive, Sheet, Video, Github,
  GraduationCap, FileText, DollarSign
} from 'lucide-react';
import { useSession } from '../../lib/useSession';

const ACCESOS_RAPIDOS = [
  { icono: MessageSquare, color: '#611f69', nombre: 'Slack', url: 'https://app.slack.com/' },
  { icono: Mail, color: '#ea4335', nombre: 'Gmail', url: 'https://gmail.com/' },
  { icono: Calendar, color: '#1a73e8', nombre: 'Google Calendar', url: 'https://calendar.google.com/' },
  { icono: HardDrive, color: '#0f9d58', nombre: 'Google Drive', url: 'https://drive.google.com/' },
  { icono: Sheet, color: '#0f9d58', nombre: 'Base de datos (Google Sheets)', url: 'https://sheets.google.com/' },
  { icono: Video, color: '#2d8cff', nombre: 'Zoom', url: 'https://www.zoom.com/' }
];

const RECURSOS_INSTITUCIONALES = [
  { icono: GraduationCap, nombre: 'Campus ILCE', url: 'https://campus.institutoilce.com/' },
  { icono: DollarSign, nombre: 'Valores de los cursos', url: 'https://www.coachingeducativolider.com/productos-y-valores' },
  { icono: FileText, nombre: 'Manual académico', url: 'https://www.coachingeducativolider.com/manualacad%C3%A9mico' },
  { icono: Github, nombre: 'Repositorio del proyecto', url: 'https://github.com/CoachingLCE/disponibilidad-zoom' }
];

function TarjetaAcceso({ h }) {
  const Icono = h.icono;
  return (
    <a href={h.url} target="_blank" rel="noopener noreferrer"
      className="bg-surface2 border border-border rounded-2xl px-5 py-4 flex items-center gap-3 transition-all
        hover:-translate-y-0.5 hover:border-accentPurple/40 hover:shadow-lg hover:shadow-accentPurple/10">
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${h.color}22` }}>
        <Icono size={20} style={{ color: h.color }} />
      </span>
      <p className="text-sm font-semibold">{h.nombre}</p>
    </a>
  );
}

export default function HerramientasPage() {
  const { usuario, cargando } = useSession();
  const router = useRouter();

  useEffect(() => { if (!cargando && !usuario) router.push('/login'); }, [cargando, usuario, router]);
  if (cargando || !usuario) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-8 pb-16">
      <h1 className="text-lg font-bold mb-1">Accesos rápidos</h1>
      <p className="text-textMuted text-xs mb-5">Herramientas que utilizás habitualmente. Se abren en una pestaña nueva.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {ACCESOS_RAPIDOS.map((h) => <TarjetaAcceso key={h.nombre} h={h} />)}
      </div>

      <h2 className="text-sm font-bold mb-1">Recursos institucionales</h2>
      <p className="text-textMuted text-xs mb-4">Accesos al campus y a materiales de referencia del instituto.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {RECURSOS_INSTITUCIONALES.map((r) => (
          <TarjetaAcceso key={r.nombre} h={{ ...r, color: '#22d3ee' }} />
        ))}
      </div>
    </div>
  );
}
