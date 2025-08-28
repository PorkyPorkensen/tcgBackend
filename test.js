import { scrapeSoldItems } from "./utils/scrapeSoldItems.js";

(async () => {
  const results = await scrapeSoldItems("charizard");
  console.log("Scraper returned:", results);
})();