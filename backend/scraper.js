import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

/**
 * Parses numeric price from string (e.g., "$19.99" -> 19.99)
 */
export function parsePrice(rawPrice) {
  if (!rawPrice) return null;

  const cleanStr = String(rawPrice)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9,.-]/g, '')
    .replace(/^[.,]+(?=\d)/, '');
  if (!cleanStr || cleanStr === '-' || cleanStr === '.' || cleanStr === ',') return null;

  const hasDot = cleanStr.includes('.');
  const hasComma = cleanStr.includes(',');

  if (hasDot && hasComma) {
    const lastDot = cleanStr.lastIndexOf('.');
    const lastComma = cleanStr.lastIndexOf(',');
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const groupSeparator = decimalSeparator === '.' ? ',' : '.';
    const normalized = cleanStr
      .replace(new RegExp(`\\${groupSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (hasComma) {
    const parts = cleanStr.split(',');
    if (parts.length > 2) {
      const parsed = Number(parts.join(''));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    const lastPartLength = parts[parts.length - 1].length;
    const numeric = lastPartLength <= 2 ? parts.join('.') : parts.join('');
    const parsed = Number(numeric);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (hasDot) {
    const parts = cleanStr.split('.');
    if (parts.length > 2) {
      const parsed = Number(parts.join(''));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    const lastPartLength = parts[parts.length - 1].length;
    const numeric = lastPartLength <= 2 ? cleanStr : parts.join('');
    const parsed = Number(numeric);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  const parsed = Number(cleanStr);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Strategy 1: Lightweight HTTP Scraping (Axios + Cheerio)
 */
async function scrapeWithHttp(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 8000
  });

  const $ = cheerio.load(response.data);

  // Selector list covering common mock store patterns
  const priceText = $('.price, .product-price, [data-price], .amount').first().text().trim();
  const stockText = $('.stock, .availability, .in-stock, .stock-status').first().text().trim() || 'In Stock';

  const cleanPrice = parsePrice(priceText);
  if (!cleanPrice) {
    throw new Error(`Lightweight HTTP fetch could not extract a valid price. Raw text: "${priceText}"`);
  }

  return { price: cleanPrice, stockStatus: stockText };
}

/**
 * Strategy 2: Browser-based Scraping (Playwright)
 * Used as fallback or during HEADED=true video recording runs.
 */
async function scrapeWithBrowser(url, isHeaded) {
  let browser = null;
  try {
    browser = await chromium.launch({
      headless: !isHeaded,
      slowMo: isHeaded ? 400 : 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(10000);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const layout = await page.evaluate(async () => {
      const response = await fetch('/api/layout');
      if (!response.ok) throw new Error(`Layout request failed with HTTP ${response.status}`);
      return response.json();
    });

    const priceBlock = page.locator(`[class~="${layout.classes.priceWrap}"]`).first();
    await priceBlock.waitFor({ state: 'visible' });
    const box = await priceBlock.boundingBox();
    if (!box) throw new Error('Price area was not measurable');

    // The store requires real pointer movement before it enables price reveal.
    const moveCount = 10;
    for (let index = 0; index < moveCount; index++) {
      const x = box.x + (box.width * (index + 1)) / (moveCount + 1);
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(700);

    const revealButton = page.getByRole('button', { name: /reveal price/i });
    await revealButton.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const button = document.querySelector('button[aria-label="Reveal price"]');
      return button && !button.disabled;
    }, null, { timeout: 10000 });
    await revealButton.click();

    const priceSelector = `[class~="${layout.classes.priceValue}"]`;
    await page.waitForSelector(priceSelector, { state: 'visible', timeout: 15000 });
    const priceText = await page.locator(priceSelector).first().textContent();
    const stockText = await page.locator(`[class~="${layout.classes.stock}"]`).first().textContent().catch(() => 'Unknown');

    const cleanPrice = parsePrice(priceText);
    if (!cleanPrice) {
      throw new Error(`Browser scrape extracted invalid price: "${priceText}"`);
    }

    await browser.close();
    return { price: cleanPrice, stockStatus: stockText.trim() };

  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

/**
 * Core export: Scrapes a product URL with retries and validation
 */
export async function scrapeProduct(url, maxRetries = 3) {
  const isHeaded = process.env.HEADED === 'true';
  let attempts = 0;
  let lastError = null;

  while (attempts < maxRetries) {
    attempts++;
    console.log(`[Attempt ${attempts}/${maxRetries}] Scraping URL: ${url}`);

    try {
      let result;

      if (isHeaded) {
        // Force browser when recording video in headed mode
        result = await scrapeWithBrowser(url, true);
      } else {
        // Try fast HTTP fetch first; fallback to browser if needed
        try {
          result = await scrapeWithHttp(url);
        } catch (httpErr) {
          console.warn(`[HTTP Fetch Failed]: ${httpErr.message}. Retrying via Playwright...`);
          result = await scrapeWithBrowser(url, false);
        }
      }

      console.log(`[Scrape Success]: Price $${result.price} | Stock: ${result.stockStatus}`);
      return {
        price: result.price,
        stockStatus: result.stockStatus,
        attempts: attempts,
        error: null
      };

    } catch (err) {
      lastError = err.message;
      console.error(`[Scrape Error - Attempt ${attempts}]: ${err.message}`);

      // Exponential backoff before next attempt (2s, 4s, etc.)
      if (attempts < maxRetries) {
        const backoff = attempts * 2000;
        await new Promise((res) => setTimeout(res, backoff));
      }
    }
  }

  // Return explicit failure details (never return $0 or fake prices)
  return {
    price: null,
    stockStatus: 'Unknown',
    attempts: attempts,
    error: lastError || 'Max retry limit reached'
  };
}