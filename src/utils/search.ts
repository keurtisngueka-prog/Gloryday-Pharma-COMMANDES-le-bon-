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

function matchToken(queryToken: string, targetToken: string): boolean {
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }
  const qBase = queryToken.endsWith('s') ? queryToken.slice(0, -1) : queryToken;
  const tBase = targetToken.endsWith('s') ? targetToken.slice(0, -1) : targetToken;
  if (qBase === tBase || tBase.includes(qBase) || qBase.includes(tBase)) {
    return true;
  }
  if (queryToken.length >= 4 && targetToken.length >= 4) {
    const dist = levenshteinDistance(queryToken, targetToken);
    if (dist <= 1) return true;
    if (queryToken.length >= 7 && dist <= 2) return true;
  }
  return false;
}

export function matchesProductSearch(product: Product, query: string): boolean {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return true;

  const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);
  const targetText = normalizeText(
    `${product.name} ${product.category} ${product.subcategory || ''} ${product.description || ''} ${product.variants.map(v => v.label).join(' ')}`
  );
  const targetTokens = targetText.split(/\s+/).filter(Boolean);

  const expandedTerms: string[][] = queryTerms.map(term => {
    const synonyms = SEARCH_SYNONYMS[term] || [];
    const base = term.endsWith('s') ? term.slice(0, -1) : term;
    const baseSynonyms = SEARCH_SYNONYMS[base] || [];
    return Array.from(new Set([term, base, ...synonyms, ...baseSynonyms]));
  });

  return expandedTerms.every(termFamily => {
    return termFamily.some(synonym => {
      const synClean = normalizeText(synonym);
      return targetTokens.some(token => matchToken(synClean, token));
    });
  });
}
