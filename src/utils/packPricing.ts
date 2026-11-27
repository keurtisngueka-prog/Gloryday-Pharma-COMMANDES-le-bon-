import type { Pack, Product } from '../types';

export interface PackPricingSummary {
  listPrice?: number;
  savings: number;
  discountPercent: number;
}

/** Returns the separate-item value only when every pack line has a known price. */
export function getPackPricingSummary(pack: Pack, products: Product[]): PackPricingSummary {
  const currentPrice = Math.max(0, Math.round(Number(pack.price) || 0));
  if (!pack.items.length || currentPrice <= 0) return { savings: 0, discountPercent: 0 };

  let listPrice = 0;
  for (const item of pack.items) {
    const product = products.find(candidate => candidate.id === item.productId)
      || products.find(candidate => candidate.name === item.productName);
    const variant = product?.variants.find(candidate => candidate.label === item.variant)
      || product?.variants[0];
    const unitPrice = Number(variant?.originalPrice ?? product?.originalPrice ?? variant?.price ?? product?.price ?? 0);
    const quantity = Math.max(0, Math.trunc(Number(item.quantity) || 0));
    if (!product || !variant || unitPrice <= 0 || quantity <= 0) return { savings: 0, discountPercent: 0 };
    listPrice += unitPrice * quantity;
  }

  if (listPrice <= currentPrice) return { savings: 0, discountPercent: 0 };
  const savings = listPrice - currentPrice;
  return {
    listPrice,
    savings,
    discountPercent: Math.round((savings / listPrice) * 100),
  };
}
