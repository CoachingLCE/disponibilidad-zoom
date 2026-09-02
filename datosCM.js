import { readSheet, appendRows, patchRow } from './sheets';

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
      detalle: f.Detalle || '',
      _rowIndex: f._rowIndex
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

/** Actualiza una actividad existente (por su _rowIndex), conservando su Id original. */
export async function actualizarActividadCM(rowIndex, cambios) {
  const patch = {};
  if (cambios.fecha !== undefined) patch.Fecha = cambios.fecha || '';
  if (cambios.dia !== undefined) patch.Dia = cambios.dia || '';
  if (cambios.horaMin !== undefined) patch.HoraMin = cambios.horaMin != null ? String(cambios.horaMin) : '';
  if (cambios.tipo !== undefined) patch.Tipo = cambios.tipo;
  if (cambios.detalle !== undefined) patch.Detalle = cambios.detalle || '';
  await patchRow('CronogramaCM', rowIndex, patch);
}

/** "Elimina" una actividad dejando su fila en blanco (la API no borra filas de verdad). */
export async function eliminarActividadCM(rowIndex) {
  await patchRow('CronogramaCM', rowIndex, { Fecha: '', Dia: '', HoraMin: '', Tipo: '', Detalle: '', Id: '' });
}
