// Shared presets for the quote workspace: units of measure, count words,
// note presets, and the default target margin.

const UOMS = ["EA", "PK", "BX", "CT", "DZ", "RL", "RM", "ST", "PR", "BG"];

const COUNT_WORDS = [
  { word: "dozen", count: 12 },
  { word: "pair", count: 2 },
  { word: "gross", count: 144 },
  { word: "ream", count: 500 },
];

const NOTE_PRESETS = [
  "Price match",
  "Better value pack size",
  "Substitute offered",
  "Not available",
  "On contract",
  "Other", // requires text
];

const DEFAULT_TARGET_MARGIN = 0.25;

// Detect a count-per-unit from a free-text description.
// Returns { count, reason, hint } where reason names the matched words and
// hint carries the inner pack size for "N Packs X M items" phrasing.
function detectCount(description) {
  const text = String(description || "");

  // "N Packs of M items" / "N Packs X M" → suggest N, show M as a hint.
  const packsOf = text.match(/\b(\d+)\s*(?:packs?|pk)\s*(?:of|x|×)\s*(\d+)\b/i);
  if (packsOf) {
    return { count: Number(packsOf[1]), reason: `"${packsOf[0]}"`, hint: Number(packsOf[2]) };
  }

  // Ignore numbers after "with" (e.g. "Stapler with 1000 Staples" = 1).
  const withoutTrailing = text.replace(/\bwith\b.*$/i, "");

  // Ignore measurements: ", in., mm, GB, oz, lb, sheet capacity.
  const cleaned = withoutTrailing.replace(/\b\d+(?:\.\d+)?\s*(?:"|in\.?|mm|GB|oz|lb|sheet capacity)\b/gi, "");

  // Count words (dozen, pair, gross, ream).
  for (const { word, count } of COUNT_WORDS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(cleaned)) {
      return { count, reason: `"${word}" = ${count}`, hint: null };
    }
  }

  // Explicit counts: "36 Count", "12 Ct", "6 Rolls", "10 Pack", "10PCS",
  // "24 Pads", "Box of 100".
  const explicit = cleaned.match(/\b(\d+)\s*(?:count|ct|rolls?|packs?|pk|pcs?|pads?|pieces?)\b/i)
    || cleaned.match(/\bbox of\s*(\d+)\b/i);
  if (explicit) {
    return { count: Number(explicit[1]), reason: `"${explicit[0].trim()}"`, hint: null };
  }

  // None found = 1 each.
  return { count: 1, reason: "no count found, defaulting to 1 each", hint: null };
}

module.exports = { UOMS, COUNT_WORDS, NOTE_PRESETS, DEFAULT_TARGET_MARGIN, detectCount };
