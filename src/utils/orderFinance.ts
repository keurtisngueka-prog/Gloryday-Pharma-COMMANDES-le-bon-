import type { Order } from '../types';
import { getOrderBillingTotal } from './orderFulfillment.js';

export const FREE_DELIVERY_THRESHOLD_FCFA = 30_000;

type FinanceOrder = Pick<Order, 'estimatedTotal' | 'isPaid' | 'amountPaid' | 'installments' | 'status'> &
  Partial<Pick<Order, 'invoices' | 'deliveryFulfillments'>>;

export function getOrderPaidAmount(order: FinanceOrder): number {
  if (order.status === 'Annulée') return 0;
  const total = getOrderBillingTotal(order);
  if (order.installments?.length) {
    const confirmed = order.installments.reduce(
      (sum, installment) => sum + (installment.status === 'valide' ? Math.max(0, Math.trunc(Number(installment.amount) || 0)) : 0),
      0,
    );
    return (order.deliveryFulfillments || []).length ? confirmed : Math.min(total, confirmed);
  }
  if (order.isPaid && (!Number.isFinite(Number(order.amountPaid)) || Number(order.amountPaid) <= 0)) {
    return Math.max(total, Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0)));
  }
  if (Number.isFinite(Number(order.amountPaid))) {
    const paid = Math.max(0, Math.trunc(Number(order.amountPaid)));
    return (order.deliveryFulfillments || []).length ? paid : Math.min(total, paid);
  }
  return order.isPaid ? Math.max(total, Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0))) : 0;
}

export function getOrderRemainingBalance(order: FinanceOrder): number {
  return Math.max(0, getOrderBillingTotal(order) - getOrderPaidAmount(order));
}

export function isCollectionOverdue(order: FinanceOrder & Pick<Order, 'collectionDueDate'>): boolean {
  if (!order.collectionDueDate || getOrderRemainingBalance(order) <= 0) return false;
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const datePart = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((part) => part.type === type)?.value || '';
  const librevilleToday = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  return order.collectionDueDate < librevilleToday;
}

export function formatCollectionDueDate(value?: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '';
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
