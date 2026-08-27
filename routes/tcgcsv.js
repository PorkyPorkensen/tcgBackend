import express from "express";
import fetch from "node-fetch";
import pkmnGroups from "../pokemonGroups.js";

const router = express.Router();
const TCGCSV_HEADERS = { "User-Agent": "OfflineTcgTest/1.0.0" };

function normalizeSetName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/^[a-z0-9]+:\s*/i, "") // strip leading abbreviation-style prefixes like "SV:" or "ME06:"
    .replace(/[^a-z0-9]/g, "");
}

function getCardNumberPrefix(cardNumber) {
  const normalized = String(cardNumber || "").trim().toUpperCase();
  const specialMatch = normalized.match(/\b(SVP|TG|GG)\b/);
  if (specialMatch) return specialMatch[1];

  const match = normalized.match(/^([A-Z]+)/);
  return match ? match[1] : "";
}

router.get("/group", (req, res) => {
  const { setName, cardNumber } = req.query;
  if (!setName) {
    return res.status(400).json({ error: "Missing setName" });
  }

  const target = normalizeSetName(setName);
  const prefix = getCardNumberPrefix(cardNumber);
  const abbreviationMatch = prefix
    ? pkmnGroups.find((group) =>
        String(group.abbreviation || "").toUpperCase().split(":")[0].trim() === prefix
      )
    : undefined;
  const specialSuffix = prefix === "TG"
    ? "trainergallery"
    : prefix === "SV"
      ? "shinyvault"
      : prefix === "GG"
        ? "galariangallery"
        : "";
  const preferredGroups = specialSuffix
    ? pkmnGroups.filter((group) => normalizeSetName(group.name).includes(specialSuffix))
    : abbreviationMatch
      ? [abbreviationMatch]
    : pkmnGroups;
  const match = prefix === "SVP" && abbreviationMatch
    ? abbreviationMatch
    : preferredGroups.find((group) => normalizeSetName(group.name) === target) ||
      preferredGroups.find((group) => {
        const normalized = normalizeSetName(group.name);
        return normalized.includes(target) || target.includes(normalized);
      }) ||
      (specialSuffix
        ? pkmnGroups.find((group) => normalizeSetName(group.name) === target) ||
          pkmnGroups.find((group) => {
            const normalized = normalizeSetName(group.name);
            return normalized.includes(target) || target.includes(normalized);
          })
        : undefined);

  if (!match) {
    return res.status(404).json({ error: `No matching set group found for '${setName}'` });
  }

  res.json(match);
});

router.get("/products/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const response = await fetch(
      `https://tcgcsv.com/tcgplayer/3/${encodeURIComponent(groupId)}/products`,
      { headers: TCGCSV_HEADERS }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Error fetching tcgcsv products:", err);
    res.status(500).json({ error: "Failed to fetch tcgcsv products" });
  }
});

router.get("/prices/:groupId", async (req, res) => {
  const { groupId } = req.params;

  try {
    const response = await fetch(
      `https://tcgcsv.com/tcgplayer/3/${encodeURIComponent(groupId)}/prices`,
      { headers: TCGCSV_HEADERS }
    );

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error("Error fetching tcgcsv prices:", err);
    res.status(500).json({ error: "Failed to fetch tcgcsv prices" });
  }
});

export default router;

