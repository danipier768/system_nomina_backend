const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatCurrency = (value) => new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return '';
  return String(value).split('T')[0];
};

const buildPeriodLabel = ({ anio, mes }) => (
  mes ? `${String(mes).padStart(2, '0')}/${anio}` : `Anio ${anio}`
);

const buildPayrollReportPdfTemplate = ({ rows, resumen, filtros }) => {
  const rowsHtml = rows.length > 0
    ? rows.map((row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.empleado)}</strong>
          <span>${escapeHtml(row.tipo_identificacion)} ${escapeHtml(row.numero_identificacion)}</span>
        </td>
        <td>${escapeHtml(row.cargo || 'Sin cargo')}</td>
        <td>${escapeHtml(row.departamento || 'Sin departamento')}</td>
        <td>${formatCurrency(row.salario_basico)}</td>
        <td class="center">${Number(row.heo) || 0}</td>
        <td class="center">${Number(row.hef) || 0}</td>
        <td class="center">${Number(row.hen) || 0}</td>
        <td class="center">${Number(row.hefn) || 0}</td>
        <td>${formatCurrency(row.total_devengado)}</td>
        <td>${formatCurrency(row.total_deducciones)}</td>
        <td class="net">${formatCurrency(row.total_pagar)}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="11" class="empty">No hay nominas para los filtros seleccionados.</td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Reporte detallado de nomina</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          font-family: Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 18px;
        }
        h1 {
          margin: 0 0 6px;
          font-size: 26px;
        }
        .subtitle {
          margin: 0;
          color: #64748b;
          font-size: 13px;
        }
        .meta {
          text-align: right;
          color: #334155;
          font-size: 12px;
          line-height: 1.6;
          min-width: 220px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        .summary-item {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          background: #f8fafc;
        }
        .summary-item span {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .summary-item strong {
          font-size: 14px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #dbeafe;
          padding: 8px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
        }
        td {
          border: 1px solid #e2e8f0;
          padding: 8px;
          font-size: 10px;
          vertical-align: top;
        }
        td span {
          display: block;
          color: #64748b;
          font-size: 9px;
          margin-top: 3px;
        }
        .center { text-align: center; }
        .net {
          color: #0b57d0;
          font-weight: 700;
        }
        .empty {
          text-align: center;
          color: #64748b;
          padding: 24px;
        }
        .footer {
          margin-top: 16px;
          text-align: center;
          color: #64748b;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Reporte detallado de nomina</h1>
          <p class="subtitle">Consolidado administrativo generado desde DSV Payroll.</p>
        </div>
        <div class="meta">
          <div><strong>Periodo:</strong> ${escapeHtml(buildPeriodLabel(filtros))}</div>
          <div><strong>Filtro empleado:</strong> ${filtros.id_empleado ? 'Si' : 'No'}</div>
          <div><strong>Generado:</strong> ${formatDate(new Date().toISOString())}</div>
        </div>
      </div>

      <div class="summary">
        <div class="summary-item">
          <span>Nominas</span>
          <strong>${Number(resumen.totalNominas) || 0}</strong>
        </div>
        <div class="summary-item">
          <span>Total devengado</span>
          <strong>${formatCurrency(resumen.totalDevengado)}</strong>
        </div>
        <div class="summary-item">
          <span>Total deducciones</span>
          <strong>${formatCurrency(resumen.totalDeducciones)}</strong>
        </div>
        <div class="summary-item">
          <span>Total pagado</span>
          <strong>${formatCurrency(resumen.totalPagado)}</strong>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Empleado</th>
            <th>Cargo</th>
            <th>Departamento</th>
            <th>Salario</th>
            <th>HEO</th>
            <th>HEF</th>
            <th>HEN</th>
            <th>HEFN</th>
            <th>Devengado</th>
            <th>Deducciones</th>
            <th>Neto</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        Este reporte fue generado automaticamente por el sistema.
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  buildPayrollReportPdfTemplate
};
