import { readSheet, appendRows } from './sheets';

export async function leerDocentesCO() {
  const filas = await readSheet('DocentesCO');
  return filas.filter((f) => f.Edicion).map((f) => ({
    id: f.Id || String(f._rowIndex), edicion: f.Edicion, docente: f.Docente || '',
    staff: f.Staff || '', fechaAsignacion: f.FechaAsignacion || '',
    observaciones: f.Observaciones || '', usuario: f.Usuario || ''
  }));
}

export async function agregarDocenteCO({ edicion, docente, staff, fechaAsignacion, observaciones, usuario }) {
  await appendRows('DocentesCO', [{
    Edicion: edicion, Docente: docente || '', Staff: staff || '',
    FechaAsignacion: fechaAsignacion || new Date().toISOString().slice(0, 10),
    Observaciones: observaciones || '', Usuario: usuario || '',
    Id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }]);
}
