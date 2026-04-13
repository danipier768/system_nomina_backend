const puppeteer = require('puppeteer');
const { buildPayrollPdfTemplate } = require('./payroll-pdf.template');

const generatePayrollPdfBuffer = async ({ payroll, detailRows, overtimeRows }) => {
  let browser;

  try {
    const html = buildPayrollPdfTemplate({ payroll, detailRows, overtimeRows });

    browser = await puppeteer.launch({
      headless: true
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

module.exports = {
  generatePayrollPdfBuffer
};
