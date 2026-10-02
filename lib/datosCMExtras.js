import { readSheet, appendRows, patchRow, patchRows } from './sheets';

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
export async function editarCampanaCM(rowIndex, cambios) {
  await patchRow('CampanasCM', rowIndex, {
    ...(cambios.titulo !== undefined ? { Titulo: cambios.titulo } : {}),
    ...(cambios.fecha !== undefined ? { Fecha: cambios.fecha || '' } : {}),
    ...(cambios.descripcion !== undefined ? { Descripcion: cambios.descripcion || '' } : {})
  });
}
export async function eliminarCampanaCM(rowIndex) {
  await patchRow('CampanasCM', rowIndex, { Titulo: '', Fecha: '', Descripcion: '', Id: '' });
}

// --- Enlaces ---
export async function leerEnlacesCM() {
  const filas = await readSheet('EnlacesCM');
  return filas.filter((f) => f.Titulo).map((f) => ({
    id: f.Id || String(f._rowIndex), categoria: f.Categoria || 'sitios', titulo: f.Titulo, url: f.Url || '',
    // Descripcion es opcional: si la pestaña "EnlacesCM" del Sheet todavía no tiene esa
    // columna, se lee vacío acá sin romper nada (y no se guarda hasta que se agregue).
    descripcion: f.Descripcion || '',
    // Orden: columna nueva para el arrastrar-y-soltar del Centro de recursos. Si la pestaña
    // todavía no la tiene, queda vacía acá (no rompe nada) y el frontend usa el orden de
    // siempre hasta que se guarde un primer reordenamiento.
    orden: f.Orden !== undefined && f.Orden !== '' ? Number(f.Orden) : null,
    _rowIndex: f._rowIndex
  }));
}
function filaEnlace(e, idx) {
  return {
    Categoria: e.categoria || 'sitios', Titulo: e.titulo, Url: e.url || '', Descripcion: e.descripcion || '',
    Orden: e.orden !== undefined && e.orden !== null ? String(e.orden) : '',
    Id: e.id || `link-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}
export async function agregarEnlaceCM(e) { await appendRows('EnlacesCM', [filaEnlace(e, 0)]); }
export async function agregarEnlacesCM(items) { await appendRows('EnlacesCM', items.map(filaEnlace)); }
export async function editarEnlaceCM(rowIndex, cambios) {
  await patchRow('EnlacesCM', rowIndex, {
    ...(cambios.categoria !== undefined ? { Categoria: cambios.categoria } : {}),
    ...(cambios.titulo !== undefined ? { Titulo: cambios.titulo } : {}),
    ...(cambios.url !== undefined ? { Url: cambios.url } : {}),
    ...(cambios.descripcion !== undefined ? { Descripcion: cambios.descripcion } : {}),
    ...(cambios.orden !== undefined ? { Orden: cambios.orden !== null ? String(cambios.orden) : '' } : {})
  });
}
export async function eliminarEnlaceCM(rowIndex) {
  await patchRow('EnlacesCM', rowIndex, { Categoria: '', Titulo: '', Url: '', Descripcion: '', Orden: '', Id: '' });
}

// Guarda el nuevo orden tras arrastrar y soltar en "Centro de recursos". `itemsOrdenados`
// es el array completo (fijos + del Sheet) ya en su posición final, tal como lo arma
// enlacesCombinados en el frontend — acá se traduce esa posición (el índice) a la columna
// Orden de cada fila real del Sheet, en UN solo llamado a la API.
//
// Un recurso "fijo" (todavía no tiene fila propia en el Sheet, vive solo en
// lib/cmDefaults.js) no se puede "patchear": recién cuando se lo reordena se "promueve"
// agregándole su primera fila real, ya con el Orden que le tocó — mismo criterio que ya
// usa el resto de la app para que un fijo editado deje de depender del código.
export async function reordenarEnlacesCM(itemsOrdenados) {
  const patches = [];
  const nuevos = [];
  itemsOrdenados.forEach((item, idx) => {
    if (item.esFijo) {
      nuevos.push(filaEnlace({
        categoria: item.categoria, titulo: item.titulo, url: item.url,
        descripcion: item.descripcion || '', orden: idx
      }, idx));
    } else if (item._rowIndex) {
      patches.push({ rowIndex: item._rowIndex, cambios: { Orden: String(idx) } });
    }
  });
  if (patches.length > 0) await patchRows('EnlacesCM', patches);
  if (nuevos.length > 0) await appendRows('EnlacesCM', nuevos);
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
