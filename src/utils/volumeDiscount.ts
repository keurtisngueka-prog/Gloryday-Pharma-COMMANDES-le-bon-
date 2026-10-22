import { CartItem, VolumeDiscountSettings } from '../types';

export interface VolumeTier {
  minQty: number;
  discountPercent: number;
  label: string;
}

export const DEFAULT_VOLUME_DISCOUNT_SETTINGS: VolumeDiscountSettings = {
  enabled: true,
  tier1Qty: 5,
  tier1Percent: 5,
  tier2Qty: 10,
  tier2Percent: 10,
  tier3Qty: 20,
  tier3Percent: 15,
};

let activeVolumeSettings: VolumeDiscountSettings = { ...DEFAULT_VOLUME_DISCOUNT_SETTINGS };

export function sanitizeVolumeDiscountSettings(settings?: Partial<VolumeDiscountSettings> | null): VolumeDiscountSettings {
  if (!settings) {
    return { ...DEFAULT_VOLUME_DISCOUNT_SETTINGS };
  }
  const tier1Qty = Math.max(1, Math.round(Number(settings.tier1Qty) || DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier1Qty));
  const tier2Qty = Math.max(tier1Qty + 1, Math.round(Number(settings.tier2Qty) || DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier2Qty));
  const tier3Qty = Math.max(tier2Qty + 1, Math.round(Number(settings.tier3Qty) || DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier3Qty));

  return {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_VOLUME_DISCOUNT_SETTINGS.enabled,
    tier1Qty,
    tier1Percent: Math.max(0, Math.min(80, Number(settings.tier1Percent) ?? DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier1Percent)),
    tier2Qty,
    tier2Percent: Math.max(0, Math.min(80, Number(settings.tier2Percent) ?? DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier2Percent)),
    tier3Qty,
    tier3Percent: Math.max(0, Math.min(80, Number(settings.tier3Percent) ?? DEFAULT_VOLUME_DISCOUNT_SETTINGS.tier3Percent)),
  };
}

export function setActiveVolumeDiscountSettings(settings?: Partial<VolumeDiscountSettings> | null): VolumeDiscountSettings {
  activeVolumeSettings = sanitizeVolumeDiscountSettings(settings);
  return { ...activeVolumeSettings };
}

export function getActiveVolumeDiscountSettings(): VolumeDiscountSettings {
  return { ...activeVolumeSettings };
}

export function getVolumeTiers(customSettings?: VolumeDiscountSettings): VolumeTier[] {
  const s = customSettings ? sanitizeVolumeDiscountSettings(customSettings) : activeVolumeSettings;
  if (!s.enabled) return [];
  return [
    { minQty: s.tier3Qty, discountPercent: s.tier3Percent, label: `Palier Centrale (${s.tier3Qty}+ unités)` },
    { minQty: s.tier2Qty, discountPercent: s.tier2Percent, label: `Palier Hôpital (${s.tier2Qty}-${s.tier3Qty - 1} unités)` },
    { minQty: s.tier1Qty, discountPercent: s.tier1Percent, label: `Palier Clinique (${s.tier1Qty}-${s.tier2Qty - 1} unités)` }
  ];
}

export const VOLUME_TIERS: VolumeTier[] = getVolumeTiers(DEFAULT_VOLUME_DISCOUNT_SETTINGS);

export function getVolumeDiscountTier(
  quantity: number,
  customSettings?: VolumeDiscountSettings
): {
  discountPercent: number;
  label?: string;
  nextTier?: { minQty: number; discountPercent: number; remaining: number };
} {
  const s = customSettings ? sanitizeVolumeDiscountSettings(customSettings) : activeVolumeSettings;
  if (!s.enabled) {
    return { discountPercent: 0 };
  }

  if (quantity >= s.tier3Qty && s.tier3Percent > 0) {
    return { discountPercent: s.tier3Percent, label: `-${s.tier3Percent}% Gros Volume` };
  }
  if (quantity >= s.tier2Qty && s.tier2Percent > 0) {
    return {
      discountPercent: s.tier2Percent,
      label: `-${s.tier2Percent}% Volume Hôpital`,
      nextTier: s.tier3Percent > s.tier2Percent
        ? { minQty: s.tier3Qty, discountPercent: s.tier3Percent, remaining: s.tier3Qty - quantity }
        : undefined
    };
  }
  if (quantity >= s.tier1Qty && s.tier1Percent > 0) {
    return {
      discountPercent: s.tier1Percent,
      label: `-${s.tier1Percent}% Volume Clinique`,
      nextTier: s.tier2Percent > s.tier1Percent
        ? { minQty: s.tier2Qty, discountPercent: s.tier2Percent, remaining: s.tier2Qty - quantity }
        : undefined
    };
  }
  return {
    discountPercent: 0,
    nextTier: s.tier1Percent > 0
      ? { minQty: s.tier1Qty, discountPercent: s.tier1Percent, remaining: Math.max(1, s.tier1Qty - quantity) }
      : undefined
  };
}

export function calculateItemVolumePrice(
  unitPrice: number,
  quantity: number,
  isQuote = false,
  customSettings?: VolumeDiscountSettings
) {
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

  const { discountPercent, label } = getVolumeDiscountTier(quantity, customSettings);
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

export function calculateCartVolumeSummary(items: CartItem[], customSettings?: VolumeDiscountSettings) {
  let grossTotal = 0;
  let totalSavings = 0;
  let netTotal = 0;
  let discountedItemsCount = 0;

  items.forEach(item => {
    if (item.isQuote || item.price <= 0) return;
    const calc = calculateItemVolumePrice(item.price, item.quantity, item.isQuote, customSettings);
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
