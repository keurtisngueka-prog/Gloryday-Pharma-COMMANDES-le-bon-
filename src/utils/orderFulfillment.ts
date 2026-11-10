import type { InvoiceLineItem, Order } from '../types';

export function getOrderDeliveredQuantity(order: Pick<Order, 'deliveryFulfillments'>, itemIndex: number): number {
  return Math.max(0, (order.deliveryFulfillments || []).reduce(
    (sum, fulfillment) => sum + (fulfillment.lines || []).reduce(
      (lineSum, line) => line.itemIndex === itemIndex ? lineSum + Math.max(0, Math.trunc(Number(line.quantity) || 0)) : lineSum,
      0,
    ),
    0,
  ));
}

export function getOrderRemainingQuantity(order: Pick<Order, 'items' | 'deliveryFulfillments'>, itemIndex: number): number {
  const ordered = Math.max(0, Math.trunc(Number(order.items[itemIndex]?.quantity) || 0));
  return Math.max(0, ordered - getOrderDeliveredQuantity(order, itemIndex));
}

export function getInvoiceReadyLineItems(order: Order): InvoiceLineItem[] {
  const trackedDeliveries = (order.deliveryFulfillments || []).length > 0;
  const billedByIndex = new Map<number, number>();

  for (const invoice of order.invoices || []) {
    if (invoice.type !== 'facture') continue;
    if (invoice.lineItems?.length) {
      for (const line of invoice.lineItems) {
        billedByIndex.set(line.itemIndex, (billedByIndex.get(line.itemIndex) || 0) + Math.max(0, Math.trunc(Number(line.quantity) || 0)));
      }
    } else if (trackedDeliveries) {
      // Older invoices have no line snapshot. Conservatively treat the original order as already billed.
      order.items.forEach((item, itemIndex) => billedByIndex.set(itemIndex, Math.max(0, Math.trunc(Number(item.quantity) || 0))));
    }
  }

  return order.items.flatMap((item, itemIndex) => {
    const delivered = trackedDeliveries ? getOrderDeliveredQuantity(order, itemIndex) : Math.max(0, Math.trunc(Number(item.quantity) || 0));
    const quantity = Math.max(0, delivered - (billedByIndex.get(itemIndex) || 0));
    if (!quantity || item.isQuote || item.isDeferredStock) return [];
    const unitPrice = Math.max(0, Math.trunc(Number(item.price) || 0));
    return [{
      itemIndex,
      productId: item.productId,
      productName: item.productName,
      variant: item.variant,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      savings: Math.round((Math.max(0, Number(item.savings) || 0) * quantity) / Math.max(1, item.quantity)),
      discountPercent: item.discountPercent,
      isQuote: item.isQuote,
    }];
  });
}

export function getInvoiceReadyTotal(order: Order): number {
  const readyLines = getInvoiceReadyLineItems(order);
  if (readyLines.length === 0) return 0;
  const linesTotal = readyLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const hasPreviouslyBilledDeliveryFee = (order.invoices || []).some((invoice) => invoice.type === 'facture' && Number(invoice.deliveryFee) > 0);
  const deliveryFee = hasPreviouslyBilledDeliveryFee
    ? 0
    : Math.max(0, Math.trunc(Number(order.deliveryFee ?? order.customer.deliveryFee) || 0));
  return linesTotal + deliveryFee;
}

export function getOrderBillingTotal(order: Pick<Order, 'estimatedTotal'> & Partial<Pick<Order, 'invoices' | 'deliveryFulfillments'>>): number {
  if (!(order.deliveryFulfillments || []).length) return Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0));
  return Math.max(0, (order.invoices || []).reduce(
    (sum, invoice) => sum + (invoice.type === 'facture' ? 1 : -1) * Math.max(0, Math.trunc(Number(invoice.totalTTC) || 0)),
    0,
  ));
}
