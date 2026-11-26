import type { Product, ProductVariant } from '../types';

export function isProductPromoted(product: Product): boolean {
  return Boolean(
    product.isPromotion ||
    Number(product.discountPercentage) > 0 ||
    (Number(product.originalPrice) > 0 && Number(product.originalPrice) > Number(product.variants?.[0]?.price || 0)) ||
    product.variants?.some((variant) =>
      Number(variant.discountPercentage) > 0 ||
      (Number(variant.originalPrice) > 0 && Number(variant.originalPrice) > Number(variant.price))
    )
  );
}

export function getVariantPromotion(product: Product, variant?: ProductVariant): {
  active: boolean;
  discountPercent: number;
  originalPrice?: number;
} {
  const price = Number(variant?.price || 0);
  const originalPrice = Number(variant?.originalPrice || product.originalPrice || 0);
  const explicitDiscount = Number(variant?.discountPercentage || product.discountPercentage || 0);
  const discountPercent = explicitDiscount > 0
    ? explicitDiscount
    : originalPrice > price && originalPrice > 0
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;
  return {
    active: price > 0 && (
      Boolean(product.isPromotion) ||
      Number(product.discountPercentage) > 0 ||
      Number(variant?.discountPercentage) > 0 ||
      originalPrice > price
    ),
    discountPercent,
    originalPrice: originalPrice > price ? originalPrice : undefined,
  };
}
