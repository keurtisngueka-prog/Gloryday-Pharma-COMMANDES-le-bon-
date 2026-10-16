import { CartItem } from '../types';

export interface VolumeTier {
  minQty: number;
  discountPercent: number;
  label: string;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { minQty: 20, discountPercent: 15, label: 'Palier Centrale (20+ unités)' },
  { minQty: 10, discountPercent: 10, label: 'Palier Hôpital (10-19 unités)' },
  { minQty: 5, discountPercent: 5, label: 'Palier Clinique (5-9 unités)' }
];

export function getVolumeDiscountTier(quantity: number): {
  discountPercent: number;
  label?: string;
  nextTier?: { minQty: number; discountPercent: number; remaining: number };
} {
  if (quantity >= 20) {
    return { discountPercent: 15, label: '-15% Gros Volume' };
  }
  if (quantity >= 10) {
    return {
      discountPercent: 10,
      label: '-10% Volume Hôpital',
      nextTier: { minQty: 20, discountPercent: 15, remaining: 20 - quantity }
    };
  }
  if (quantity >= 5) {
    return {
      discountPercent: 5,
      label: '-5% Volume Clinique',
      nextTier: { minQty: 10, discountPercent: 10, remaining: 10 - quantity }
    };
  }
  return {
    discountPercent: 0,
    nextTier: { minQty: 5, discountPercent: 5, remaining: 5 - quantity }
  };
}

export function calculateItemVolumePrice(unitPrice: number, quantity: number, isQuote = false) {
  if (isQuote || unitPrice <= 0 || quantity <= 0) {
    return {
      unitPrice,
      discountedUnitPrice: unitPrice,
      discountPercent: 0,
      totalWithoutDiscount: 0,
      totalWithDiscount: 0,
      savings: 0,
      tierLabel: undefined
    };
  }

  const { discountPercent, label } = getVolumeDiscountTier(quantity);
  const totalWithoutDiscount = unitPrice * quantity;
  const savings = Math.round(totalWithoutDiscount * (discountPercent / 100));
  const totalWithDiscount = totalWithoutDiscount - savings;
  const discountedUnitPrice = Math.round(totalWithDiscount / quantity);

  return {
    unitPrice,
    discountedUnitPrice,
    discountPercent,
    totalWithoutDiscount,
    totalWithDiscount,
    savings,
    tierLabel: label
  };
}

export function calculateCartVolumeSummary(items: CartItem[]) {
  let grossTotal = 0;
  let totalSavings = 0;
  let netTotal = 0;
  let discountedItemsCount = 0;

  items.forEach(item => {
    if (item.isQuote) return;
    const calc = calculateItemVolumePrice(item.price, item.quantity, item.isQuote);
    grossTotal += calc.totalWithoutDiscount;
    totalSavings += calc.savings;
    netTotal += calc.totalWithDiscount;
    if (calc.discountPercent > 0) {
      discountedItemsCount += 1;
    }
  });

  return {
    grossTotal,
    totalSavings,
    netTotal,
    discountedItemsCount
  };
}
