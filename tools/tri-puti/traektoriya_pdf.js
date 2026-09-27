// Рендер сборника «Траектория» в PDF. Запуск из корня репозитория:
//   python3 tools/tri-puti/traektoriya.py && node tools/tri-puti/traektoriya_pdf.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'traektoriya.html'), { waitUntil: 'load' });
  await p.pdf({ path: path.join(__dirname, 'traektoriya-kursant.pdf'), format: 'A4', printBackground: true });
  await b.close(); console.log('pdf ok');
})();
