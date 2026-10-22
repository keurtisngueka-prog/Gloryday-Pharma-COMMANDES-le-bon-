import { Order } from '../types';

const formatPdfAmount = (amount: number) =>
  `${Number.isFinite(amount) ? amount : 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const normalizePdfText = (value: unknown) => String(value ?? '')
  .normalize('NFC')
  .replace(/[\u00a0\u202f]/g, ' ')
  .replace(/[“”]/g, '"')
  .replace(/[’]/g, "'")
  .replace(/[–—]/g, '-');

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Le fichier PDF n’a pas pu être préparé pour son téléchargement.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Lecture du PDF impossible.'));
    reader.readAsDataURL(blob);
  });
}

export function createPdfObjectUrl(dataUrl: string): string {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex < 0 || !dataUrl.slice(0, separatorIndex).includes(';base64')) {
    throw new Error('Le bon PDF n’est pas dans un format téléchargeable.');
  }

  const binary = window.atob(dataUrl.slice(separatorIndex + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export async function generateOrderPdf(order: Order): Promise<{ blob: Blob; dataUrl: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const blue = [13, 68, 232];
  const ink = [22, 22, 24];
  const muted = [106, 106, 107];
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const text = (value: unknown) => normalizePdfText(value);
  const paymentLabels: Record<string, string> = {
    especes: 'Espèces',
    airtel_money: 'Airtel Money',
    moov_money: 'Moov Money',
    virement: 'Virement bancaire'
  };
  const mobilePayment = order.mobilePayment || order.customer.mobilePayment;
  const paymentText = mobilePayment?.transactionReference
    ? `${paymentLabels[order.customer.paymentMethod] || 'Paiement'} - Réf. ${mobilePayment.transactionReference}`
    : `${paymentLabels[order.customer.paymentMethod] || 'Paiement'}${order.isPaid ? ' - Acquitté' : ''}`;
  const deliveryMode = order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait en agence';
  const createdAt = new Date(order.createdAt);
  const orderDate = Number.isNaN(createdAt.getTime()) ? 'Date non précisée' : createdAt.toLocaleDateString('fr-FR');

  const drawHeader = () => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(19);
    doc.text('GLORYDAY PHARMA', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Distribution médicale, consommables et équipements hospitaliers', margin, 21);
    doc.text('Libreville, Gabon | +241 77 003 004 / +241 66 240 399', pageWidth - margin, 21, { align: 'right' });

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BON DE COMMANDE PROVISOIRE', margin, 41);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageWidth - 83, 32, 69, 25, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.text(`Réf. : ${text(order.reference)}`, pageWidth - 78, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date : ${orderDate}`, pageWidth - 78, 45);
    doc.text(`Statut : ${text(order.status)}`, pageWidth - 78, 51);
  };

  drawHeader();

  const clientBoxTop = 61;
  const leftColumnX = margin + 4;
  const rightColumnX = pageWidth / 2 + 4;
  const rightColumnWidth = pageWidth - rightColumnX - margin - 4;
  const addressLines = doc.splitTextToSize(`Adresse : ${text(order.customer.deliveryAddress || 'Non renseignée')}`, rightColumnWidth);
  const notesLines = order.customer.notes
    ? doc.splitTextToSize(`Instructions : ${text(order.customer.notes)}`, rightColumnWidth)
    : [];
  const addressY = 81;
  const paymentY = addressY + addressLines.length * 4 + 1;
  const notesY = paymentY + 5;
  const clientBoxBottom = Math.max(91, notesLines.length ? notesY + notesLines.length * 4 : paymentY + 5) + 4;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, clientBoxTop, contentWidth, clientBoxBottom - clientBoxTop, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('CLIENT / DESTINATAIRE', leftColumnX, 68);
  doc.setFontSize(9);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(text(order.customer.facilityName || '�?tablissement'), leftColumnX, 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Contact : ${text(order.customer.contactName || order.customer.facilityName)}`, leftColumnX, 81);
  doc.text(`Téléphone : ${text(order.customer.phone)}`, leftColumnX, 86);
  doc.setFont('helvetica', 'bold');
  doc.text(`Réception : ${deliveryMode}`, rightColumnX, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(addressLines, rightColumnX, addressY);
  doc.text(paymentText, rightColumnX, paymentY);
  if (notesLines.length) doc.text(notesLines, rightColumnX, notesY);

  const drawTableHeader = (top: number) => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin, top, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Article et variante', margin + 4, top + 5.5);
    doc.text('Qté', 126, top + 5.5, { align: 'center' });
    doc.text('Prix unit. (FCFA)', 158, top + 5.5, { align: 'right' });
    doc.text('Total (FCFA)', pageWidth - margin - 4, top + 5.5, { align: 'right' });
  };

  let y = clientBoxBottom + 8;
  if (y > pageHeight - 74) {
    doc.addPage();
    y = 20;
  }
  drawTableHeader(y);
  y += 8;

  let totalSavings = 0;
  let itemsSubtotal = 0;
  const items = order.items || [];
  items.forEach((item, index) => {
    const itemLabel = item.variant && item.variant !== 'Standard'
      ? `${text(item.productName)} (${text(item.variant)})`
      : text(item.productName);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const labelLines = doc.splitTextToSize(itemLabel || 'Article', 99);
    const rowHeight = Math.max(8, labelLines.length * 4.2 + 3.5);
    if (y + rowHeight > pageHeight - 28) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += 8;
    }
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(labelLines, margin + 4, y + 5.2);
    const valueY = y + Math.min(rowHeight - 1.5, Math.max(5.2, rowHeight / 2 + 1));
    doc.text(String(item.quantity), 126, valueY, { align: 'center' });
    if (item.isQuote) {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.text('Sur devis', 158, valueY, { align: 'right' });
      doc.text('Sur devis', pageWidth - margin - 4, valueY, { align: 'right' });
    } else {
      const unitPrice = Number(item.price) || 0;
      const lineTotal = Number(item.total) || 0;
      itemsSubtotal += lineTotal;
      totalSavings += Number(item.savings) || 0;
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.setFont('helvetica', 'normal');
      doc.text(formatPdfAmount(unitPrice), 158, valueY, { align: 'right' });
      doc.text(formatPdfAmount(lineTotal), pageWidth - margin - 4, valueY, { align: 'right' });
    }
    y += rowHeight;
  });

  y += 6;
  const deliveryFee = Number(order.deliveryFee ?? order.customer.deliveryFee) || 0;
  const orderTotal = Number(order.estimatedTotal) || itemsSubtotal + deliveryFee;
  const totalsRows = 2 + (deliveryFee > 0 ? 1 : 0) + (totalSavings > 0 ? 1 : 0);
  const boxHeight = 8 + totalsRows * 6;
  if (y + boxHeight > pageHeight - 23) {
    doc.addPage();
    y = 22;
  }

  const totalsBoxX = pageWidth - margin - 92;
  const totalsBoxWidth = 92;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, boxHeight, 2, 2, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(ink[0], ink[1], ink[2]);
  let totalY = y + 7;
  doc.text('Sous-total articles', totalsBoxX + 4, totalY);
  doc.text(`${formatPdfAmount(itemsSubtotal)} FCFA`, pageWidth - margin - 4, totalY, { align: 'right' });
  if (deliveryFee > 0) {
    totalY += 6;
    doc.text('Livraison', totalsBoxX + 4, totalY);
    doc.text(`${formatPdfAmount(deliveryFee)} FCFA`, pageWidth - margin - 4, totalY, { align: 'right' });
  }
  if (totalSavings > 0) {
    totalY += 6;
    doc.setTextColor(5, 150, 105);
    doc.text(`Remise volume incluse : -${formatPdfAmount(totalSavings)} FCFA`, totalsBoxX + 4, totalY);
  }
  totalY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('TOTAL ESTIM�?', totalsBoxX + 4, totalY);
  doc.text(`${formatPdfAmount(orderTotal)} FCFA`, pageWidth - margin - 4, totalY, { align: 'right' });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Prix en FCFA hors taxes. Commande à confirmer par Gloryday Pharma.', margin, pageHeight - 9);
    doc.text(`${text(order.reference)} | Page ${page}/${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  const blob = doc.output('blob');
  const dataUrl = await readBlobAsDataUrl(blob);
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

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE DEMANDE D\'ENGAGEMENT & VISA INTERNE', 14, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Gloryday Pharma Gabon · Circuit de Validation Hiérarchique Clinique & Hôpital', 14, 21);
  doc.text(`Réf : ${order.reference}`, pageWidth - 14, 21, { align: 'right' });

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
