import { Product } from '../types';
import { SEARCH_SYNONYMS } from '../data/initialProducts';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

const SEARCH_STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'en', 'et',
  'la', 'le', 'les', 'l', 'd', 'par', 'pour', 'sans', 'sur', 'un', 'une'
]);

function matchQuality(queryToken: string, targetToken: string): number {
  if (queryToken === targetToken) return 3;
  if (targetToken.includes(queryToken)) return 2;
  const qBase = queryToken.endsWith('s') ? queryToken.slice(0, -1) : queryToken;
  const tBase = targetToken.endsWith('s') ? targetToken.slice(0, -1) : targetToken;
  if (qBase === tBase) return 3;
  if (tBase.includes(qBase)) return 2;
  if (queryToken.length >= 4 && targetToken.length >= 4) {
    const dist = levenshteinDistance(queryToken, targetToken);
    if (dist <= 1 || (queryToken.length >= 7 && dist <= 2)) return 1;
  }
  return 0;
}

export function scoreProductSearch(product: Product, query: string): number {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return 1;

  const queryTerms = cleanQuery.split(/\s+/).filter(term => term && !SEARCH_STOP_WORDS.has(term));
  if (queryTerms.length === 0) return 1;

  const name = normalizeText(product.name);
  const fields = [
    { text: name, weight: 12 },
    { text: normalizeText(product.category), weight: 7 },
    { text: normalizeText(product.subcategory || ''), weight: 7 },
    { text: normalizeText(product.variants.map(v => v.label).join(' ')), weight: 8 },
    { text: normalizeText(product.description || ''), weight: 2 }
  ].map(field => ({ ...field, tokens: field.text.split(/\s+/).filter(Boolean) }));

  const expandedTerms: string[][] = queryTerms.map(term => {
    const synonyms = SEARCH_SYNONYMS[term] || [];
    const base = term.endsWith('s') ? term.slice(0, -1) : term;
    const baseSynonyms = SEARCH_SYNONYMS[base] || [];
    return Array.from(new Set([term, base, ...synonyms, ...baseSynonyms]));
  });

  let score = name.includes(cleanQuery) ? 45 : 0;
  for (const termFamily of expandedTerms) {
    let bestTermScore = 0;
    const alternatives = termFamily
      .map(term => normalizeText(term).split(/\s+/).filter(Boolean))
      .filter(terms => terms.length > 0);
    for (const field of fields) {
      let fieldQuality = 0;
      for (const alternativeTerms of alternatives) {
        const termQualities = alternativeTerms.map(alternative => field.tokens.reduce(
          (best, token) => Math.max(best, matchQuality(alternative, token)),
          0
        ));
        if (termQualities.every(quality => quality > 0)) {
          fieldQuality = Math.max(fieldQuality, Math.min(...termQualities));
        }
      }
      bestTermScore = Math.max(bestTermScore, fieldQuality * field.weight);
    }
    if (bestTermScore === 0) return 0;
    score += bestTermScore;
  }
  return score;
}

export function matchesProductSearch(product: Product, query: string): boolean {
  return scoreProductSearch(product, query) > 0;
}
