const buildLiquidacionPdfTemplate = ({ liquidacion, detalle, empleado }) => {
  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value) || 0);

  const detailRows = (Array.isArray(detalle) ? detalle : [])
    .map((d) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0">${d.concepto}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center">${d.tipo === 'DEDUCCION' ? 'Deducción' : 'Devengado'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right">${d.tipo === 'DEDUCCION' ? `(${formatCurrency(d.valor)})` : formatCurrency(d.valor)}</td>
      </tr>
    `).join('');

  const estadoLabel = liquidacion.estado === 'PAGADA' ? 'PAGADA' : liquidacion.estado === 'ANULADA' ? 'ANULADA' : 'PENDIENTE';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 16px; }
    .header h1 { color: #2563eb; margin: 0 0 4px; font-size: 22px; }
    .header p { color: #64748b; margin: 0; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-pagada { background: #dcfce7; color: #15803d; }
    .badge-pendiente { background: #fef3c7; color: #b45309; }
    .badge-anulada { background: #fef2f2; color: #dc2626; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; font-size: 13px; }
    .info-grid .label { color: #64748b; }
    .info-grid .value { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px; font-size: 13px; }
    .total-row td { font-weight: 700; font-size: 15px; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 12px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>LIQUIDACIÓN DE CONTRATO</h1>
    <p>Documento de liquidación de prestaciones sociales</p>
  </div>

  <div style="text-align: center; margin-bottom: 16px;">
    <span class="badge badge-${liquidacion.estado?.toLowerCase()}">${estadoLabel}</span>
  </div>

  <div class="info-grid">
    <div><span class="label">Empleado:</span> <span class="value">${empleado}</span></div>
    <div><span class="label">Documento:</span> <span class="value">${liquidacion.tipo_identificacion || ''} ${liquidacion.numero_identificacion || ''}</span></div>
    <div><span class="label">Cargo:</span> <span class="value">${liquidacion.nombre_cargo || ''}</span></div>
    <div><span class="label">Departamento:</span> <span class="value">${liquidacion.nombre_departamento || ''}</span></div>
    <div><span class="label">Fecha Ingreso:</span> <span class="value">${liquidacion.fecha_ingreso ? String(liquidacion.fecha_ingreso).split('T')[0] : ''}</span></div>
    <div><span class="label">Fecha Retiro:</span> <span class="value">${String(liquidacion.fecha_retiro).split('T')[0]}</span></div>
    <div><span class="label">Salario Base:</span> <span class="value">${formatCurrency(liquidacion.salario_base)}</span></div>
    <div><span class="label">Días Laborados Año:</span> <span class="value">${liquidacion.dias_trabajados_anio}</span></div>
    <div><span class="label">Motivo:</span> <span class="value">${liquidacion.motivo_retiro || 'No especificado'}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th style="text-align: center">Tipo</th>
        <th style="text-align: right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" style="text-align: right">TOTAL LIQUIDACIÓN</td>
        <td style="text-align: right">${formatCurrency(liquidacion.total_liquidacion)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px;">
    <div style="text-align: center;">
      <div style="border-top: 1px solid #94a3b8; padding-top: 8px; width: 200px; font-size: 12px;">Firma Empleado</div>
    </div>
    <div style="text-align: center;">
      <div style="border-top: 1px solid #94a3b8; padding-top: 8px; width: 200px; font-size: 12px;">Firma Empresa</div>
    </div>
  </div>

  <div class="footer">
    <p>Este documento constituye la liquidación definitiva de prestaciones sociales.</p>
    <p>Generado por DSVPayroll - ${new Date().toLocaleDateString('es-CO')}</p>
  </div>
</body>
</html>
  `;
};

module.exports = { buildLiquidacionPdfTemplate };
