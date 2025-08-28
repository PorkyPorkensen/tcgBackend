import puppeteer from "puppeteer";

async function scrapeSoldItems(term) {
   const results  = [];
  const baseUrl = "https://www.ebay.com/sch/i.html";

  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath();

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}
  const page = await browser.newPage();

  for (let p = 1; p <= 3; p++) {
    const url = `${baseUrl}?_nkw=${encodeURIComponent(
      term
    )}&LH_Sold=1&LH_Complete=1&_pgn=${p}`;

    console.log("Fetching:", url);
    await page.goto(url, { waitUntil: "networkidle2" });

    const items = await page.evaluate(() => {
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

      // 🚫 filter out "Shop on eBay" ads
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
    console.log(`Page ${p}: found ${items.length} items`);
    results.push(...items);

    if (results.length >= 30) break;
  }
  console.log("Final scraped results:", results)
  await browser.close();
  return results.slice(0, 30);
}

export { scrapeSoldItems };