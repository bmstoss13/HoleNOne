import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const courseId = '877'; // dynamically generated eventually
const courseUrl = `https://www.golfnow.com/tee-times/facility/${courseId}-dubsdread-golf-course/search`;

export async function fetchTeeTimes(date: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const searchUrl = `${courseUrl}#date=${date}&hotdealsonly=false&...`;

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

  // Wait for tee time cards
  await page.waitForSelector('[data-testid="tee-time-card"]', { timeout: 10000 });

  const teeTimes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-testid="tee-time-card"]')).map(card => ({
      time: card.querySelector('.time')?.textContent,
      price: card.querySelector('.price')?.textContent,
    }));
  });

  await browser.close();
  return teeTimes;
}