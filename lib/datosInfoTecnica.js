import { readSheet, appendRows, patchRow } from './sheets';

export async function leerInfoTecnica() {
  const filas = await readSheet('InfoTecnica');
  return filas.filter((f) => f.NombreActividad).map((f) => ({
    id: f.Id || String(f._rowIndex), fecha: f.Fecha || '', nombreActividad: f.NombreActividad,
    linkZoom: f.LinkZoom || '', grabacion: f.Grabacion || '', plataforma: f.Plataforma || '',
    responsable: f.Responsable || '', observaciones: f.Observaciones || '', _rowIndex: f._rowIndex
  }));
}

function fila(item, idx) {
  return {
    Fecha: item.fecha || '', NombreActividad: item.nombreActividad,
    LinkZoom: item.linkZoom || '', Grabacion: item.grabacion || '', Plataforma: item.plataforma || '',
    Responsable: item.responsable || '', Observaciones: item.observaciones || '',
    Id: item.id || `it-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

export async function agregarInfoTecnica(item) {
  await appendRows('InfoTecnica', [fila(item, 0)]);
}

export async function actualizarInfoTecnica(rowIndex, cambios) {
  const patch = {};
  if (cambios.fecha !== undefined) patch.Fecha = cambios.fecha;
  if (cambios.nombreActividad !== undefined) patch.NombreActividad = cambios.nombreActividad;
  if (cambios.linkZoom !== undefined) patch.LinkZoom = cambios.linkZoom;
  if (cambios.grabacion !== undefined) patch.Grabacion = cambios.grabacion;
  if (cambios.plataforma !== undefined) patch.Plataforma = cambios.plataforma;
  if (cambios.responsable !== undefined) patch.Responsable = cambios.responsable;
  if (cambios.observaciones !== undefined) patch.Observaciones = cambios.observaciones;
  await patchRow('InfoTecnica', rowIndex, patch);
}

export async function eliminarInfoTecnica(rowIndex) {
  await patchRow('InfoTecnica', rowIndex, {
    Fecha: '', NombreActividad: '', LinkZoom: '', Grabacion: '', Plataforma: '',
    Responsable: '', Observaciones: '', Id: ''
  });
}
