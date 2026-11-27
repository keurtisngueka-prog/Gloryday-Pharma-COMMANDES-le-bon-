import type { Order } from '../types';
import { getOrderBillingTotal } from './orderFulfillment.js';

export function createShortInvoiceNumber(type: 'facture' | 'avoir', date = new Date()): string {
  const prefix = type === 'facture' ? 'FAC' : 'AV';
  const year = String(date.getFullYear()).slice(-2);
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomValues = new Uint8Array(8);
  const hasSecureRandom = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
  if (hasSecureRandom) crypto.getRandomValues(randomValues);
  const token = hasSecureRandom
    ? Array.from(randomValues, (value) => alphabet[value % alphabet.length]).join('')
    : Math.random().toString(36).slice(2, 10).padEnd(8, '0').toUpperCase();
  return `${prefix}-${year}-${token}`;
}

export const FREE_DELIVERY_THRESHOLD_FCFA = 30_000;

type FinanceOrder = Pick<Order, 'estimatedTotal' | 'isPaid' | 'amountPaid' | 'installments' | 'status'> &
  Partial<Pick<Order, 'legacyPaidAmount'>> &
  Partial<Pick<Order, 'invoices' | 'deliveryFulfillments'>>;

export function getOrderPaidAmount(order: FinanceOrder): number {
  if (order.status === 'Annulée') return 0;
  const total = getOrderBillingTotal(order);
  if (order.installments?.length || Number(order.legacyPaidAmount) > 0) {
    const confirmed = (order.installments || []).reduce(
      (sum, installment) => sum + (installment.status === 'valide' ? Math.max(0, Math.trunc(Number(installment.amount) || 0)) : 0),
      0,
    );
    return confirmed + Math.max(0, Math.trunc(Number(order.legacyPaidAmount) || 0));
  }
  if (order.isPaid && (!Number.isFinite(Number(order.amountPaid)) || Number(order.amountPaid) <= 0)) {
    return Math.max(total, Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0)));
  }
  if (Number.isFinite(Number(order.amountPaid))) {
    return Math.max(0, Math.trunc(Number(order.amountPaid)));
  }
  return order.isPaid ? Math.max(total, Math.max(0, Math.trunc(Number(order.estimatedTotal) || 0))) : 0;
}

export function getOrderRemainingBalance(order: FinanceOrder): number {
  return Math.max(0, getOrderBillingTotal(order) - getOrderPaidAmount(order));
}

export function getOrderCreditBalance(order: FinanceOrder): number {
  return Math.max(0, getOrderPaidAmount(order) - getOrderBillingTotal(order));
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
