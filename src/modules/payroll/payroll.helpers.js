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

const mapRequestToPayrollNoveltyRows = (requestRow, monthlySalary, subsidioTransporte = 0, topeSubsidioTransporte = 0) => {
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
    return [];
  }

  let concept = '';
  let category = 'INFORMATIVA';
  let amount = 0;
  let quantity = overlappingDays;
  const fullDaysValue = dailySalary * overlappingDays;
  const fullHoursValue = hourlySalary * requestedHours;
  const unpaidFactor = 1 - paidFactor;

  if (requestRow.tipo === 'VACACIONES') {
    const tieneSubsidio = monthlySalary < topeSubsidioTransporte && subsidioTransporte > 0;
    const transportDailyValue = tieneSubsidio ? subsidioTransporte / 30 : 0;
    
    // Si existen los campos de división, los usamos. 
    // Si no, asumimos que todos los dias solicitados son para disfrutar (compatibilidad hacia atras).
    const dDisfrutar = Number(requestRow.dias_disfrutar || 0);
    const dDinero = Number(requestRow.dias_dinero || 0);
    const hasSplitData = (dDisfrutar + dDinero) > 0;

    // Los días que efectivamente se ausenta para la nómina actual son los que se cruzan con el periodo y son "a disfrutar".
    // Si no tiene split data, usamos el cálculo tradicional basado en overlappingDays.
    const effectiveEnjoyedDays = hasSplitData ? Math.min(overlappingDays, dDisfrutar) : overlappingDays;
    
    const results = [];

    if (effectiveEnjoyedDays > 0) {
      const transportDeduction = Number((transportDailyValue * effectiveEnjoyedDays).toFixed(2));

      results.push(
        {
          id_solicitud: requestRow.id_solicitud,
          tipo: requestRow.tipo,
          sub_tipo: requestRow.sub_tipo,
          fecha_inicio: requestRow.fecha_inicio,
          fecha_fin: requestRow.fecha_fin,
          cantidad: effectiveEnjoyedDays,
          unidad: 'DIAS',
          porcentaje_pago: paymentPercentage,
          es_remunerado: Number(requestRow.es_remunerado) === 1,
          origen_novedad: requestRow.origen_novedad,
          categoria: 'INFORMATIVA',
          concepto: `Vacaciones disfrutadas (${effectiveEnjoyedDays} dias)`,
          valor: 0
        },
        {
          id_solicitud: requestRow.id_solicitud,
          tipo: requestRow.tipo,
          sub_tipo: requestRow.sub_tipo,
          fecha_inicio: requestRow.fecha_inicio,
          fecha_fin: requestRow.fecha_fin,
          cantidad: effectiveEnjoyedDays,
          unidad: 'DIAS',
          porcentaje_pago: paymentPercentage,
          es_remunerado: Number(requestRow.es_remunerado) === 1,
          origen_novedad: requestRow.origen_novedad,
          categoria: transportDeduction > 0 ? 'DEDUCCION' : 'INFORMATIVA',
          concepto: `Descuento subsidio transporte por vacaciones (${effectiveEnjoyedDays} dias)`,
          valor: transportDeduction
        }
      );
    }

    // El pago en dinero se realiza una sola vez (usualmente en el primer periodo que toque la fecha de inicio).
    // Para simplificar, si hay dDinero y estamos en el periodo de inicio, lo pagamos.
    const isPeriodOfStart = new Date(requestRow.fecha_inicio) >= new Date(requestRow.periodo_inicio) && 
                           new Date(requestRow.fecha_inicio) <= new Date(requestRow.periodo_fin);

    if (dDinero > 0 && isPeriodOfStart) {
      const vacationMoneyValue = Number((dailySalary * dDinero).toFixed(2));
      results.push({
        id_solicitud: requestRow.id_solicitud,
        tipo: requestRow.tipo,
        sub_tipo: requestRow.sub_tipo,
        fecha_inicio: requestRow.fecha_inicio,
        fecha_fin: requestRow.fecha_fin,
        cantidad: dDinero,
        unidad: 'DIAS',
        porcentaje_pago: paymentPercentage,
        es_remunerado: true,
        origen_novedad: requestRow.origen_novedad,
        categoria: 'DEVENGADO',
        concepto: `Compensacion vacaciones en dinero (${dDinero} dias)`,
        valor: vacationMoneyValue
      });
    }

    return results;
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
      concept = `Incapacidad laboral pagada (${overlappingDays} dias)`;
      category = 'INFORMATIVA';
      amount = 0;
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
      concept = `Licencia ${normalizedSubtype.toLowerCase()} pagada (${overlappingDays} dias)`;
      category = 'INFORMATIVA';
      amount = 0;
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

  return [{
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
  }];
};

const buildPayrollNoveltyDetailRows = (idNomina, novelties) => (
  novelties
    .filter((novelty) => novelty && novelty.concepto && Number(novelty.valor) > 0)
    .map((novelty) => [idNomina, String(novelty.concepto).slice(0, 100), Number(novelty.valor)])
);

const getPayrollNoveltiesForPeriod = async ({ pool, idEmpleado, fechaInicio, fechaCorte, subsidioTransporte = 0, topeSubsidioTransporte = 0 }) => {
  const [employeeRows] = await pool.query(
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

  const [requestRows] = await pool.query(
    `SELECT
      s.id_solicitud,
      s.id_empleado,
      s.tipo,
      s.sub_tipo,
      s.fecha_inicio,
      s.fecha_fin,
      s.dias_solicitados,
      s.dias_disfrutar,
      s.dias_dinero,
      s.horas_solicitadas,
      s.es_remunerado,
      s.porcentaje_pago,
      s.origen_novedad,
      ? AS periodo_inicio,
      ? AS periodo_fin
    FROM solicitudes_laborales s
    WHERE s.id_empleado = ?
      AND s.estado = ?
      AND s.fecha_inicio <= ?
      AND s.fecha_fin >= ?
    ORDER BY s.fecha_inicio ASC, s.id_solicitud ASC`,
    [fechaInicio, fechaCorte, idEmpleado, APPROVED_STATUS, fechaCorte, fechaInicio]
  );

  const novelties = requestRows.flatMap((row) => mapRequestToPayrollNoveltyRows(row, monthlySalary, subsidioTransporte, topeSubsidioTransporte));

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
  mapRequestToPayrollNoveltyRows,
  buildPayrollNoveltyDetailRows,
  getPayrollNoveltiesForPeriod
};
