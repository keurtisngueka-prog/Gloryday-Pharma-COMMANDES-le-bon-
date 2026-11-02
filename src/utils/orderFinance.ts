import type { Order } from '../types';

export function getOrderPaidAmount(order: Pick<Order, 'estimatedTotal' | 'isPaid' | 'amountPaid' | 'installments' | 'status'>): number {
  if (order.status === 'Annulée') return 0;
  const total = Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0));
  if (order.isPaid) return total;
  if (order.installments?.length) {
    return Math.min(total, order.installments.reduce(
      (sum, installment) => sum + (installment.status === 'valide' ? Math.max(0, Math.trunc(Number(installment.amount) || 0)) : 0),
      0,
    ));
  }
  if (Number.isFinite(Number(order.amountPaid))) {
    return Math.min(total, Math.max(0, Math.trunc(Number(order.amountPaid))));
  }
  return order.isPaid ? total : 0;
}

export function getOrderRemainingBalance(order: Parameters<typeof getOrderPaidAmount>[0]): number {
  return Math.max(0, Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0)) - getOrderPaidAmount(order));
}

export function isCollectionOverdue(order: Pick<Order, 'collectionDueDate' | 'status' | 'estimatedTotal' | 'isPaid' | 'amountPaid' | 'installments'>): boolean {
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
