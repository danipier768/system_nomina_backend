const { APPROVED_STATUS, MS_PER_DAY } = require('./payroll.constants');

const calculateOverlappingDays = (periodStart, periodEnd, requestStart, requestEnd) => {
  const effectiveStart = new Date(Math.max(new Date(periodStart).getTime(), new Date(requestStart).getTime()));
  const effectiveEnd = new Date(Math.min(new Date(periodEnd).getTime(), new Date(requestEnd).getTime()));

  if (effectiveEnd < effectiveStart) {
    return 0;
  }

  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.floor(diffMs / MS_PER_DAY) + 1;
};

const getOverlappingDateRange = (periodStart, periodEnd, requestStart, requestEnd) => {
  const effectiveStart = new Date(Math.max(new Date(periodStart).getTime(), new Date(requestStart).getTime()));
  const effectiveEnd = new Date(Math.min(new Date(periodEnd).getTime(), new Date(requestEnd).getTime()));

  if (effectiveEnd < effectiveStart) {
    return null;
  }

  return {
    effectiveStart,
    effectiveEnd
  };
};

const getCommonDisabilitySegments = (requestRow) => {
  const overlapRange = getOverlappingDateRange(
    requestRow.periodo_inicio,
    requestRow.periodo_fin,
    requestRow.fecha_inicio,
    requestRow.fecha_fin
  );

  if (!overlapRange) {
    return {
      employerDays: 0,
      epsSixtySixDays: 0,
      halfPayDays: 0
    };
  }

  const requestStart = new Date(requestRow.fecha_inicio);
  let current = new Date(overlapRange.effectiveStart);
  const counters = {
    employerDays: 0,
    epsSixtySixDays: 0,
    halfPayDays: 0
  };

  while (current <= overlapRange.effectiveEnd) {
    const incapacityDayNumber = Math.floor((current.getTime() - requestStart.getTime()) / MS_PER_DAY) + 1;

    if (incapacityDayNumber <= 2) {
      counters.employerDays += 1;
    } else if (incapacityDayNumber <= 90) {
      counters.epsSixtySixDays += 1;
    } else {
      counters.halfPayDays += 1;
    }

    current = new Date(current.getTime() + MS_PER_DAY);
  }

  return counters;
};

const normalizeSubtype = (subtype) => String(subtype || '').trim().toUpperCase();

const mapRequestToPayrollNovelty = (requestRow, monthlySalary) => {
  const overlappingDays = calculateOverlappingDays(
    requestRow.periodo_inicio,
    requestRow.periodo_fin,
    requestRow.fecha_inicio,
    requestRow.fecha_fin
  );

  const dailySalary = monthlySalary / 30;
  const hourlySalary = dailySalary / 8;
  const paymentPercentage = Number(requestRow.porcentaje_pago) || 0;
  const paidFactor = paymentPercentage / 100;
  const requestedHours = Number(requestRow.horas_solicitadas) || 0;
  const normalizedSubtype = normalizeSubtype(requestRow.sub_tipo);

  if (overlappingDays <= 0 && requestedHours <= 0) {
    return null;
  }

  let concept = '';
  let category = 'INFORMATIVA';
  let amount = 0;
  let quantity = overlappingDays;
  const fullDaysValue = dailySalary * overlappingDays;
  const fullHoursValue = hourlySalary * requestedHours;
  const unpaidFactor = 1 - paidFactor;

  if (requestRow.tipo === 'VACACIONES') {
    if (paidFactor >= 1) {
      concept = `Adicion vacaciones remuneradas (${overlappingDays} dias)`;
      category = 'DEVENGADO';
      amount = Number(fullDaysValue.toFixed(2));
    } else {
      const deductionAmount = fullDaysValue * unpaidFactor;
      concept = `Deduccion vacaciones (${overlappingDays} dias)`;
      category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
      amount = Number(deductionAmount.toFixed(2));
    }
  } else if (requestRow.tipo === 'PERMISO') {
    if (requestedHours > 0) {
      quantity = requestedHours;
      if (Number(requestRow.es_remunerado) === 1) {
        const deductionAmount = fullHoursValue * unpaidFactor;
        concept = `Ajuste permiso remunerado (${requestedHours} horas)`;
        category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
        amount = Number(deductionAmount.toFixed(2));
      } else {
        concept = `Descuento permiso no remunerado (${requestedHours} horas)`;
        category = 'DEDUCCION';
        amount = Number(fullHoursValue.toFixed(2));
      }
    } else if (Number(requestRow.es_remunerado) === 1) {
      const deductionAmount = fullDaysValue * unpaidFactor;
      concept = `Ajuste permiso remunerado (${overlappingDays} dias)`;
      category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
      amount = Number(deductionAmount.toFixed(2));
    } else {
      concept = `Descuento permiso no remunerado (${overlappingDays} dias)`;
      category = 'DEDUCCION';
      amount = Number(fullDaysValue.toFixed(2));
    }
  } else if (requestRow.tipo === 'INCAPACIDAD') {
    if (String(requestRow.origen_novedad || 'COMUN').toUpperCase() === 'LABORAL') {
      const deductionAmount = fullDaysValue * unpaidFactor;
      concept = `Ajuste incapacidad laboral (${overlappingDays} dias)`;
      category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
      amount = Number(deductionAmount.toFixed(2));
    } else {
      const segments = getCommonDisabilitySegments(requestRow);
      const deductionAmount =
        (dailySalary * segments.epsSixtySixDays * (1 - 0.6667)) +
        (dailySalary * segments.halfPayDays * 0.5);

      concept = `Ajuste incapacidad comun (${overlappingDays} dias)`;
      category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
      amount = Number(deductionAmount.toFixed(2));
    }
  } else if (requestRow.tipo === 'LICENCIA') {
    if (normalizedSubtype === 'MATERNIDAD' || normalizedSubtype === 'PATERNIDAD') {
      concept = `Adicion licencia ${normalizedSubtype.toLowerCase()} (${overlappingDays} dias)`;
      category = 'DEVENGADO';
      amount = Number(fullDaysValue.toFixed(2));
    } else if (Number(requestRow.es_remunerado) === 1) {
      const deductionAmount = fullDaysValue * unpaidFactor;
      concept = `Ajuste licencia remunerada (${overlappingDays} dias)`;
      category = deductionAmount > 0 ? 'DEDUCCION' : 'INFORMATIVA';
      amount = Number(deductionAmount.toFixed(2));
    } else {
      concept = `Descuento licencia no remunerada (${overlappingDays} dias)`;
      category = 'DEDUCCION';
      amount = Number(fullDaysValue.toFixed(2));
    }
  }

  return {
    id_solicitud: requestRow.id_solicitud,
    tipo: requestRow.tipo,
    sub_tipo: requestRow.sub_tipo,
    fecha_inicio: requestRow.fecha_inicio,
    fecha_fin: requestRow.fecha_fin,
    cantidad: quantity,
    unidad: requestedHours > 0 ? 'HORAS' : 'DIAS',
    porcentaje_pago: paymentPercentage,
    es_remunerado: Number(requestRow.es_remunerado) === 1,
    origen_novedad: requestRow.origen_novedad,
    categoria: category,
    concepto: concept,
    valor: amount
  };
};

const buildPayrollNoveltyDetailRows = (idNomina, novelties) => (
  novelties
    .filter((novelty) => novelty && novelty.concepto && Number(novelty.valor) > 0)
    .map((novelty) => [idNomina, String(novelty.concepto).slice(0, 100), Number(novelty.valor)])
);

const buildAppliedNoveltyRows = (idNomina, novelties) => (
  novelties
    .filter((novelty) => novelty && novelty.id_solicitud && novelty.concepto)
    .map((novelty) => [
      idNomina,
      novelty.id_solicitud,
      novelty.categoria || 'INFORMATIVA',
      String(novelty.concepto).slice(0, 120),
      Number(novelty.cantidad) || 0,
      novelty.unidad === 'HORAS' ? 'HORAS' : 'DIAS',
      Number(novelty.porcentaje_pago) || 0,
      Number(novelty.valor) || 0
    ])
);

const getPayrollNoveltiesForPeriod = async ({ db, idEmpleado, fechaInicio, fechaCorte }) => {
  const [employeeRows] = await db.query(
    `SELECT id_empleado, nombres, apellidos, sueldo
     FROM empleados
     WHERE id_empleado = ?
     LIMIT 1`,
    [idEmpleado]
  );

  if (employeeRows.length === 0) {
    throw new Error('Empleado no encontrado para calcular novedades');
  }

  const employee = employeeRows[0];
  const monthlySalary = Number(employee.sueldo) || 0;

  const [requestRows] = await db.query(
    `SELECT
      s.id_solicitud,
      s.id_empleado,
      s.tipo,
      s.sub_tipo,
      s.fecha_inicio,
      s.fecha_fin,
      s.dias_solicitados,
      s.horas_solicitadas,
      s.es_remunerado,
      s.porcentaje_pago,
      s.origen_novedad,
      ? AS periodo_inicio,
      ? AS periodo_fin
    FROM solicitudes_laborales s
    LEFT JOIN nomina_novedades_aplicadas nna ON nna.id_solicitud = s.id_solicitud
    WHERE s.id_empleado = ?
      AND s.estado = ?
      AND s.pendiente_liquidacion = 1
      AND s.liquidada_en_nomina = 0
      AND nna.id_solicitud IS NULL
      AND s.fecha_inicio <= ?
      AND s.fecha_fin >= ?
    ORDER BY s.fecha_inicio ASC, s.id_solicitud ASC`,
    [fechaInicio, fechaCorte, idEmpleado, APPROVED_STATUS, fechaCorte, fechaInicio]
  );

  const novelties = requestRows
    .map((row) => mapRequestToPayrollNovelty(row, monthlySalary))
    .filter(Boolean);

  const summary = novelties.reduce((acc, novelty) => {
    if (novelty.categoria === 'DEVENGADO') {
      acc.totalDevengado += novelty.valor;
    }

    if (novelty.categoria === 'DEDUCCION') {
      acc.totalDeducciones += novelty.valor;
    }

    acc.totalNovedades += 1;
    return acc;
  }, {
    totalNovedades: 0,
    totalDevengado: 0,
    totalDeducciones: 0
  });

  return {
    empleado: employee,
    novedades: novelties,
    resumen: {
      ...summary,
      totalDevengado: Number(summary.totalDevengado.toFixed(2)),
      totalDeducciones: Number(summary.totalDeducciones.toFixed(2)),
      totalImpactoNeto: Number((summary.totalDevengado - summary.totalDeducciones).toFixed(2))
    }
  };
};

module.exports = {
  calculateOverlappingDays,
  getOverlappingDateRange,
  getCommonDisabilitySegments,
  normalizeSubtype,
  mapRequestToPayrollNovelty,
  buildPayrollNoveltyDetailRows,
  buildAppliedNoveltyRows,
  getPayrollNoveltiesForPeriod
};
