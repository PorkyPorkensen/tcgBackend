import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { scrapeSoldItems } from "./utils/scrapeSoldItems.js"; // Assuming you have a scraper.js file for scraping sold items
dotenv.config();
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());

const getEbayAccessToken = async () => {
const credentials = Buffer.from(
  `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SEC}`
).toString('base64');

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
  });

  const data = await response.json();

  if (!data.access_token) {
  console.error("eBay token error response:", data);
  throw new Error("Failed to get eBay access token");
}

  return data.access_token;
};

const EBAY_API = "https://api.ebay.com/buy/browse/v1/item_summary/search";

app.get("/api/search", async (req, res) => {
  const { q, categoryId = "183454", filter = 'buyingOptions:{AUCTION}' } = req.query;

  try {
    const token = await getEbayAccessToken();

    const response = await fetch(`${EBAY_API}?q=${encodeURIComponent(q)}&category_ids=${categoryId}&limit=8&offset=0&filter=${filter}`, {
      headers: {
        "Authorization": `Bearer '${token}'`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error fetching from eBay:", err);
    res.status(500).json({ error: "Failed to fetch data from eBay" });
  }
});
app.get("/api/sold", async (req, res) => {
  const term = req.query.term || "charizard";
  try {
    const data = await scrapeSoldItems(term);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sold items" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));