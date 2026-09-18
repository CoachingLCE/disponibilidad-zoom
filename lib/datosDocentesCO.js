import { readSheet, appendRows, patchRow } from './sheets';

// Cada fila es UN período de asignación (Desde-Hasta) de una edición puntual — una
// misma edición tiene, con el tiempo, varios períodos con distinto docente/staff
// (por ejemplo, si hay que reemplazar al docente a mitad de la edición). El Día y
// Horario son fijos por edición (el mismo slot semanal se repite en todos sus períodos).
export async function leerDocentesCO() {
  const filas = await readSheet('DocentesCO');
  return filas.filter((f) => f.Edicion).map((f) => ({
    id: f.Id || String(f._rowIndex), edicion: f.Edicion, dia: f.Dia || '', horario: f.Horario || '',
    desde: f.Desde || '', hasta: f.Hasta || '', docente: f.Docente || '', staff: f.Staff || '',
    // Sala y Cuatrimestre: columnas nuevas — si la pestaña DocentesCO del Sheet todavía no
    // las tiene agregadas como encabezado, quedan vacías acá (no rompen nada), pero no se
    // van a guardar de verdad hasta que se agreguen esas dos columnas en el Sheet.
    sala: f.Sala || '', cuatrimestre: f.Cuatrimestre || '',
    observaciones: f.Observaciones || '', usuario: f.Usuario || '', _rowIndex: f._rowIndex
  }));
}

function fila(item, idx) {
  return {
    Edicion: item.edicion, Dia: item.dia || '', Horario: item.horario || '',
    Desde: item.desde || '', Hasta: item.hasta || '', Docente: item.docente || '', Staff: item.staff || '',
    Sala: item.sala || '', Cuatrimestre: item.cuatrimestre || '',
    Observaciones: item.observaciones || '', Usuario: item.usuario || '',
    Id: item.id || `doc-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

export async function agregarDocenteCO(item) {
  await appendRows('DocentesCO', [fila(item, 0)]);
}

export async function agregarDocentesCOBulk(items) {
  await appendRows('DocentesCO', items.map(fila));
}

export async function actualizarDocenteCO(rowIndex, cambios) {
  const patch = {};
  if (cambios.edicion !== undefined) patch.Edicion = cambios.edicion;
  if (cambios.dia !== undefined) patch.Dia = cambios.dia;
  if (cambios.horario !== undefined) patch.Horario = cambios.horario;
  if (cambios.desde !== undefined) patch.Desde = cambios.desde;
  if (cambios.hasta !== undefined) patch.Hasta = cambios.hasta;
  if (cambios.docente !== undefined) patch.Docente = cambios.docente;
  if (cambios.staff !== undefined) patch.Staff = cambios.staff;
  if (cambios.sala !== undefined) patch.Sala = cambios.sala;
  if (cambios.cuatrimestre !== undefined) patch.Cuatrimestre = cambios.cuatrimestre;
  if (cambios.observaciones !== undefined) patch.Observaciones = cambios.observaciones;
  if (cambios.usuario !== undefined) patch.Usuario = cambios.usuario;
  await patchRow('DocentesCO', rowIndex, patch);
}

export async function eliminarDocenteCO(rowIndex) {
  await patchRow('DocentesCO', rowIndex, {
    Edicion: '', Dia: '', Horario: '', Desde: '', Hasta: '', Docente: '', Staff: '',
    Sala: '', Cuatrimestre: '', Observaciones: '', Usuario: '', Id: ''
  });
}
