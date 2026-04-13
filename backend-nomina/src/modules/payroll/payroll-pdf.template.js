const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
};

const getRowCategory = (concept) => {
  const normalizedConcept = String(concept || '').trim().toUpperCase();

  if (
    normalizedConcept.includes('DESCUENTO') ||
    normalizedConcept.includes('SALUD') ||
    normalizedConcept.includes('PENSION') ||
    normalizedConcept.includes('AJUSTE INCAPACIDAD') ||
    normalizedConcept.includes('AJUSTE LICENCIA') ||
    normalizedConcept.includes('AJUSTE PERMISO')
  ) {
    return 'DEDUCCION';
  }

  if (
    normalizedConcept.includes('VACACIONES') ||
    normalizedConcept.includes('LICENCIA') ||
    normalizedConcept.includes('INCAPACIDAD') ||
    normalizedConcept.includes('PERMISO')
  ) {
    return 'NOVEDAD';
  }

  return 'DEVENGADO';
};

const buildPayrollPdfTemplate = ({ payroll, detailRows, overtimeRows }) => {
  const detailRowsWithCategory = detailRows.map((item) => ({
    ...item,
    category: getRowCategory(item.concepto)
  }));

  const buildTableRows = (rows, emptyMessage, type) => (
    rows.length > 0
      ? rows.map((item) => `
      <tr>
        <td>${item.concepto}</td>
        <td>
          <span class="concept-tag concept-tag--${type.toLowerCase()}">${type}</span>
        </td>
        <td style="text-align: right;">${formatCurrency(item.valor)}</td>
      </tr>
    `).join('')
      : `
      <tr>
        <td colspan="3" style="text-align: center; color: #64748b;">
          ${emptyMessage}
        </td>
      </tr>
    `
  );

  const devengadoRows = detailRowsWithCategory.filter((item) => item.category === 'DEVENGADO');
  const novedadRows = detailRowsWithCategory.filter((item) => item.category === 'NOVEDAD');
  const deduccionRows = detailRowsWithCategory.filter((item) => item.category === 'DEDUCCION');

  const devengadosHtml = buildTableRows(devengadoRows, 'No hay devengados adicionales registrados', 'Devengado');
  const novedadesHtml = buildTableRows(novedadRows, 'No hay novedades informativas registradas', 'Novedad');
  const deduccionesHtml = buildTableRows(deduccionRows, 'No hay deducciones registradas', 'Deduccion');

  const overtimeHtml = overtimeRows.length > 0
    ? overtimeRows.map((item) => `
      <tr>
        <td>${item.tipo_hora}</td>
        <td style="text-align: center;">${item.horas}</td>
        <td style="text-align: right;">${formatCurrency(item.valor_total)}</td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="3" style="text-align: center; color: #64748b;">
          No hay horas extra registradas
        </td>
      </tr>
    `;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>Comprobante de Nomina</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 32px;
          color: #1e293b;
          background: #ffffff;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .title {
          font-size: 28px;
          font-weight: bold;
          margin: 0;
          color: #0f172a;
        }

        .subtitle {
          margin-top: 6px;
          color: #64748b;
          font-size: 14px;
        }

        .section {
          margin-bottom: 24px;
        }

        .section h2 {
          font-size: 16px;
          margin-bottom: 12px;
          color: #0f172a;
          border-left: 4px solid #2563eb;
          padding-left: 10px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 24px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
        }

        .info-item strong {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .info-item span {
          font-size: 14px;
          color: #0f172a;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }

        th {
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 13px;
          text-align: left;
          padding: 10px;
          border: 1px solid #dbeafe;
        }

        td {
          padding: 10px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }

        .concept-tag {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .concept-tag--devengado {
          background: #dcfce7;
          color: #166534;
        }

        .concept-tag--novedad {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .concept-tag--deduccion {
          background: #fee2e2;
          color: #991b1b;
        }

        .summary {
          margin-top: 24px;
          margin-left: auto;
          width: 320px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .summary-row:last-child {
          border-bottom: none;
        }

        .summary-row.total {
          background: #eff6ff;
          font-weight: bold;
          color: #1d4ed8;
        }

        .footer-note {
          margin-top: 30px;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">Comprobante de Nomina</h1>
          <p class="subtitle">Documento generado por el sistema de nomina</p>
        </div>
        <div>
          <strong>ID Nomina:</strong> ${payroll.id_nomina}
        </div>
      </div>

      <div class="section">
        <h2>Datos del Empleado</h2>
        <div class="info-grid">
          <div class="info-item">
            <strong>Empleado</strong>
            <span>${payroll.nombres} ${payroll.apellidos}</span>
          </div>
          <div class="info-item">
            <strong>Identificacion</strong>
            <span>${payroll.tipo_identificacion} - ${payroll.numero_identificacion}</span>
          </div>
          <div class="info-item">
            <strong>Cargo</strong>
            <span>${payroll.nombre_cargo}</span>
          </div>
          <div class="info-item">
            <strong>Departamento</strong>
            <span>${payroll.nombre_departamento}</span>
          </div>
          <div class="info-item">
            <strong>Fecha inicio</strong>
            <span>${String(payroll.fecha_inicio).split('T')[0]}</span>
          </div>
          <div class="info-item">
            <strong>Fecha corte</strong>
            <span>${String(payroll.fecha_corte).split('T')[0]}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Devengados Base y Adicionales</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Tipo</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${devengadosHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Novedades Aplicadas</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Tipo</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${novedadesHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Deducciones</h2>
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Tipo</th>
              <th style="text-align: right;">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${deduccionesHtml}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Horas Extra</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th style="text-align: center;">Horas</th>
              <th style="text-align: right;">Valor total</th>
            </tr>
          </thead>
          <tbody>
            ${overtimeHtml}
          </tbody>
        </table>
      </div>

      <div class="summary">
        <div class="summary-row">
          <span>Total devengado</span>
          <span>${formatCurrency(payroll.total_devengado)}</span>
        </div>
        <div class="summary-row">
          <span>Total deducciones</span>
          <span>${formatCurrency(payroll.total_deducciones)}</span>
        </div>
        <div class="summary-row total">
          <span>Neto a pagar</span>
          <span>${formatCurrency(payroll.total_pagar)}</span>
        </div>
      </div>

      <div class="footer-note">
        Este comprobante fue generado automaticamente por el sistema.
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  buildPayrollPdfTemplate
};
