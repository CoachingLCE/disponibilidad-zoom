import { readSheet, appendRows, patchRow } from './sheets';

// Antes esto era una lista fija en código (lib/masterclassesHistorico.js, 105 registros
// del historial) — no se podía editar ni agregar una nueva desde la app. Ahora vive en la
// pestaña "Masterclasses" del Sheet, igual que el resto de los datos reales de la app.
export async function leerMasterclasses() {
  const filas = await readSheet('Masterclasses');
  return filas
    .filter((f) => f.Fecha || f.Tema)
    .map((f) => ({
      id: f.Id || String(f._rowIndex), fecha: f.Fecha || '', dia: f.Dia || '', horario: f.Horario || '',
      tema: f.Tema || '', docente: f.Docente || '', categoria: f.Categoria || 'Masterclass',
      sala: f.Sala || '', mod: f.Mod || '', observaciones: f.Observaciones || '', _rowIndex: f._rowIndex
    }));
}

function fila(m, idx) {
  return {
    Fecha: m.fecha || '', Dia: m.dia || '', Horario: m.horario || '', Tema: m.tema || '',
    Docente: m.docente || '', Categoria: m.categoria || 'Masterclass', Sala: m.sala || '',
    Mod: m.mod || '', Observaciones: m.observaciones || '',
    Id: m.id || `mc-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

export async function agregarMasterclase(m) {
  await appendRows('Masterclasses', [fila(m, 0)]);
}

// Para la carga inicial del historial completo de una sola vez.
export async function agregarMasterclasesBulk(items) {
  await appendRows('Masterclasses', items.map(fila));
}

export async function actualizarMasterclase(rowIndex, cambios) {
  const patch = {};
  if (cambios.fecha !== undefined) patch.Fecha = cambios.fecha;
  if (cambios.dia !== undefined) patch.Dia = cambios.dia;
  if (cambios.horario !== undefined) patch.Horario = cambios.horario;
  if (cambios.tema !== undefined) patch.Tema = cambios.tema;
  if (cambios.docente !== undefined) patch.Docente = cambios.docente;
  if (cambios.categoria !== undefined) patch.Categoria = cambios.categoria;
  if (cambios.sala !== undefined) patch.Sala = cambios.sala;
  if (cambios.mod !== undefined) patch.Mod = cambios.mod;
  if (cambios.observaciones !== undefined) patch.Observaciones = cambios.observaciones;
  await patchRow('Masterclasses', rowIndex, patch);
}

export async function eliminarMasterclase(rowIndex) {
  await patchRow('Masterclasses', rowIndex, {
    Fecha: '', Dia: '', Horario: '', Tema: '', Docente: '', Categoria: '', Sala: '', Mod: '', Observaciones: '', Id: ''
  });
}
