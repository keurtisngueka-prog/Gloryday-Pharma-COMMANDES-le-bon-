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

export function getOrderSoldWithoutStockReservationQuantity(order: Pick<Order, 'deliveryFulfillments'>, itemIndex: number): number {
  return Math.max(0, (order.deliveryFulfillments || []).reduce(
    (sum, fulfillment) => sum + (fulfillment.lines || []).reduce(
      (lineSum, line) => line.itemIndex === itemIndex && line.soldWithoutStockReservation === true
        ? lineSum + Math.max(0, Math.trunc(Number(line.quantity) || 0))
        : lineSum,
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
    const billableDelivered = item.isDeferredStock
      ? getOrderSoldWithoutStockReservationQuantity(order, itemIndex)
      : delivered;
    const quantity = Math.max(0, billableDelivered - (billedByIndex.get(itemIndex) || 0));
    if (!quantity || item.isQuote) return [];
    const unitPrice = Math.max(0, Math.trunc(Number(item.price) || 0));
    const orderedQuantity = Math.max(1, Math.trunc(Number(item.quantity) || 0));
    const storedOrderTotal = Number(item.total);
    const orderLineTotal = Number.isFinite(storedOrderTotal)
      ? Math.max(0, Math.trunc(storedOrderTotal))
      : unitPrice * orderedQuantity;
    const previouslyBilledQuantity = Math.max(0, billedByIndex.get(itemIndex) || 0);
    const lineTotal = Math.round(orderLineTotal * (previouslyBilledQuantity + quantity) / orderedQuantity)
      - Math.round(orderLineTotal * previouslyBilledQuantity / orderedQuantity);
    const storedSavings = Math.max(0, Math.trunc(Number(item.savings) || 0));
    const lineSavings = Math.round(storedSavings * (previouslyBilledQuantity + quantity) / orderedQuantity)
      - Math.round(storedSavings * previouslyBilledQuantity / orderedQuantity);
    return [{
      itemIndex,
      productId: item.productId,
      productReference: item.productReference,
      productName: item.productName,
      variant: item.variant,
      quantity,
      unitPrice,
      lineTotal,
      savings: lineSavings,
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
