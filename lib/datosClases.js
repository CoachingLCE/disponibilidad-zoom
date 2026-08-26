import { readSheet, appendRow, patchRow } from './sheets';

export async function leerClases() {
  const filas = await readSheet('Clases');
  return filas.map((f) => ({
    id: f.Id || String(f._rowIndex),
    dia: f.Dia,
    horaMin: parseInt(f.HoraMin, 10) || 0,
    codigo: f.Codigo,
    edicion: f.Edicion || '1',
    numero: f.Numero || '',
    sala: f.Sala,
    label: f.Label || (f.Codigo + (f.Numero ? ' ' + f.Numero : '')),
    duracion: parseInt(f.Duracion, 10) || 90,
    fecha: f.Fecha || '',
    docente: f.Docente || '',
    tematica: f.Tematica || '',
    observaciones: f.Observaciones || '',
    _rowIndex: f._rowIndex
  }));
}

export async function agregarClase(clase) {
  await appendRow('Clases', {
    Dia: clase.dia,
    HoraMin: String(clase.horaMin),
    Codigo: clase.codigo,
    Edicion: clase.edicion || '1',
    Numero: clase.numero || '',
    Sala: clase.sala,
    Label: clase.label,
    Duracion: String(clase.duracion),
    Fecha: clase.fecha || '',
    Docente: clase.docente || '',
    Tematica: clase.tematica || '',
    Observaciones: clase.observaciones || '',
    Id: clase.id
  });
}

export async function actualizarClase(rowIndex, cambios) {
  await patchRow('Clases', rowIndex, cambios);
}

export async function eliminarClasePorId(id) {
  const clases = await leerClases();
  const objetivo = clases.find((c) => c.id === id);
  if (!objetivo) return false;
  // No hay "delete row" directo sin reordenar todo — se marca vacía la fila reescribiendo con blancos.
  await patchRow('Clases', objetivo._rowIndex, {
    Dia: '', HoraMin: '', Codigo: '', Edicion: '', Numero: '', Sala: '',
    Label: '', Duracion: '', Fecha: '', Docente: '', Tematica: '', Observaciones: '', Id: ''
  });
  return true;
}

export async function leerFeriados() {
  const filas = await readSheet('Feriados');
  return filas
    .filter((f) => f.Fecha)
    .map((f) => ({
      id: f.Id || String(f._rowIndex),
      fecha: f.Fecha,
      motivo: f.Motivo,
      tipo: f.Tipo || '',
      bloquea: f.Bloquea === 'TRUE',
      _rowIndex: f._rowIndex
    }));
}

export function feriadoEnFecha(feriados, fechaISO) {
  return feriados.find((f) => f.fecha === fechaISO && f.bloquea) || null;
}
