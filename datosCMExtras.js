import { readSheet, appendRows, patchRow } from './sheets';

// --- Campañas ---
export async function leerCampanasCM() {
  const filas = await readSheet('CampanasCM');
  return filas.filter((f) => f.Titulo).map((f) => ({
    id: f.Id || String(f._rowIndex), titulo: f.Titulo, fecha: f.Fecha || '', descripcion: f.Descripcion || '', _rowIndex: f._rowIndex
  }));
}
function filaCampana(c, idx) {
  return {
    Titulo: c.titulo, Fecha: c.fecha || '', Descripcion: c.descripcion || '',
    Id: c.id || `camp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}
export async function agregarCampanaCM(c) { await appendRows('CampanasCM', [filaCampana(c, 0)]); }
export async function agregarCampanasCM(items) { await appendRows('CampanasCM', items.map(filaCampana)); }
export async function eliminarCampanaCM(rowIndex) {
  await patchRow('CampanasCM', rowIndex, { Titulo: '', Fecha: '', Descripcion: '', Id: '' });
}

// --- Enlaces ---
export async function leerEnlacesCM() {
  const filas = await readSheet('EnlacesCM');
  return filas.filter((f) => f.Titulo).map((f) => ({
    id: f.Id || String(f._rowIndex), categoria: f.Categoria || 'Otros', titulo: f.Titulo, url: f.Url || '', _rowIndex: f._rowIndex
  }));
}
function filaEnlace(e, idx) {
  return {
    Categoria: e.categoria || 'Otros', Titulo: e.titulo, Url: e.url || '',
    Id: e.id || `link-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}
export async function agregarEnlaceCM(e) { await appendRows('EnlacesCM', [filaEnlace(e, 0)]); }
export async function agregarEnlacesCM(items) { await appendRows('EnlacesCM', items.map(filaEnlace)); }
export async function eliminarEnlaceCM(rowIndex) {
  await patchRow('EnlacesCM', rowIndex, { Categoria: '', Titulo: '', Url: '', Id: '' });
}

// --- Notas (post-its) ---
const COLORES_NOTA = ['amarillo', 'rosa', 'celeste', 'verde'];
export async function leerNotasCM() {
  const filas = await readSheet('NotasCM');
  return filas.filter((f) => f.Texto).map((f) => ({
    id: f.Id || String(f._rowIndex), texto: f.Texto, color: f.Color || 'amarillo', autor: f.Autor || '', _rowIndex: f._rowIndex
  }));
}
export async function agregarNotaCM({ texto, color, autor }) {
  await appendRows('NotasCM', [{
    Texto: texto, Color: COLORES_NOTA.includes(color) ? color : 'amarillo', Autor: autor || '',
    Id: `nota-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  }]);
}
export async function eliminarNotaCM(rowIndex) {
  await patchRow('NotasCM', rowIndex, { Texto: '', Color: '', Autor: '', Id: '' });
}
