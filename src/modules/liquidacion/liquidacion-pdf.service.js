const isServerless = !!process.env.VERCEL || !!process.env.RENDER;
const puppeteer = isServerless ? require('puppeteer-core') : require('puppeteer');
const { buildLiquidacionPdfTemplate } = require('./liquidacion-pdf.template');

const generateLiquidacionPdfBuffer = async ({ liquidacion, detalle, empleado }) => {
  let browser;

  try {
    const html = buildLiquidacionPdfTemplate({ liquidacion, detalle, empleado });

    if (isServerless) {
      const chromium = require('@sparticuz/chromium');
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { generateLiquidacionPdfBuffer };
