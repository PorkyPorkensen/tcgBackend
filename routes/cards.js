import express from "express";
import fetch from "node-fetch";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

router.get("/pokemon/search", async (req, res) => {
  const { name, page = 1 } = req.query;

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/pokemon/cards/search?name=${encodeURIComponent(name)}&page=${encodeURIComponent(page)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Error fetching pokemon cards:", err);
    res.status(500).json({ error: "Failed to fetch pokemon cards" });
  }
});

router.get("/pokemon/ebay-sold-prices", async (req, res) => {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/pokemon/ebay-sold-prices?id=${encodeURIComponent(id)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
    console.log(`Fetched ebay sold prices for ${id}:`, data);
  } catch (err) {
    console.error("Error fetching ebay sold prices:", err);
    res.status(500).json({ error: "Failed to fetch ebay sold prices" });
  }
});

router.get("/pokemon/ebay-sold-offers", async (req, res) => {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/pokemon/ebay-sold-offers?id=${encodeURIComponent(id)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Error fetching ebay sold offers:", err);
    res.status(500).json({ error: "Failed to fetch ebay sold offers" });
  }
});

router.get("/pokemon/details", async (req, res) => {
  const { id } = req.query;

  try {
    const response = await fetch(
      `https://${process.env.RAPIDAPI_HOST}/pokemon/cards/search?ids=${encodeURIComponent(id)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": process.env.RAPIDAPI_HOST,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Error fetching pokemon card details:", err);
    res.status(500).json({ error: "Failed to fetch pokemon card details" });
  }
});

router.post("/add", async (req, res) => {
  const { userId, card } = req.body;

  if (!userId || !card) {
    return res.status(400).json({ error: "Missing userId or card data" });
  }

  try {
    const userCardsSnapshot = await db
      .collection("collections")
      .where("userId", "==", userId)
      .get();

    if (userCardsSnapshot.size >= 20) {
      return res.status(403).json({ error: "Card limit reached (20)." });
    }

    await db.collection("collections").add({
      userId,
      cardId: card.id,
      cardName: card.name,
      setName: card.set.name,
      cardNumber: card.card_number,
      imageUrl: card.image,
      condition: card.condition || "NM",
      addedAt: new Date(),
    });

    res.status(200).json({ message: "Card added successfully." });
  } catch (err) {
    console.error("Error adding card:", err);
    res.status(500).json({ error: "Failed to add card." });
  }
});

export default router;