import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer";

async function scrapeSoldPrices(terms) {
  const results = {};

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 1, // Lower for less memory
    puppeteerOptions: {
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  await cluster.task(async ({ page, data: term }) => {
    await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.resourceType() !== 'document') {
    req.abort();
  } else {
    req.continue();
  }
});

    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(term)}&LH_Sold=1&LH_Complete=1&_pgn=1`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Only extract prices
  const prices = await page.evaluate(() => {
    const rows = document.querySelectorAll(".s-card__price span, .s-card__price");
    return Array.from(rows)
      .map((el) => el.innerText)
      .filter(Boolean)
      .map((str) => {
        // Remove currency symbols and thousand separators, keep decimal
        const match = str.replace(/[^0-9.]/g, "").replace(/,/g, "");
        return parseFloat(match);
      })
      .filter((num) => !isNaN(num));
  });

    results[term] = prices.slice(0, 7); // Only return the first 7 prices
  });

  for (const term of Array.isArray(terms) ? terms : [terms]) {
    cluster.queue(term);
  }

  await cluster.idle();
  await cluster.close();

  return results;
}

export { scrapeSoldPrices };