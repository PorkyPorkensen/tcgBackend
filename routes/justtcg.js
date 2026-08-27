import express from "express";
import { JustTCG } from "justtcg-js";

const router = express.Router();
const client = new JustTCG();

const CONDITION_LABEL_TO_CODE = {
  "Near Mint": "NM",
  "Lightly Played": "LP",
  "Moderately Played": "MP",
  "Heavily Played": "HP",
};

function normalizeCondition(condition) {
  if (!condition) return "NM";
  return CONDITION_LABEL_TO_CODE[condition] || condition;
}

function pickVariantPrice(cardData, condition, printing) {
  const variants = cardData?.variants || [];
  if (!variants.length) return null;

  const normalizedCondition = normalizeCondition(condition);
  const normalizedPrinting = printing || "Normal";

  const exact = variants.find(
    (variant) =>
      variant?.condition === normalizedCondition &&
      (variant?.printing || "Normal") === normalizedPrinting &&
      variant?.price != null
  );
  if (exact) return exact.price;

  const conditionMatch = variants.find(
    (variant) => variant?.condition === normalizedCondition && variant?.price != null
  );
  if (conditionMatch) return conditionMatch.price;

  const firstPriced = variants.find((variant) => variant?.price != null);
  return firstPriced ? firstPriced.price : null;
}

function pickGradedPrice(cardData, gradingCompany, grade) {
  if (!cardData) return null;

  if (cardData?.price != null) return cardData.price;
  if (cardData?.graded_price != null) return cardData.graded_price;
  if (cardData?.graded?.price != null) return cardData.graded.price;

  const list =
    cardData?.gradedPrices ||
    cardData?.graded_prices ||
    cardData?.grades ||
    [];

  if (Array.isArray(list) && list.length) {
    const gradeText = grade != null ? String(grade) : "";
    const exact = list.find((entry) => {
      const company = (entry?.grading_company || entry?.company || "").toUpperCase();
      const entryGrade = entry?.grade != null ? String(entry.grade) : "";
      return company === String(gradingCompany || "").toUpperCase() && entryGrade === gradeText;
    });
    if (exact?.price != null) return exact.price;

    const firstPriced = list.find((entry) => entry?.price != null);
    if (firstPriced?.price != null) return firstPriced.price;
  }

  return null;
}

router.get("/cards", async (req, res) => {
  const { game, set, name, limit, orderBy, order } = req.query;

  try {
    const response = await client.v1.cards.get({
      game,
      set,
      query: name,
      limit: limit ? Number(limit) : undefined,
      orderBy,
      order,
    });

    res.json(response);
  } catch (err) {
    console.error("Error fetching justtcg cards:", err);
    res.status(500).json({ error: "Failed to fetch cards from justtcg" });
  }
});

router.get("/cards/by-tcgplayer-id", async (req, res) => {
  const { tcgplayerId } = req.query;

  if (!tcgplayerId) {
    return res.status(400).json({ error: "Missing tcgplayerId" });
  }

  try {
    const response = await client.v1.cards.get({ tcgplayerId });
    res.json(response);
  } catch (err) {
    console.error("Error fetching justtcg card by tcgplayerId:", err);
    res.status(500).json({ error: "Failed to fetch card from justtcg" });
  }
});

router.post("/cards/batch-prices", async (req, res) => {
  const cards = Array.isArray(req.body?.cards) ? req.body.cards : [];

  if (!cards.length) {
    return res.status(400).json({ error: "Missing cards array" });
  }

  const normalizedCards = cards
    .map((card) => ({
      tcgplayerId: String(card?.tcgplayerId || ""),
      condition: normalizeCondition(card?.condition),
      printing: card?.printing || "Normal",
      graded: card?.graded || null,
      grading_company: card?.grading_company || null,
      grade: card?.grade != null ? Number(card.grade) : null,
    }))
    .filter((card) => card.tcgplayerId);

  if (!normalizedCards.length) {
    return res.status(400).json({ error: "No valid tcgplayerId values provided" });
  }

  try {
    if (client.cards && typeof client.cards.batch === "function") {
      const batchPayload = normalizedCards.map((card) => ({
        tcgplayerId: card.tcgplayerId,
        ...(card.graded === "include"
          ? {
              graded: "include",
              grading_company: card.grading_company,
              grade: card.grade,
            }
          : {
              condition: card.condition,
              printing: card.printing,
            }),
      }));

      const batchResponse = await client.cards.batch(batchPayload);
      const responseData = Array.isArray(batchResponse?.data)
        ? batchResponse.data
        : Array.isArray(batchResponse)
          ? batchResponse
          : [];

      const results = normalizedCards.map((requestCard, index) => {
        const cardData = responseData[index];
        const firstData = Array.isArray(cardData?.data) ? cardData.data[0] : cardData?.data?.[0] || cardData;
        const price = requestCard.graded === "include"
          ? pickGradedPrice(firstData, requestCard.grading_company, requestCard.grade)
          : pickVariantPrice(firstData, requestCard.condition, requestCard.printing);
        return {
          tcgplayerId: requestCard.tcgplayerId,
          condition: requestCard.condition,
          printing: requestCard.printing,
          graded: requestCard.graded,
          grading_company: requestCard.grading_company,
          grade: requestCard.grade,
          price,
        };
      });

      return res.json({ results, mode: "batch" });
    }

    const fallbackResponses = await Promise.all(
      normalizedCards.map(async (card) => {
        const response = await client.v1.cards.get(
          card.graded === "include"
            ? {
                tcgplayerId: card.tcgplayerId,
                graded: "include",
                grading_company: card.grading_company,
                grade: card.grade,
              }
            : { tcgplayerId: card.tcgplayerId }
        );
        const firstData = response?.data?.[0];
        const price = card.graded === "include"
          ? pickGradedPrice(firstData, card.grading_company, card.grade)
          : pickVariantPrice(firstData, card.condition, card.printing);
        return {
          tcgplayerId: card.tcgplayerId,
          condition: card.condition,
          printing: card.printing,
          graded: card.graded,
          grading_company: card.grading_company,
          grade: card.grade,
          price,
        };
      })
    );

    return res.json({ results: fallbackResponses, mode: "fallback" });
  } catch (err) {
    console.error("Error fetching justtcg batch prices:", err);
    return res.status(500).json({ error: "Failed to fetch batch prices from justtcg" });
  }
});

export default router;
