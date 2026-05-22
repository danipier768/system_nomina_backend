const { esFestivoColombia } = require('./colombianHolidays');

const JORNADA = {
  LUNES_VIERNES: 'LUNES_VIERNES',
  LUNES_SABADO: 'LUNES_SABADO',
};

function esDiaHabil(fecha, jornadaLaboral = JORNADA.LUNES_VIERNES) {
  const diaSemana = fecha.getDay();
  if (diaSemana === 0) return false;
  if (jornadaLaboral === JORNADA.LUNES_VIERNES && diaSemana === 6) return false;
  if (esFestivoColombia(fecha, fecha.getFullYear())) return false;
  return true;
}

function contarDiasHabiles(fechaInicio, fechaFin, jornadaLaboral = JORNADA.LUNES_VIERNES) {
  let count = 0;
  const current = new Date(fechaInicio);
  const end = new Date(fechaFin);

  while (current <= end) {
    if (esDiaHabil(current, jornadaLaboral)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function calcularFechaRegreso(fechaInicio, diasHabilesSolicitados, jornadaLaboral = JORNADA.LUNES_VIERNES) {
  const fechaRegreso = new Date(fechaInicio);
  let diasContados = 0;

  while (diasContados < diasHabilesSolicitados) {
    if (esDiaHabil(fechaRegreso, jornadaLaboral)) {
      diasContados++;
    }
    if (diasContados < diasHabilesSolicitados) {
      fechaRegreso.setDate(fechaRegreso.getDate() + 1);
    }
  }

  fechaRegreso.setDate(fechaRegreso.getDate() + 1);
  while (!esDiaHabil(fechaRegreso, jornadaLaboral)) {
    fechaRegreso.setDate(fechaRegreso.getDate() + 1);
  }

  return fechaRegreso;
}

function calcularDiasCalendario(fechaInicio, fechaFin) {
  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function contarDiasHabilesEnRango(fechaInicio, fechaFin, jornadaLaboral = JORNADA.LUNES_VIERNES) {
  const calendario = calcularDiasCalendario(fechaInicio, fechaFin);
  const habiles = contarDiasHabiles(fechaInicio, fechaFin, jornadaLaboral);
  const noHabiles = calendario - habiles;
  return { calendario, habiles, noHabiles };
}

module.exports = {
  JORNADA,
  esDiaHabil,
  contarDiasHabiles,
  contarDiasHabilesEnRango,
  calcularFechaRegreso,
  calcularDiasCalendario,
};
