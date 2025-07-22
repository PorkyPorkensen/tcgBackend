import * as cheerio from "cheerio";
import axios from "axios";

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseGradingInfo(title) {
  const match = title.match(/\b(PSA|BGS|CGC|SGC)[\s\-:]*(\d{1,2}(\.\d)?)/i);
  if (match) {
    return {
      isGraded: true,
      gradeService: match[1].toUpperCase(),
      gradeScore: match[2],
    };
  }
  return {
    isGraded: false,
    gradeService: null,
    gradeScore: null,
  };
}

export async function scrapeSoldItems(searchTerm = "charizard") {
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&LH_Sold=1&LH_Complete=1&_sop=13`;

  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(html);
    const soldItems = [];

    $(".s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceText = $(el).find(".s-item__price").text().trim();
      const link = $(el).find(".s-item__link").attr("href");
      const date = $(el).find(".s-item__title--tagblock").text();
      const image = $(el).find(".s-item__image-img").attr("src");

      const originalPrice = $(el).find(".STRIKETHROUGH").text().trim() || null;
      const wasOfferAccepted = !!originalPrice;
      const salePrice = priceText.replace(originalPrice, "").trim();

      const { isGraded, gradeService, gradeScore } = parseGradingInfo(title);

      if (title && salePrice) {
        soldItems.push({
          title,
          originalPrice: originalPrice || salePrice,
          salePrice,
          wasOfferAccepted,
          date,
          link,
          image,
          isGraded,
          gradeService,
          gradeScore,
        });
      }
    });

    return soldItems.slice(2, 10);
  } catch (err) {
    console.error("Error scraping:", err.message);
    return [];
  } finally {
    await delay(1000);
  }
}