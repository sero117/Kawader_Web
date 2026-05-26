import { chromium } from './node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';

mkdirSync('./responsive-screenshots', { recursive: true });

const viewports = [
  { name: 'mobile-375',  width: 375,  height: 812  },
  { name: 'mobile-414',  width: 414,  height: 896  },
  { name: 'tablet-768',  width: 768,  height: 1024 },
  { name: 'desktop-1280',width: 1280, height: 800  },
];

const routes = [
  { path: '/auth/login',               name: 'login' },
  { path: '/auth/register',            name: 'register' },
  { path: '/auth/company-setup',       name: 'company-setup' },
  { path: '/auth/employee-activation', name: 'employee-activation' },
];

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vp.width, height: vp.height });

  for (const r of routes) {
    try {
      await page.goto(`http://localhost:4200${r.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(700);
      const shot = `./responsive-screenshots/${vp.name}--${r.name}.png`;
      await page.screenshot({ path: shot, fullPage: true });

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
      console.log(`${hasOverflow ? 'OVERFLOW' : 'OK'} | ${vp.name} | ${r.name}`);
    } catch(e) {
      console.log(`SKIP | ${vp.name} | ${r.name} | ${e.message.slice(0,80)}`);
    }
  }
  await page.close();
}

await browser.close();
console.log('\nAll screenshots saved to ./responsive-screenshots/');
