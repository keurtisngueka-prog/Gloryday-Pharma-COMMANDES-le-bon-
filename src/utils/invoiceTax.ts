export const INVOICE_TVA_RATE = 0;
export const INVOICE_CSS_RATE = 0.01;

export interface InvoiceTaxAmounts {
  totalHT: number;
  tvaRate: number;
  tvaAmount: number;
  cssRate: number;
  cssAmount: number;
  totalTTC: number;
}

/** Invoice policy requested by Gloryday Pharma: TVA is shown at 0%; CSS is 1%. */
export function calculateInvoiceTaxAmounts(baseAmount: number): InvoiceTaxAmounts {
  const totalHT = Math.max(0, Math.round(Number(baseAmount) || 0));
  const tvaAmount = 0;
  const cssAmount = Math.round(totalHT * INVOICE_CSS_RATE);
  return {
    totalHT,
    tvaRate: INVOICE_TVA_RATE,
    tvaAmount,
    cssRate: INVOICE_CSS_RATE,
    cssAmount,
    totalTTC: totalHT + tvaAmount + cssAmount,
  };
}
