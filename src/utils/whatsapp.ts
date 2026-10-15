import { Order, Pack } from '../types';

export const WHATSAPP_PRIMARY = '24177003004';
export const WHATSAPP_SECONDARY = '24166240399';

export function formatOrderWhatsAppMessage(order: Order, pdfLink?: string): string {
  const lines: string[] = [];
  lines.push('🏥 *NOUVELLE COMMANDE GLORYDAY PHARMA*');
  lines.push(`📄 *Réf :* ${order.reference}`);
  lines.push(`📅 *Date :* ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`);
  lines.push('');
  lines.push('🏢 *Établissement :* ' + order.customer.facilityName);
  if (order.customer.contactName && order.customer.contactName !== order.customer.facilityName) {
    lines.push('👤 *Contact :* ' + order.customer.contactName);
  }
  lines.push('📞 *Téléphone :* ' + order.customer.phone);
  lines.push('📍 *Adresse :* ' + order.customer.deliveryAddress);
  lines.push('🚚 *Mode réception :* ' + (order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait au dépôt'));
  lines.push('💳 *Paiement prévu :* ' + order.customer.paymentMethod.replace('_', ' ').toUpperCase());

  if (order.customer.notes) {
    lines.push('📝 *Remarques :* ' + order.customer.notes);
  }
  lines.push('');
  lines.push('📦 *DÉTAIL DES ARTICLES :*');
  order.items.forEach((item, index) => {
    const variantStr = item.variant && item.variant !== 'Standard' ? ` (${item.variant})` : '';
    if (item.isQuote) {
      lines.push(`${index + 1}. ${item.quantity}x ${item.productName}${variantStr} → *SUR DEVIS*`);
    } else {
      lines.push(`${index + 1}. ${item.quantity}x ${item.productName}${variantStr} : ${item.total.toLocaleString('fr-FR')} FCFA`);
    }
  });
  lines.push('');
  lines.push(`💰 *TOTAL ESTIMÉ :* ${order.estimatedTotal.toLocaleString('fr-FR')} FCFA (Sans TVA)`);
  if (order.hasQuoteItems) {
    lines.push('⚠️ _Note : Cette commande comprend des articles sur devis à chiffrer._');
  }

  if (pdfLink) {
    const fullPdfUrl = pdfLink.startsWith('http')
      ? pdfLink
      : `${window.location.origin}${pdfLink}`;
    lines.push('');
    lines.push(`📑 *Bon de commande PDF :* ${fullPdfUrl}`);
  }

  lines.push('');
  lines.push('Merci de confirmer la disponibilité et le délai de mise à disposition.');
  return lines.join('\n');
}

export function generateWhatsAppOrderUrl(order: Order, pdfLink?: string, useSecondary = false): string {
  const number = useSecondary ? WHATSAPP_SECONDARY : WHATSAPP_PRIMARY;
  const message = formatOrderWhatsAppMessage(order, pdfLink);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function generateWhatsAppPackUrl(pack: Pack, useSecondary = false): string {
  const number = useSecondary ? WHATSAPP_SECONDARY : WHATSAPP_PRIMARY;
  const message = `Bonjour Gloryday Pharma,\nJe souhaite des informations et commander le *${pack.title}* proposé à *${pack.price.toLocaleString('fr-FR')} FCFA*.\nPouvez-vous me confirmer sa disponibilité et les modalités ?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
