import { intlLocale, type Locale } from "@/lib/i18n/config";
import { type BrowseOffer } from "@/lib/offers/load-active-offers";
import { isUrgentFlag } from "@/lib/offers/urgent-flag";
import type { InspirationTile } from "@/lib/inspiration/types";

export type RankedBrowseOffer = BrowseOffer & { relevance: number };

const MATCH_THRESHOLD = 0.62;

function fold(value: string, locale: string = "de-CH") {
  return value
    .toLocaleLowerCase(locale)
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) {
    return 0;
  }
  if (!a.length) {
    return b.length;
  }
  if (!b.length) {
    return a.length;
  }

  const previous = new Array(b.length + 1);
  const current = new Array(b.length + 1);
  for (let index = 0; index <= b.length; index += 1) {
    previous[index] = index;
  }

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[b.length];
}

function similarity(a: string, b: string) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) {
    return 1;
  }
  return 1 - levenshtein(a, b) / maxLen;
}

function tokenScore(token: string, text: string) {
  if (!token || !text) {
    return 0;
  }
  if (text === token) {
    return 1;
  }
  if (text.startsWith(token)) {
    return 0.97;
  }
  if (text.includes(` ${token}`) || text.includes(token)) {
    return 0.94;
  }

  if (token.length < 3) {
    return text.split(" ").some((word) => word.startsWith(token)) ? 0.7 : 0;
  }

  let best = 0;
  const words = text.split(" ").filter(Boolean);
  for (const word of words) {
    best = Math.max(best, similarity(token, word));
    if (word.includes(token) || (token.includes(word) && word.length >= 4)) {
      best = Math.max(best, 0.88);
    }
  }

  const window = Math.max(token.length - 1, 4);
  const maxWindow = token.length + 2;
  if (text.length <= 80 || words.length <= 12) {
    for (let size = window; size <= maxWindow; size += 1) {
      for (let index = 0; index <= text.length - size; index += 1) {
        best = Math.max(best, similarity(token, text.slice(index, index + size)));
        if (best >= 0.96) {
          return best;
        }
      }
    }
  }

  return best;
}

function fieldScore(token: string, title: string, description: string, region: string) {
  const titleScore = tokenScore(token, title);
  const regionScore = tokenScore(token, region);
  const descriptionScore = tokenScore(token, description);

  return Math.max(titleScore * 1, regionScore * 0.92, descriptionScore * 0.78);
}

export function searchBrowseOffers(
  offers: BrowseOffer[],
  query: string,
  locale: Locale = "de",
): RankedBrowseOffer[] {
  const intl = intlLocale(locale);
  const folded = fold(query, intl);
  if (!folded) {
    return pinUrgentOffers(offers.map((offer) => ({ ...offer, relevance: isUrgentFlag(offer.is_urgent) ? 1 : 0.5 })));
  }

  const tokens = folded.split(" ").filter(Boolean);

  return offers
    .map((offer) => {
      const title = fold(offer.title, intl);
      const description = fold(offer.description ?? "", intl);
      const region = fold(`${offer.region} ${offer.city} ${offer.partner_name}`, intl);
      const score =
        tokens.reduce((sum, token) => sum + fieldScore(token, title, description, region), 0) /
        tokens.length;

      return { ...offer, relevance: score };
    })
    .filter((offer) => offer.relevance >= MATCH_THRESHOLD)
    .sort((left, right) => {
      const urgentDelta = Number(isUrgentFlag(right.is_urgent)) - Number(isUrgentFlag(left.is_urgent));
      if (urgentDelta !== 0) {
        return urgentDelta;
      }
      return right.relevance - left.relevance;
    });
}

export function searchInspirationTiles(
  tiles: InspirationTile[],
  query: string,
  locale: Locale,
  localize: (text: string) => string,
): InspirationTile[] {
  const intl = intlLocale(locale);
  const folded = fold(query, intl);
  if (!folded) {
    return pinUrgentTiles(tiles);
  }

  const tokens = folded.split(" ").filter(Boolean);

  return tiles
    .map((tile) => {
      const title = fold(tile.offer?.title ?? "", intl);
      const description = fold(tile.offer?.description ?? "", intl);
      const region = fold(
        `${tile.region} ${localize(tile.region)} ${tile.offer?.city ?? ""} ${tile.offer?.region ?? ""} ${tile.partner_name}`,
        intl,
      );
      const score =
        tokens.reduce((sum, token) => sum + fieldScore(token, title, description, region), 0) /
        tokens.length;
      return { tile, score };
    })
    .filter((entry) => entry.score >= MATCH_THRESHOLD)
    .sort((left, right) => {
      const urgentDelta =
        Number(isUrgentFlag(right.tile.offer?.is_urgent)) - Number(isUrgentFlag(left.tile.offer?.is_urgent));
      if (urgentDelta !== 0) {
        return urgentDelta;
      }
      return right.score - left.score;
    })
    .map((entry) => entry.tile);
}

export function pinUrgentTiles(tiles: InspirationTile[]): InspirationTile[] {
  return [...tiles].sort(
    (left, right) => Number(isUrgentFlag(right.offer?.is_urgent)) - Number(isUrgentFlag(left.offer?.is_urgent)),
  );
}

export function pinUrgentOffers<T extends { is_urgent?: boolean | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => Number(isUrgentFlag(right.is_urgent)) - Number(isUrgentFlag(left.is_urgent)));
}
