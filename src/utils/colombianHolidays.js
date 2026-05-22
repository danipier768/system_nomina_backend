function calcularDomingoPascua(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, mes - 1, dia);
}

function siguienteLunes(fecha) {
  const diaSemana = fecha.getDay();
  if (diaSemana === 1) return fecha;
  const diff = diaSemana === 0 ? 1 : (8 - diaSemana);
  const result = new Date(fecha);
  result.setDate(result.getDate() + diff);
  return result;
}

function copiarFecha(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function esFestivoColombia(fecha, year) {
  const festivos = obtenerFestivosColombia(year);
  const ts = fecha.getTime();
  return festivos.some(f => f.getTime() === ts);
}

function obtenerFestivosColombia(year) {
  const pascua = calcularDomingoPascua(year);
  const juevesSanto = new Date(pascua);
  juevesSanto.setDate(juevesSanto.getDate() - 3);
  const viernesSanto = new Date(pascua);
  viernesSanto.setDate(viernesSanto.getDate() - 2);

  const F = [
    { d: 1, m: 0, movable: false },                   // Año Nuevo
    { d: 6, m: 0, movable: true },                    // Reyes Magos → lun siguiente
    { d: 19, m: 2, movable: true },                   // San José → lun siguiente
    { d: 1, m: 4, movable: false },                   // Día del Trabajo
    juevesSanto,
    viernesSanto,
    { d: 29, m: 5, movable: true },                   // San Pedro y San Pablo → lun siguiente
    { d: 20, m: 6, movable: false },                  // Independencia
    { d: 7, m: 7, movable: false },                   // Batalla de Boyacá
    { d: 15, m: 7, movable: true },                   // Asunción → lun siguiente
    { d: 12, m: 9, movable: true },                   // Día de la Raza → lun siguiente
    { d: 1, m: 10, movable: true },                   // Todos los Santos → lun siguiente
    { d: 11, m: 10, movable: true },                  // Independencia de Cartagena → lun siguiente
    { d: 8, m: 11, movable: false },                  // Inmaculada Concepción
    { d: 25, m: 11, movable: false },                 // Navidad
  ];

  const festivos = [];

  for (const item of F) {
    if (item instanceof Date) {
      festivos.push(copiarFecha(item));
    } else {
      const base = new Date(year, item.m, item.d);
      if (item.movable && item.d !== 1 && item.m !== 4) {
        festivos.push(siguienteLunes(base));
      } else {
        festivos.push(base);
      }
    }
  }

  const ascension = new Date(pascua);
  ascension.setDate(ascension.getDate() + 40);
  festivos.push(siguienteLunes(ascension));

  const corpusChristi = new Date(pascua);
  corpusChristi.setDate(corpusChristi.getDate() + 60);
  festivos.push(siguienteLunes(corpusChristi));

  const sagradoCorazon = new Date(pascua);
  sagradoCorazon.setDate(sagradoCorazon.getDate() + 68);
  festivos.push(siguienteLunes(sagradoCorazon));

  return festivos;
}

module.exports = {
  calcularDomingoPascua,
  siguienteLunes,
  esFestivoColombia,
  obtenerFestivosColombia,
};
