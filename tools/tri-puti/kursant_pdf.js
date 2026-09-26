const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.goto('file://' + __dirname + '/kursant.html', { waitUntil: 'load' });
  await p.pdf({ path: __dirname + '/tri-puti-kursant.pdf', format: 'A4', printBackground: true });
  await b.close(); console.log('pdf ok');
})();
