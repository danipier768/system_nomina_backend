const ExcelJS = require('exceljs');

const currencyFormat = '"$"#,##0;[Red]-"$"#,##0';

const reportColumns = [
  { header: 'ID nomina', key: 'id_nomina', width: 12 },
  { header: 'Empleado', key: 'empleado', width: 32 },
  { header: 'Identificacion', key: 'identificacion', width: 20 },
  { header: 'Cargo', key: 'cargo', width: 24 },
  { header: 'Departamento', key: 'departamento', width: 22 },
  { header: 'Fecha ingreso', key: 'fecha_ingreso', width: 16 },
  { header: 'Periodo inicio', key: 'fecha_inicio', width: 16 },
  { header: 'Periodo corte', key: 'fecha_corte', width: 16 },
  { header: 'Tipo pago', key: 'tipo_pago', width: 14 },
  { header: 'Salario basico', key: 'salario_basico', width: 18 },
  { header: 'HEO', key: 'heo', width: 10 },
  { header: 'HEF', key: 'hef', width: 10 },
  { header: 'HEN', key: 'hen', width: 10 },
  { header: 'HEFN', key: 'hefn', width: 10 },
  { header: 'Total devengado', key: 'total_devengado', width: 18 },
  { header: 'Deduc. salud', key: 'deduccion_salud', width: 16 },
  { header: 'Deduc. ARL', key: 'deduccion_arl', width: 16 },
  { header: 'Deduc. pension', key: 'deduccion_pension', width: 18 },
  { header: 'Total deducciones', key: 'total_deducciones', width: 20 },
  { header: 'Neto a pagar', key: 'total_pagar', width: 18 }
];

const formatDate = (value) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

const buildPeriodLabel = ({ anio, mes }) => (
  mes ? `${String(mes).padStart(2, '0')}/${anio}` : `Anio ${anio}`
);

const generatePayrollReportExcelBuffer = async ({ rows, resumen, filtros }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DSV Payroll';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Reporte nomina', {
    views: [{ state: 'frozen', ySplit: 5 }]
  });

  worksheet.mergeCells('A1:T1');
  worksheet.getCell('A1').value = 'Reporte detallado de nomina';
  worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:T2');
  worksheet.getCell('A2').value = `Periodo: ${buildPeriodLabel(filtros)}${filtros.id_empleado ? ' | Empleado seleccionado' : ''}`;
  worksheet.getCell('A2').font = { size: 11, color: { argb: 'FF475569' } };
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.addRow([]);
  worksheet.columns = reportColumns.map(({ key, width }) => ({ key, width }));

  const headerRow = worksheet.getRow(4);
  headerRow.values = reportColumns.map((column) => column.header);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  rows.forEach((row) => {
    worksheet.addRow({
      ...row,
      identificacion: `${row.tipo_identificacion || ''} ${row.numero_identificacion || ''}`.trim(),
      fecha_ingreso: formatDate(row.fecha_ingreso),
      fecha_inicio: formatDate(row.fecha_inicio),
      fecha_corte: formatDate(row.fecha_corte)
    });
  });

  const totalRow = worksheet.addRow({
    empleado: 'Totales del reporte',
    salario_basico: rows.reduce((acc, row) => acc + (Number(row.salario_basico) || 0), 0),
    heo: rows.reduce((acc, row) => acc + (Number(row.heo) || 0), 0),
    hef: rows.reduce((acc, row) => acc + (Number(row.hef) || 0), 0),
    hen: rows.reduce((acc, row) => acc + (Number(row.hen) || 0), 0),
    hefn: rows.reduce((acc, row) => acc + (Number(row.hefn) || 0), 0),
    total_devengado: resumen.totalDevengado,
    deduccion_salud: rows.reduce((acc, row) => acc + (Number(row.deduccion_salud) || 0), 0),
    deduccion_arl: rows.reduce((acc, row) => acc + (Number(row.deduccion_arl) || 0), 0),
    deduccion_pension: rows.reduce((acc, row) => acc + (Number(row.deduccion_pension) || 0), 0),
    total_deducciones: resumen.totalDeducciones,
    total_pagar: resumen.totalPagado
  });

  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' }
  };

  const moneyColumns = ['J', 'O', 'P', 'Q', 'R', 'S', 'T'];
  moneyColumns.forEach((column) => {
    worksheet.getColumn(column).numFmt = currencyFormat;
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: rowNumber === 4 ? 'center' : 'left'
      };
    });
  });

  worksheet.autoFilter = {
    from: 'A4',
    to: 'T4'
  };

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  generatePayrollReportExcelBuffer
};
