import { chromium } from 'playwright-core';

const CHROMIUM_EXECUTABLE =
  process.env.CHROMIUM_EXECUTABLE_PATH ||
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

export interface PageSnapshot {
  html: string;            // Full rendered HTML (after JS execution)
  screenshotBase64: string;
  inlineStyles: string;
  inlineScripts: string;
  externalScripts: string[];
  externalStyles: string[];
}

export async function capturePageSnapshot(url: string): Promise<PageSnapshot> {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    args: LAUNCH_ARGS,
  });

  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait a bit more for animations to settle
    await page.waitForTimeout(1500);

    // Full-page screenshot
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const screenshotBase64 = screenshotBuffer.toString('base64');

    // Get fully rendered HTML
    const html = await page.content();

    // Extract styles and scripts from the rendered DOM
    const inlineStyles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('style'))
        .map((el) => el.textContent || '')
        .join('\n\n');
    });

    const inlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])'))
        .map((el) => el.textContent || '')
        .filter((s) => s.trim().length > 0)
        .join('\n\n');
    });

    const externalScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map((el) => (el as HTMLScriptElement).src)
        .filter(Boolean);
    });

    const externalStyles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => (el as HTMLLinkElement).href)
        .filter(Boolean);
    });

    return {
      html,
      screenshotBase64,
      inlineStyles: inlineStyles.slice(0, 10000),
      inlineScripts: inlineScripts.slice(0, 10000),
      externalScripts,
      externalStyles,
    };
  } finally {
    await browser.close();
  }
}
