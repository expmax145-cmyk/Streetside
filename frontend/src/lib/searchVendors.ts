import type { MenuItem, Vendor } from '@/types';

/**
 * How much each field contributes to a match's relevance score.
 * Fields that precisely describe what a vendor actually sells (its name,
 * an exact dish name) are weighted far higher than loosely-related text
 * like a long description, so the most relevant vendors rank first.
 *
 * Deliberately NOT included: `vendor.categories`. That array is a broad
 * browse/filter tag (it also drives the Explore page pills and the map
 * pin colors) — e.g. both a chai stall and a coffee-only stall can be
 * tagged "Tea & Coffee". Matching search against it means a query like
 * "tea" would match any vendor carrying that umbrella tag, even one that
 * only sells coffee. Matching against real dish names and vendor text
 * instead keeps results accurate to what's actually on the menu.
 */
const FIELD_WEIGHTS = {
  name: 10,
  menuItem: 9,
  specialty: 8,
  cuisine: 6,
  description: 3,
  longDescription: 2,
} as const;

const EXACT_PHRASE_BONUS = 5;

/**
 * Fuzzy (typo-tolerant) matches score lower than an exact/prefix match on
 * the same field, so a vendor that genuinely spells a dish correctly
 * always outranks one that only matched because the searcher mistyped —
 * but a fuzzy hit still counts as a real match rather than being dropped.
 */
const FUZZY_PENALTY = 2;

/** A vendor result plus, when relevant, the specific dish that explains why it showed up. */
export interface VendorSearchResult {
  vendor: Vendor;
  /**
   * Set only when the vendor's name/specialties/cuisine don't already
   * explain the match — e.g. a dosa vendor showing up for "tea" search
   * purely because tea is one item on their menu. Callers can use this
   * to label the card ("Found on the menu: Filter Coffee") so a vendor
   * whose main business is something else doesn't read as a mismatch.
   */
  matchedMenuItem: MenuItem | null;
}

/** Escapes regex-special characters so raw user input is always safe to embed in a pattern. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True if `token` appears at the START of a word inside `text`.
 * `\b` matches "tea" at the start of "Tea & Coffee" but NOT in the middle
 * of "steamed" — that's what stops unrelated words from matching.
 * It still matches partial typing, e.g. "bir" matches "Biryani".
 */
function wordStartMatch(text: string, token: string): boolean {
  return new RegExp(`\\b${escapeRegExp(token)}`, 'i').test(text);
}

/** Strips everything but letters/digits, lowercased — used to compare a
 * query against a field "as one merged word" (e.g. "paanipuri" against
 * "Pani Puri" -> "panipuri"), since a searcher who runs two words
 * together shouldn't get zero results just because the data has a space. */
function collapse(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Classic Levenshtein edit distance (insertions/deletions/substitutions),
 * iterative DP with a rolling row so it stays cheap for the short
 * words/phrases search queries actually produce.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow.push(Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost, // substitution
      ));
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/**
 * How many typos we tolerate scales with the token's length — a 1-2
 * character edit distance on a 4-letter word would match almost
 * anything, but on an 8+ letter word it's genuinely still "the same
 * word, misspelled". Very short tokens (<=3 chars) get no fuzz at all;
 * they're already handled by the plain prefix match and fuzzing them
 * would make single/double letters match everything.
 */
function toleranceFor(length: number): number {
  if (length <= 3) return 0;
  if (length <= 6) return 1;
  return 2;
}

/**
 * True if `token` fuzzy-matches `text`: either a whole word in `text` is
 * within edit-distance tolerance of `token`, or the token matches the
 * start of a word within tolerance (so a typo'd partial word while still
 * typing, e.g. "biryna", still finds "Biryani").
 */
function fuzzyWordMatch(text: string, token: string): boolean {
  const tolerance = toleranceFor(token.length);
  if (tolerance === 0) return false;
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => {
    if (Math.abs(word.length - token.length) <= tolerance && levenshtein(word, token) <= tolerance) return true;
    // Compare against a same-length prefix of the word too, so a typo'd
    // partial token (still mid-typing) can fuzzy-match a longer word.
    if (word.length > token.length) {
      const prefix = word.slice(0, token.length);
      if (levenshtein(prefix, token) <= tolerance) return true;
    }
    return false;
  });
}

/**
 * True if `token` fuzzy-matches `text` once both are collapsed to a
 * single run of letters/digits — catches merged-word queries like
 * "paanipuri" against "Pani Puri" that per-word matching can't, since
 * there the difference is a typo AND a missing space, not just a typo.
 */
function fuzzyMergedMatch(text: string, token: string): boolean {
  if (token.length < 5) return false; // too short for a merged-word guess to be meaningful
  const merged = collapse(text);
  const tolerance = toleranceFor(token.length);
  if (merged.length === 0) return false;
  if (Math.abs(merged.length - token.length) > tolerance + 2) return false;
  return levenshtein(merged, token) <= tolerance + 1; // slightly more slack: two mistakes stacked (typo + missing space)
}

/** true/false plus whether it needed fuzzing, so callers can weight it. */
type MatchKind = 'none' | 'exact' | 'fuzzy';

function matchField(text: string | undefined | null, token: string): MatchKind {
  const safe = text ?? '';
  if (!safe) return 'none';
  if (wordStartMatch(safe, token)) return 'exact';
  if (fuzzyWordMatch(safe, token) || fuzzyMergedMatch(safe, token)) return 'fuzzy';
  return 'none';
}

function bestMatchAcross(texts: (string | undefined | null)[], token: string): MatchKind {
  let best: MatchKind = 'none';
  for (const text of texts) {
    const kind = matchField(text, token);
    if (kind === 'exact') return 'exact';
    if (kind === 'fuzzy') best = 'fuzzy';
  }
  return best;
}

function scoreFor(kind: MatchKind, weight: number): number {
  if (kind === 'exact') return weight;
  if (kind === 'fuzzy') return Math.max(1, weight - FUZZY_PENALTY);
  return 0;
}

/**
 * Finds the menu item responsible for surfacing this vendor, but only when
 * the vendor's own identity (name, specialties, cuisine) doesn't already
 * match — if it does, the vendor obviously belongs in the results and a
 * "found on the menu" note would just be clutter.
 */
function findExplanatoryMenuItem(vendor: Vendor, tokens: string[]): MenuItem | null {
  const specialties = vendor.specialties ?? [];
  const menu = vendor.menu ?? [];

  const identityAlreadyExplainsIt = tokens.some((token) =>
    bestMatchAcross([vendor.name, vendor.cuisine, ...specialties], token) !== 'none'
  );
  if (identityAlreadyExplainsIt) return null;

  for (const token of tokens) {
    const item = menu.find((menuItem) => matchField(menuItem?.name, token) !== 'none');
    if (item) return item;
  }
  return null;
}

/**
 * Ranked, fault-tolerant vendor search across name, cuisine, description,
 * specialties, and menu item names.
 *
 * Behaves like a small search engine rather than a plain filter:
 *  1. Tokenize        — split the query into words ("chicken biryani" -> ["chicken", "biryani"])
 *  2. Match per token  — every token must be found (AND across tokens, same
 *                        as a normal Google-style multi-word search) as
 *                        either a whole/prefix word (exact) or, failing
 *                        that, a typo-tolerant near-match (fuzzy) —
 *                        including merged-word queries like "paanipuri"
 *                        for "Pani Puri".
 *  3. Score            — each token contributes the weight of the BEST
 *                        field it matched in (a name match counts more
 *                        than a description match); fuzzy matches score
 *                        slightly lower than exact ones so misspelled
 *                        results never outrank correctly-spelled ones.
 *  4. Rank             — vendors are sorted by total score, highest first,
 *                        with rating as a tiebreaker.
 *
 * Never throws on missing/malformed vendor data — every field access is
 * defensively defaulted — and returns [] for a null/empty/whitespace-only
 * query instead of matching everything.
 */
export function searchVendors(vendors: Vendor[] | null | undefined, query: string | null | undefined): VendorSearchResult[] {
  const rawTokens = (query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  // queries shorter than 2 characters produce no fuzzy matches —
  // a single letter is too ambiguous to return useful results.
  const tokens = rawTokens.filter((t) => t.length >= 2);
  if (tokens.length === 0 || !Array.isArray(vendors) || vendors.length === 0) return [];

  const scored: { vendor: Vendor; score: number }[] = [];

  for (const vendor of vendors) {
    if (!vendor) continue;
    const menu = vendor.menu ?? [];
    const specialties = vendor.specialties ?? [];
    let total = 0;

    const matchesAllTokens = tokens.every((token) => {
      let best = 0;

      best = Math.max(best, scoreFor(matchField(vendor.name, token), FIELD_WEIGHTS.name));
      best = Math.max(best, scoreFor(bestMatchAcross(menu.map((m) => m?.name), token), FIELD_WEIGHTS.menuItem));
      best = Math.max(best, scoreFor(bestMatchAcross(specialties, token), FIELD_WEIGHTS.specialty));
      best = Math.max(best, scoreFor(matchField(vendor.cuisine, token), FIELD_WEIGHTS.cuisine));
      best = Math.max(best, scoreFor(matchField(vendor.description, token), FIELD_WEIGHTS.description));
      best = Math.max(best, scoreFor(matchField(vendor.longDescription, token), FIELD_WEIGHTS.longDescription));

      total += best;
      return best > 0;
    });

    if (!matchesAllTokens) continue;

    // Small bonus when the full query appears in the name as one phrase,
    // so "biryani street" ranks that vendor above others that only match
    // on the single word "biryani".
    if (matchField(vendor.name, query!.trim().toLowerCase()) === 'exact') total += EXACT_PHRASE_BONUS;

    scored.push({ vendor, score: total });
  }

  scored.sort((a, b) => b.score - a.score || b.vendor.rating - a.vendor.rating);
  return scored.map((r) => ({ vendor: r.vendor, matchedMenuItem: findExplanatoryMenuItem(r.vendor, tokens) }));
}
