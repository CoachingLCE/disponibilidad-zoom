import { readSheet, appendRows, patchRow } from './sheets';

export async function leerInfoTecnica() {
  const filas = await readSheet('InfoTecnica');
  return filas.filter((f) => f.Nombre).map((f) => ({
    id: f.Id || String(f._rowIndex),
    nombre: f.Nombre, formato: f.Formato || '', mes: f.Mes || '', fecha: f.Fecha || '',
    disertante: f.Disertante || '', horario: f.Horario || '',
    formularioInscripcion: f.FormularioInscripcion || '', salaZoom: f.SalaZoom || '',
    linkAcceso: f.LinkAcceso || '', moderador: f.Moderador || '',
    _rowIndex: f._rowIndex
  }));
}

function fila(item, idx) {
  return {
    Nombre: item.nombre, Formato: item.formato || '', Mes: item.mes || '', Fecha: item.fecha || '',
    Disertante: item.disertante || '', Horario: item.horario || '',
    FormularioInscripcion: item.formularioInscripcion || '', SalaZoom: item.salaZoom || '',
    LinkAcceso: item.linkAcceso || '', Moderador: item.moderador || '',
    Id: item.id || `it-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

export async function agregarInfoTecnica(item) {
  await appendRows('InfoTecnica', [fila(item, 0)]);
}

export async function agregarInfoTecnicaBulk(items) {
  await appendRows('InfoTecnica', items.map(fila));
}

export async function actualizarInfoTecnica(rowIndex, cambios) {
  const patch = {};
  if (cambios.nombre !== undefined) patch.Nombre = cambios.nombre;
  if (cambios.formato !== undefined) patch.Formato = cambios.formato;
  if (cambios.mes !== undefined) patch.Mes = cambios.mes;
  if (cambios.fecha !== undefined) patch.Fecha = cambios.fecha;
  if (cambios.disertante !== undefined) patch.Disertante = cambios.disertante;
  if (cambios.horario !== undefined) patch.Horario = cambios.horario;
  if (cambios.formularioInscripcion !== undefined) patch.FormularioInscripcion = cambios.formularioInscripcion;
  if (cambios.salaZoom !== undefined) patch.SalaZoom = cambios.salaZoom;
  if (cambios.linkAcceso !== undefined) patch.LinkAcceso = cambios.linkAcceso;
  if (cambios.moderador !== undefined) patch.Moderador = cambios.moderador;
  await patchRow('InfoTecnica', rowIndex, patch);
}

export async function eliminarInfoTecnica(rowIndex) {
  await patchRow('InfoTecnica', rowIndex, {
    Nombre: '', Formato: '', Mes: '', Fecha: '', Disertante: '', Horario: '',
    FormularioInscripcion: '', SalaZoom: '', LinkAcceso: '', Moderador: '', Id: ''
  });
}
