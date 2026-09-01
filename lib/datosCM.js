import { readSheet, appendRows } from './sheets';

export async function leerActividadesCM() {
  const filas = await readSheet('CronogramaCM');
  return filas
    .filter((f) => f.Tipo)
    .map((f) => ({
      id: f.Id || String(f._rowIndex),
      fecha: f.Fecha || '',
      dia: f.Dia || '',
      horaMin: f.HoraMin ? parseInt(f.HoraMin, 10) : null,
      tipo: f.Tipo,
      detalle: f.Detalle || ''
    }));
}

function filaCM(act, idx) {
  return {
    Fecha: act.fecha || '', Dia: act.dia || '', HoraMin: act.horaMin != null ? String(act.horaMin) : '',
    Tipo: act.tipo, Detalle: act.detalle || '',
    Id: act.id || `cm-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

export async function agregarActividadCM(act) {
  await appendRows('CronogramaCM', [filaCM(act, 0)]);
}

export async function agregarActividadesCM(items) {
  await appendRows('CronogramaCM', items.map(filaCM));
}
