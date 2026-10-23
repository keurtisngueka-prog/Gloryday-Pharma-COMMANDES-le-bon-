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
  const paymentMethod = String(order.customer?.paymentMethod || 'especes');
  lines.push('💳 *Mode de règlement :* ' + paymentMethod.replace(/_/g, ' ').toUpperCase());

  const mp = order.mobilePayment || order.customer.mobilePayment;
  if (mp && (order.customer.paymentMethod === 'airtel_money' || order.customer.paymentMethod === 'moov_money')) {
    const operatorName = mp.provider === 'airtel_money' ? 'Airtel Money Gabon (*150#)' : 'Moov Money Gabon (*555#)';
    lines.push(`📱 *Opérateur Mobile :* ${operatorName}`);
    lines.push(`🏢 *Compte Marchand :* ${mp.merchantPhone || (mp.provider === 'airtel_money' ? '077 00 30 04' : '066 24 03 99')}`);
    if (mp.transactionReference) {
      lines.push(`🔑 *Réf. Transaction SMS :* ${mp.transactionReference} (À vérifier)`);
    }
    if (mp.senderPhone) {
      lines.push(`👤 *N° Payeur / Émetteur :* ${mp.senderPhone}`);
    }
    const isPaid = order.isPaid || mp.isPrePaid || mp.status === 'verified';
    lines.push(`📊 *Statut Règlement Mobile :* ${isPaid ? '✅ DÉJÀ EFFECTUÉ / PRÉ-PAYÉ' : '⏳ PRÉVU À LA LIVRAISON'}`);
  }

  if (order.customer.notes) {
    lines.push('📝 *Remarques :* ' + order.customer.notes);
  }
  lines.push('');
  lines.push('📦 *DÉTAIL DES ARTICLES :*');
  let totalSavings = 0;
  (Array.isArray(order.items) ? order.items : []).forEach((item, index) => {
    const variantStr = item.variant && item.variant !== 'Standard' ? ` (${item.variant})` : '';
    if (item.savings && item.savings > 0) {
      totalSavings += item.savings;
    }
    if (item.isQuote) {
      lines.push(`${index + 1}. ${item.quantity}x ${item.productName}${variantStr} → *SUR DEVIS*`);
    } else {
      const discountTag = item.discountPercent ? ` (-${item.discountPercent}% vol.)` : '';
      lines.push(`${index + 1}. ${item.quantity}x ${item.productName}${variantStr}${discountTag} : ${item.total.toLocaleString('fr-FR')} FCFA`);
    }
  });
  lines.push('');
  if (totalSavings > 0) {
    lines.push(`✨ *Économie Volume Clinique :* -${totalSavings.toLocaleString('fr-FR')} FCFA`);
  }
  lines.push(`💰 *TOTAL ESTIMÉ :* ${Number(order.estimatedTotal || 0).toLocaleString('fr-FR')} FCFA (Sans TVA)`);
  if (order.hasQuoteItems) {
    lines.push('⚠️ _Note : Cette commande comprend des articles sur devis à chiffrer._');
  }

  if (pdfLink) {
    try {
      const fullPdfUrl = /^https?:\/\//i.test(pdfLink)
        ? new URL(pdfLink).toString()
        : typeof window !== 'undefined' && pdfLink.startsWith('/')
          ? new URL(pdfLink, window.location.origin).toString()
          : null;
      if (!fullPdfUrl) throw new Error('Le PDF n’est pas accessible publiquement.');
      lines.push('');
      lines.push(`📑 *Bon de commande PDF :* ${fullPdfUrl}`);
    } catch {
      // A bad or unavailable PDF URL must never block the WhatsApp order message.
    }
  }

  lines.push('');
  lines.push('Merci de confirmer la disponibilité et le délai de mise à disposition.');
  return lines.join('\n');
}

export function generateWhatsAppOrderUrl(order: Order, pdfLink?: string, useSecondary = false): string {
  const number = useSecondary ? WHATSAPP_SECONDARY : WHATSAPP_PRIMARY;
  const message = formatOrderWhatsAppMessage(order, pdfLink);
  const url = new URL(`https://wa.me/${number.replace(/\D/g, '')}`);
  url.searchParams.set('text', message);
  return url.toString();
}

export function generateWhatsAppWebOrderUrl(order: Order, pdfLink?: string, useSecondary = false): string {
  const number = useSecondary ? WHATSAPP_SECONDARY : WHATSAPP_PRIMARY;
  const url = new URL('https://web.whatsapp.com/send');
  url.searchParams.set('phone', number.replace(/\D/g, ''));
  url.searchParams.set('text', formatOrderWhatsAppMessage(order, pdfLink));
  return url.toString();
}

export function generateWhatsAppPackUrl(pack: Pack, useSecondary = false): string {
  const number = useSecondary ? WHATSAPP_SECONDARY : WHATSAPP_PRIMARY;
  const message = `Bonjour Gloryday Pharma,\nJe souhaite des informations et commander le *${pack.title}* proposé à *${pack.price.toLocaleString('fr-FR')} FCFA*.\nPouvez-vous me confirmer sa disponibilité et les modalités ?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
