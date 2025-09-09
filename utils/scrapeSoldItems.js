import puppeteer from "puppeteer";
console.log("Puppeteer executablePath:", puppeteer.executablePath());

async function scrapeSoldItems(term) {
  try {
    const results = [];
    const baseUrl = "https://www.ebay.com/sch/i.html";

    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: puppeteer.executablePath(),
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    for (let p = 1; p <= 1; p++) {
      const url = `${baseUrl}?_nkw=${encodeURIComponent(
        term
      )}&LH_Sold=1&LH_Complete=1&_pgn=${p}`;

      console.log("Fetching:", url);
      await page.goto(url, { waitUntil: "networkidle2" });

      // Wait for either .s-card or a bot-check page
      await new Promise(res => setTimeout(res, 2000));
      let pageContent = await page.content();
      if (pageContent.includes("Pardon Our Interruption") || pageContent.includes("captcha")) {
        console.log("Blocked by eBay bot protection (after goto).");
        await browser.close();
        return [];
      }

      let items = [];
      try {
        await page.waitForSelector(".s-card", { timeout: 10000 });
        // Check again for bot protection before evaluate
        pageContent = await page.content();
        if (pageContent.includes("Pardon Our Interruption") || pageContent.includes("captcha")) {
          console.log("Blocked by eBay bot protection (before evaluate).");
          await browser.close();
          return [];
        }
        items = await page.evaluate(() => {
          const rows = document.querySelectorAll(".s-card");
          return Array.from(rows)
            .map((row) => {
              const title =
                row.querySelector(".s-card__title span")?.innerText ||
                row.querySelector(".s-card__title")?.innerText ||
                null;

              const price =
                row.querySelector(".s-card__price span")?.innerText ||
                row.querySelector(".s-card__price")?.innerText ||
                null;

              const date =
                row.querySelector(".s-card__date")?.innerText ||
                null;

              const link =
                row.querySelector("a")?.href ||
                null;

              const image =
                row.querySelector("img")?.src ||
                null;

              if (!title || !price || !link) return null;

              if (
                title.toLowerCase().includes("shop on ebay") ||
                title.toLowerCase().includes("shop with confidence")
              ) {
                return null;
              }

              return { title, price, date, link, image };
            })
            .filter(Boolean);
        });
      } catch (e) {
        console.error("Error during page.evaluate or waitForSelector:", e);
        // If context was destroyed, treat as bot block
        await browser.close();
        return [];
      }

      console.log(`Page ${p}: found ${items.length} items`);
      results.push(...items);

      if (results.length >= 30) break;
    }
    console.log("Final scraped results:", results);
    await browser.close();
    return results.slice(0, 10);
  } catch (error) {
    console.error("scrapeSoldItems error:", error);
    return [];
  }
}

export { scrapeSoldItems };