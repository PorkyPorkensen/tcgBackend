import express from "express";
import { db } from "../firebaseAdmin.js";

const router = express.Router();

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