/**
 * Builds a readable product label without repeating a package/variant that is
 * already present in the product name (for example, "Aiguille boîte 100" +
 * "Boîte 100 S" becomes "Aiguille boîte 100 S").
 */
export function formatProductNameWithVariant(productName: unknown, variant: unknown): string {
  const name = String(productName ?? '').trim();
  const selectedVariant = String(variant ?? '').trim();
  if (!name) return selectedVariant && !isStandardVariant(selectedVariant) ? selectedVariant : 'Article';
  if (!selectedVariant || isStandardVariant(selectedVariant)) return name;

  const nameTokens = getComparableTokens(name);
  const variantTokens = getComparableTokens(selectedVariant);
  if (!variantTokens.length) return name;

  // A full variant already exists anywhere in the name, so don't append it.
  if (containsTokenSequence(nameTokens.map(token => token.value), variantTokens.map(token => token.value))) {
    return name;
  }

  // Preserve any meaningful suffix (such as "S" in "Boîte 100 S") while
  // avoiding the repeated shared words at the name/variant boundary.
  const maxOverlap = Math.min(nameTokens.length, variantTokens.length);
  for (let overlap = maxOverlap; overlap > 0; overlap -= 1) {
    const nameSuffix = nameTokens.slice(-overlap).map(token => token.value);
    const variantPrefix = variantTokens.slice(0, overlap).map(token => token.value);
    if (!nameSuffix.every((token, index) => token === variantPrefix[index])) continue;

    const tailStart = variantTokens[overlap - 1].end;
    const suffix = selectedVariant.slice(tailStart).replace(/^[\s,.;:·|/()[\]{}–—-]+/u, '').trim();
    return suffix ? `${name} ${suffix}` : name;
  }

  // Some labels add a packaging word before a quantity already in the name,
  // e.g. "Test VIH 25 tests" + "Boîte de 25 tests". Keep the complete name
  // once when that repeated quantity is the whole variant description.
  const namePackage = findPackageType(nameTokens.map(token => token.value));
  for (let overlap = Math.min(nameTokens.length, variantTokens.length); overlap > 0; overlap -= 1) {
    const repeatedSuffix = nameTokens.slice(-overlap).map(token => token.value);
    for (let start = 1; start + overlap <= variantTokens.length; start += 1) {
      const variantPart = variantTokens.slice(start, start + overlap).map(token => token.value);
      if (!repeatedSuffix.every((token, index) => token === variantPart[index])) continue;

      const variantPrefix = variantTokens.slice(0, start).map(token => token.value);
      if (!variantPrefix.every(isPackagingWord)) continue;
      const variantPackage = findPackageType(variantTokens.map(token => token.value));
      if (namePackage && variantPackage && namePackage !== variantPackage) continue;

      const tailStart = variantTokens[start + overlap - 1].end;
      const suffix = selectedVariant.slice(tailStart).replace(/^[\s,.;:·|/()[\]{}–—-]+/u, '').trim();
      return suffix ? `${name} ${suffix}` : name;
    }
  }

  return `${name} · ${selectedVariant}`;
}

function isStandardVariant(value: string): boolean {
  return value.toLocaleLowerCase('fr').replace(/[.!?]/g, '') === 'standard';
}

function getComparableTokens(value: string): Array<{ value: string; end: number }> {
  const tokens: Array<{ value: string; end: number }> = [];
  const connectors = new Set(['de', 'du', 'des', 'd']);
  const tokenPattern = /[\p{L}]+|[\p{N}]+/gu;
  for (const match of value.matchAll(tokenPattern)) {
    const normalized = match[0].normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr');
    if (connectors.has(normalized)) continue;
    tokens.push({
      value: normalized,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return tokens;
}

const PACKAGING_WORDS = new Set([
  'boite', 'carton', 'sachet', 'paquet', 'pack', 'lot', 'flacon', 'rouleau',
  'tube', 'blister', 'caisse', 'unite', 'unites', 'piece', 'pieces', 'pcs',
  'test', 'tests', 'boule', 'boules', 'kit', 'ampoule', 'ampoules',
]);

function isPackagingWord(value: string): boolean {
  return PACKAGING_WORDS.has(value);
}

function findPackageType(tokens: string[]): string | undefined {
  return tokens.find(token => [
    'boite', 'carton', 'sachet', 'paquet', 'pack', 'lot', 'flacon', 'rouleau',
    'tube', 'blister', 'caisse', 'kit', 'ampoule', 'ampoules',
  ].includes(token));
}

function containsTokenSequence(haystack: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > haystack.length) return false;
  return haystack.some((_, start) => needle.every((token, offset) => haystack[start + offset] === token));
}
