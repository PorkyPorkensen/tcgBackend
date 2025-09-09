import { Cluster } from "puppeteer-cluster";
import puppeteer from "puppeteer";

// Example user-agents for randomization
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.70 Safari/537.36"
];

// Example Accept-Language headers for randomization
const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.8",
  "en-CA,en;q=0.7",
  "en,en-US;q=0.9",
  "en-AU,en;q=0.8"
];

// Example Referer headers for randomization
const REFERERS = [
  "https://www.ebay.com/",
  "https://www.google.com/",
  "https://www.bing.com/",
  "https://duckduckgo.com/",
  "https://search.yahoo.com/"
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
    // Randomize headers
    const userAgent = getRandom(USER_AGENTS);
    const acceptLanguage = getRandom(ACCEPT_LANGUAGES);
    const referer = getRandom(REFERERS);

    console.log(`\n--- Starting scrape for term: "${term}" ---`);
    console.log("User-Agent:", userAgent);
    console.log("Accept-Language:", acceptLanguage);
    console.log("Referer:", referer);

    await page.setUserAgent(userAgent);
    await page.setExtraHTTPHeaders({
      "Accept-Language": acceptLanguage,
      "Referer": referer,
      "DNT": "1",
      "Upgrade-Insecure-Requests": "1"
    });
    await page.setCacheEnabled(false);

    // Block unnecessary resources but allow xhr and script
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (!["document", "xhr", "script"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
      term
    )}&LH_Sold=1&LH_Complete=1&_pgn=1`;

    console.log("Fetching:", url);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Wait a bit for the page to settle
    await new Promise(res => setTimeout(res, 2000));

    // Debug: log first 1000 chars of HTML to check for CAPTCHA or blank page
    const html = await page.content();
    if (html.includes("Pardon Our Interruption") || html.includes("captcha")) {
      console.log("Blocked by eBay bot protection (after goto).");
      results[term] = [];
      return;
    }
    console.log(`--- HTML for term "${term}" ---`);
    console.log(html.slice(0, 1000));

    let prices = [];
    try {
      await page.waitForSelector(".s-card__price", { timeout: 10000 });
      // Check again for bot protection before evaluate
      const htmlCheck = await page.content();
      if (htmlCheck.includes("Pardon Our Interruption") || htmlCheck.includes("captcha")) {
        console.log("Blocked by eBay bot protection (before evaluate).");
        results[term] = [];
        return;
      }
      prices = await page.evaluate(() => {
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
      console.log(`Found ${prices.length} prices for "${term}"`);
    } catch (e) {
      console.error("Error during page.evaluate or waitForSelector:", e);
      results[term] = [];
      return;
    }

    results[term] = prices.slice(0, 7); // Only return the first 7 prices

    // Add a random delay (2-5 seconds) to avoid rate limiting
    await new Promise(res => setTimeout(res, 2000 + Math.random() * 3000));
    console.log(`--- Finished scrape for term: "${term}" ---\n`);
  });

  for (const term of Array.isArray(terms) ? terms : [terms]) {
    cluster.queue(term);
  }

  await cluster.idle();
  await cluster.close();

  return results;
}

export { scrapeSoldPrices };