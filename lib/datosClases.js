import { readSheet, appendRow, appendRows, patchRow, clearRows } from './sheets';

export async function leerClases() {
  const filas = await readSheet('Clases');
  return filas
    .filter((f) => f.Codigo) // las filas "borradas" quedan en blanco (no se pueden eliminar de
    // verdad vía la API) — sin Codigo no son una clase real, hay que descartarlas acá.
    .map((f) => ({
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

/**
 * Lee la pestaña "Formaciones" del Sheet — fechas y estado reales cargados a mano
 * (Codigo, Edicion, FechaInicio, FechaFinal, Estado), como referencia autoritativa cuando
 * el número del horario recurrente no alcanza para saber si una edición ya terminó.
 */
export async function leerFormacionesManual() {
  const filas = await readSheet('Formaciones');
  return filas.filter((f) => f.Codigo).map((f) => ({
    codigo: f.Codigo, edicion: f.Edicion || '', fechaInicio: f.FechaInicio || '',
    fechaFinal: f.FechaFinal || '', estado: f.Estado || '',
    mesesCertificacion: f.MesesCertificacion ? parseInt(f.MesesCertificacion, 10) : null
  }));
}

export async function agregarClase(clase) {
  await agregarClases([clase]);
}

function filaClase(clase) {
  return {
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
  };
}

/** Agrega muchas clases de una vez, en un solo llamado a la API (clave para cargas masivas). */
export async function agregarClases(clases) {
  await appendRows('Clases', clases.map(filaClase));
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

/**
 * Detecta clases duplicadas (mismo curso+número+día+hora+sala+fecha — la misma clase cargada
 * más de una vez, típicamente por una auto-carga que se disparó dos veces) y borra las copias
 * de más, dejando solo una de cada una. Devuelve cuántas se borraron.
 */
export async function limpiarClasesDuplicadas() {
  const clases = await leerClases();
  const vistos = new Map(); // firma -> primera clase encontrada (la que se conserva)
  const aBorrar = [];

  clases.forEach((c) => {
    const firma = `${c.codigo}|${c.numero}|${c.dia}|${c.horaMin}|${c.sala}|${c.fecha || ''}`;
    if (vistos.has(firma)) {
      aBorrar.push(c._rowIndex);
    } else {
      vistos.set(firma, c);
    }
  });

  if (aBorrar.length > 0) {
    await clearRows('Clases', aBorrar);
  }
  return aBorrar.length;
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

export async function agregarFeriado({ fecha, motivo, bloquea }) {
  await agregarFeriados([{ fecha, motivo, bloquea }]);
}

/** Agrega muchos feriados de una vez, en un solo llamado a la API (clave para cargas masivas). */
export async function agregarFeriados(items) {
  const filas = items.map((f, i) => ({
    Fecha: f.fecha, Motivo: f.motivo, Tipo: 'Manual', Bloquea: f.bloquea ? 'TRUE' : 'FALSE',
    Id: `f-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
  }));
  await appendRows('Feriados', filas);
}

export async function actualizarFeriado(rowIndex, cambios) {
  const patch = {};
  if (cambios.fecha) patch.Fecha = cambios.fecha;
  if (cambios.motivo) patch.Motivo = cambios.motivo;
  if (typeof cambios.bloquea === 'boolean') patch.Bloquea = cambios.bloquea ? 'TRUE' : 'FALSE';
  await patchRow('Feriados', rowIndex, patch);
}

export async function eliminarFeriado(rowIndex) {
  await patchRow('Feriados', rowIndex, { Fecha: '', Motivo: '', Tipo: '', Bloquea: '', Id: '' });
}

export async function leerPostergaciones() {
  const filas = await readSheet('Postergaciones');
  return filas.filter((f) => f.Codigo).map((f) => ({
    codigo: f.Codigo, edicion: f.Edicion || '1', numero: f.Numero,
    fechaOriginal: f.FechaOriginal, fechaNueva: f.FechaNueva, motivo: f.Motivo,
    observaciones: f.Observaciones || '', usuario: f.Usuario, fechaRegistro: f.FechaRegistro
  }));
}

export async function leerActividades() {
  const filas = await readSheet('ActividadesCronograma');
  return filas.filter((f) => f.Tipo).map((f) => ({
    id: f.Id || String(f._rowIndex),
    fecha: f.Fecha || '', dia: f.Dia || '', tipo: f.Tipo,
    curso: f.Curso || '', nombreCurso: f.NombreCurso || '', edicion: f.Edicion || '',
    horaMin: f.HoraMin ? parseInt(f.HoraMin, 10) : null, horaTxt: f.HoraTxt || '',
    docente: f.Docente || '', tematica: f.Tematica || '', observaciones: f.Observaciones || ''
  }));
}

export async function agregarActividad(act) {
  await agregarActividades([act]);
}

function filaActividad(act, idx) {
  return {
    Fecha: act.fecha || '', Dia: act.dia || '', Tipo: act.tipo, Curso: act.curso || '',
    NombreCurso: act.nombreCurso || '', Edicion: act.edicion || '',
    HoraMin: act.horaMin != null ? String(act.horaMin) : '', HoraTxt: act.horaTxt || '',
    Docente: act.docente || '', Tematica: act.tematica || '', Observaciones: act.observaciones || '',
    Id: act.id || `a-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`
  };
}

/** Agrega muchas actividades de una vez, en un solo llamado a la API (clave para cargas masivas). */
export async function agregarActividades(items) {
  await appendRows('ActividadesCronograma', items.map(filaActividad));
}

export async function leerHistorialCompleto() {
  const filas = await readSheet('Historial');
  return filas.filter((f) => f.Fecha).map((f) => ({
    fecha: f.Fecha, email: f.Email, usuario: f.Usuario, accion: f.Accion, detalle: f.Detalle
  })).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
