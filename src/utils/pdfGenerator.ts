import { Order } from '../types';

export async function generateOrderPdf(order: Order): Promise<{ blob: Blob; dataUrl: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // CleanShot X / Medical Colors
  const blueDark = [13, 68, 232]; // #0d44e8
  const graphite = [22, 22, 24]; // #161618
  const slateMuted = [106, 106, 107]; // #6a6a6b

  // Top header banner
  doc.setFillColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.rect(0, 0, pageWidth, 30, 'F');

  // Official Gloryday Pharma Vector Emblem in PDF Header (Shield + Medical Cross)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 6, 17, 17, 3.5, 3.5, 'F');
  doc.setDrawColor(13, 68, 232);
  doc.setLineWidth(0.6);
  doc.roundedRect(15.4, 7.4, 14.2, 14.2, 2.5, 2.5, 'S');
  // Inner Cobalt Medical Cross
  doc.setFillColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.roundedRect(21.1, 9.5, 2.8, 10, 0.8, 0.8, 'F');
  doc.roundedRect(17.5, 13.1, 10, 2.8, 0.8, 0.8, 'F');
  // Center white point
  doc.setFillColor(255, 255, 255);
  doc.circle(22.5, 14.5, 0.9, 'F');

  // Header Title & Official Brand Lockup
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text('GLORYDAY PHARMA GABON', 35, 14.5);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Distribution Médicale, Consommables & Équipements Hospitaliers Certifiés', 35, 20.5);
  doc.setFontSize(8);
  doc.text('Libreville - GABON | Tél: +241 77 003 004 / +241 66 240 399', pageWidth - 14, 25.5, { align: 'right' });

  // Sub-header / Order Badge
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE COMMANDE PROVISOIRE', 14, 40);

  // Order Details Box (Top Right)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - 85, 32, 71, 25, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`N° Réf : ${order.reference}`, pageWidth - 80, 39);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${new Date(order.createdAt).toLocaleDateString('fr-FR')}`, pageWidth - 80, 45);
  doc.text(`Statut : ${order.status}`, pageWidth - 80, 51);

  // Client Info Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 50, pageWidth - 28, 28, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.text('DESTINATAIRE / ÉTABLISSEMENT CLIENT', 18, 56);
  doc.setFontSize(9);
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(order.customer.facilityName, 18, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contact : ${order.customer.contactName || order.customer.facilityName}`, 18, 67);
  doc.text(`Téléphone : ${order.customer.phone}`, 18, 72);
  doc.text(`Mode réception : ${order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait en agence'}`, pageWidth / 2 + 5, 62);
  doc.text(`Adresse : ${order.customer.deliveryAddress}`, pageWidth / 2 + 5, 67);
  const mp = order.mobilePayment || order.customer.mobilePayment;
  let paymentText = `Paiement : ${order.customer.paymentMethod.replace('_', ' ').toUpperCase()}`;
  if (mp && (order.customer.paymentMethod === 'airtel_money' || order.customer.paymentMethod === 'moov_money')) {
    const op = mp.provider === 'airtel_money' ? 'Airtel Money' : 'Moov Money';
    paymentText = `${op} - ${mp.transactionReference ? `Réf: ${mp.transactionReference}` : (order.isPaid ? 'Acquitté' : 'À réception')}`;
  }
  doc.text(paymentText, pageWidth / 2 + 5, 72);

  // Table Header
  let y = 86;
  doc.setFillColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Désignation de l\'article & Variante', 18, y + 5.5);
  doc.text('Qté', 125, y + 5.5, { align: 'center' });
  doc.text('Prix Unit. (FCFA)', 155, y + 5.5, { align: 'right' });
  doc.text('Total (FCFA)', pageWidth - 18, y + 5.5, { align: 'right' });

  // Table Rows
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  
  let totalSavings = 0;

  order.items.forEach((item, index) => {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 20;
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
    }
    doc.setFontSize(8.5);
    const itemLabel = item.variant && item.variant !== 'Standard'
      ? `${item.productName} (${item.variant})`
      : item.productName;
    const truncatedLabel = doc.splitTextToSize(itemLabel, 100);
    doc.text(truncatedLabel[0], 18, y + 5.5);
    doc.text(String(item.quantity), 125, y + 5.5, { align: 'center' });
    if (item.isQuote) {
      doc.setTextColor(217, 119, 6);
      doc.setFont('helvetica', 'bold');
      doc.text('Sur devis', 155, y + 5.5, { align: 'right' });
      doc.text('Sur devis', pageWidth - 18, y + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    } else {
      if (item.savings && item.savings > 0) {
        totalSavings += item.savings;
      }
      doc.text(item.price.toLocaleString('fr-FR'), 155, y + 5.5, { align: 'right' });
      doc.text(item.total.toLocaleString('fr-FR'), pageWidth - 18, y + 5.5, { align: 'right' });
    }
    y += 8;
  });

  // Totals Section
  y += 6;
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 20;
  }
  const totalsBoxX = pageWidth - 90;
  const boxHeight = totalSavings > 0 ? 32 : 26;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(totalsBoxX, y, 76, boxHeight, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total articles fermes :', totalsBoxX + 4, y + 7);
  doc.text(`${order.estimatedTotal.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, y + 7, { align: 'right' });
  
  let currentBoxY = y + 7;
  if (totalSavings > 0) {
    currentBoxY += 6;
    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('Économie Volume Clinique :', totalsBoxX + 4, currentBoxY);
    doc.text(`-${totalSavings.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, currentBoxY, { align: 'right' });
  }

  currentBoxY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.setFontSize(10.5);
  doc.text('TOTAL ESTIMÉ :', totalsBoxX + 4, currentBoxY);
  doc.text(`${order.estimatedTotal.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, currentBoxY, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Prix en FCFA hors taxes - Non soumis à la TVA', totalsBoxX + 4, currentBoxY + 6);

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');
  return { blob, dataUrl };
}

/**
 * Générateur du Bon de Demande d'Achat & Visa Interne
 * Formaté pour approbation hiérarchique au sein de la clinique/hôpital
 */
export async function generateInternalPurchaseOrderPdf(
  order: Order,
  options?: { department?: string; requesterTitle?: string }
): Promise<{ blob: Blob; dataUrl: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const blueDark = [13, 68, 232];
  const graphite = [22, 22, 24];
  const slateMuted = [106, 106, 107];

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Official Gloryday Pharma Vector Emblem in Internal Order PDF Header
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 5.5, 16, 16, 3, 3, 'F');
  doc.setFillColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.roundedRect(20.6, 8.5, 2.8, 10, 0.8, 0.8, 'F');
  doc.roundedRect(17, 12.1, 10, 2.8, 0.8, 0.8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE DEMANDE D\'ENGAGEMENT & VISA INTERNE', 34, 13);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Gloryday Pharma Gabon · Circuit de Validation Hiérarchique Clinique & Hôpital', 34, 19.5);
  doc.text(`Réf : ${order.reference}`, pageWidth - 14, 19.5, { align: 'right' });

  // Établissement & Service Demandeur Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 34, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text('ÉTABLISSEMENT DEMANDEUR :', 18, 41);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.customer.facilityName} (${order.customer.facilityType || 'Clinique'})`, 85, 41);

  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE / BLOC OPÉRATOIRE :', 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(options?.department || 'Bloc Chirurgical / Pharmacie Centrale', 85, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('RESPONSABLE DEMANDEUR :', 18, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(`${order.customer.contactName || 'Major de Bloc'} (${order.customer.phone})`, 85, 55);

  // Table of Items
  let y = 66;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Désignation & Spécification Médicale', 18, y + 5.5);
  doc.text('Qté', 125, y + 5.5, { align: 'center' });
  doc.text('Prix Unit. (FCFA)', 155, y + 5.5, { align: 'right' });
  doc.text('Total (FCFA)', pageWidth - 18, y + 5.5, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);

  let totalSavings = 0;
  order.items.forEach((item, index) => {
    if (y > pageHeight - 85) {
      doc.addPage();
      y = 20;
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 7.5, 'F');
    }
    doc.setFontSize(8);
    const itemLabel = item.variant && item.variant !== 'Standard'
      ? `${item.productName} (${item.variant})`
      : item.productName;
    const truncatedLabel = doc.splitTextToSize(itemLabel, 100);
    doc.text(truncatedLabel[0], 18, y + 5);
    doc.text(String(item.quantity), 125, y + 5, { align: 'center' });
    if (item.isQuote) {
      doc.text('Sur devis', 155, y + 5, { align: 'right' });
      doc.text('Sur devis', pageWidth - 18, y + 5, { align: 'right' });
    } else {
      if (item.savings) totalSavings += item.savings;
      doc.text(item.price.toLocaleString('fr-FR'), 155, y + 5, { align: 'right' });
      doc.text(item.total.toLocaleString('fr-FR'), pageWidth - 18, y + 5, { align: 'right' });
    }
    y += 7.5;
  });

  // Total Recap Strip
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text('MONTANT TOTAL ESTIMÉ À ENGAGER :', 18, y + 6.5);
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.text(`${order.estimatedTotal.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, y + 6.5, { align: 'right' });

  // 3-Signature Approval Block (The core of Internal Validation)
  y += 16;
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 25;
  }

  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CIRCUIT DES VISAS & BON POUR COMMANDE', 14, y);

  y += 5;
  const colWidth = (pageWidth - 28 - 8) / 3;
  const boxHeight = 36;

  // Box 1: Visa Demandeur
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('1. VISA DEMANDEUR', 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Major de Bloc / Surveillant(e)', 18, y + 10);
  doc.text('Date : ____ / ____ / 2026', 18, y + 26);
  doc.text('Signature & Cachet :', 18, y + 31);

  // Box 2: Visa Direction Médicale
  const box2X = 14 + colWidth + 4;
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.roundedRect(box2X, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('2. DIRECTION MÉDICALE', box2X + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Médecin Chef / Pharmacien Gérant', box2X + 4, y + 10);
  doc.text('Date : ____ / ____ / 2026', box2X + 4, y + 26);
  doc.text('Mention « Bon pour accord » :', box2X + 4, y + 31);

  // Box 3: Visa Direction Financière
  const box3X = box2X + colWidth + 4;
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.roundedRect(box3X, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('3. COMPTABILITÉ / DAF', box3X + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Contrôle Budgétaire & Engagement', box3X + 4, y + 10);
  doc.text('Date : ____ / ____ / 2026', box3X + 4, y + 26);
  doc.text('Visa de Paiement Prévu :', box3X + 4, y + 31);

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');
  return { blob, dataUrl };
}
