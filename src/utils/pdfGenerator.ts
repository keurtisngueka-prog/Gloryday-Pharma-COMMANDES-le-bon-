import { InvoiceRecord, Order } from '../types';
import { getOrderPaidAmount, getOrderRemainingBalance } from './orderFinance';

export const formatPdfAmount = (amount: number): string =>
  `${Number.isFinite(amount) ? Math.round(amount) : 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const normalizePdfText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFC')
    .replace(/\uFFFD/g, '')
    .replace(/[\u00a0\u202f\u2007\u2009]/g, ' ')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE');

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error("Le fichier PDF n'a pas pu être préparé pour son téléchargement."));
    };
    reader.onerror = () => reject(reader.error || new Error('Lecture du PDF impossible.'));
    reader.readAsDataURL(blob);
  });
}

export async function loadBrandLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/gloryday-logo.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    return await readBlobAsDataUrl(await response.blob());
  } catch {
    return null;
  }
}

export function createPdfObjectUrl(dataUrl: string): string {
  if (dataUrl.startsWith('blob:')) {
    return dataUrl;
  }
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex < 0 || !dataUrl.slice(0, separatorIndex).includes(';base64')) {
    throw new Error("Le bon PDF n'est pas dans un format téléchargeable.");
  }

  const binary = window.atob(dataUrl.slice(separatorIndex + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
}

export function triggerPdfBlobDownload(blobOrDataUrl: Blob | string, filename: string): void {
  const objectUrl =
    typeof blobOrDataUrl === 'string'
      ? createPdfObjectUrl(blobOrDataUrl)
      : URL.createObjectURL(blobOrDataUrl);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function createJsPdfInstance() {
  const mod: any = await import('jspdf');
  const JsPdfConstructor = mod.jsPDF || mod.default;
  if (typeof JsPdfConstructor !== 'function') {
    throw new Error('Module PDF (jsPDF) indisponible.');
  }
  return new JsPdfConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
}

export async function generateOrderPdf(order: Order): Promise<{ blob: Blob; dataUrl: string }> {
  const doc = await createJsPdfInstance();
  const logoDataUrl = await loadBrandLogoDataUrl();
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
    virement: 'Virement bancaire',
    cheque: 'Chèque',
    en_compte: 'Paiement à terme'
  };
  const mobilePayment = order.mobilePayment || order.customer.mobilePayment;
  const paymentText = mobilePayment?.transactionReference
    ? `${paymentLabels[order.customer.paymentMethod] || 'Paiement'} - Réf. ${text(mobilePayment.transactionReference)}`
    : `${paymentLabels[order.customer.paymentMethod] || 'Paiement'}${order.isPaid ? ' - Acquitté' : ''}`;
  const deliveryMode = order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait en agence';
  const createdAt = new Date(order.createdAt);
  const orderDate = Number.isNaN(createdAt.getTime()) ? 'Date non précisée' : text(createdAt.toLocaleDateString('fr-FR'));

  const drawHeader = () => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 2, 28, 24, 1.5, 1.5, 'F');
      doc.addImage(logoDataUrl, 'PNG', margin + 1, 2.5, 26, 23, 'GLORYDAY_LOGO', 'FAST');
      doc.text('GLORYDAY PHARMA', margin + 33, 13.5);
    } else {
      doc.text('GLORYDAY PHARMA', margin, 14);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(text(logoDataUrl ? 'Distribution médicale · Libreville, Gabon' : 'Distribution médicale, consommables et équipements hospitaliers'), logoDataUrl ? margin + 33 : margin, 21);
    doc.text('Libreville, Gabon', pageWidth - margin, 21, { align: 'right' });

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BON DE COMMANDE PROVISOIRE', margin, 41);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(pageWidth - 83, 32, 69, 25, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.text(text(`Réf. : ${order.reference}`), pageWidth - 78, 39);
    doc.setFont('helvetica', 'normal');
    doc.text(text(`Date : ${orderDate}`), pageWidth - 78, 45);
    doc.text(text(`Statut : ${order.status}`), pageWidth - 78, 51);
  };

  drawHeader();

  const clientBoxTop = 61;
  const leftColumnX = margin + 4;
  const rightColumnX = pageWidth / 2 + 4;
  const rightColumnWidth = pageWidth - rightColumnX - margin - 4;
  const addressLines = doc.splitTextToSize(text(`Adresse : ${order.customer.deliveryAddress || 'Non renseignée'}`), rightColumnWidth);
  const notesLines = order.customer.notes
    ? doc.splitTextToSize(text(`Instructions : ${order.customer.notes}`), rightColumnWidth)
    : [];
  const addressY = 81;
  const paymentY = addressY + addressLines.length * 4 + 1;
  const notesY = paymentY + 5;
  const clientBoxBottom = Math.max(order.customer.secondaryPhone ? 96 : 91, notesLines.length ? notesY + notesLines.length * 4 : paymentY + 5) + 4;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, clientBoxTop, contentWidth, clientBoxBottom - clientBoxTop, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text('CLIENT / DESTINATAIRE', leftColumnX, 68);
  doc.setFontSize(9);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(text(order.customer.facilityName || 'Établissement'), leftColumnX, 75);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(text(`Contact : ${order.customer.contactName || order.customer.facilityName}`), leftColumnX, 81);
  doc.text(text(`Téléphone : ${order.customer.phone}`), leftColumnX, 86);
  if (order.customer.secondaryPhone) doc.text(text(`2e téléphone : ${order.customer.secondaryPhone}`), leftColumnX, 91);
  doc.setFont('helvetica', 'bold');
  doc.text(text(`Réception : ${deliveryMode}`), rightColumnX, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(addressLines, rightColumnX, addressY);
  doc.text(text(paymentText), rightColumnX, paymentY);
  if (notesLines.length) doc.text(notesLines, rightColumnX, notesY);

  const drawTableHeader = (top: number) => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin, top, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Article et variante', margin + 4, top + 5.5);
    doc.text(text('Qté'), 126, top + 5.5, { align: 'center' });
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
      const lineTotal = Number(item.total) || unitPrice * (Number(item.quantity) || 1);
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
    doc.text(text(`Remise volume incluse : -${formatPdfAmount(totalSavings)} FCFA`), totalsBoxX + 4, totalY);
  }
  totalY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text(text('TOTAL ESTIMÉ'), totalsBoxX + 4, totalY);
  doc.text(`${formatPdfAmount(orderTotal)} FCFA`, pageWidth - margin - 4, totalY, { align: 'right' });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(text('Prix en FCFA hors taxes. Commande à confirmer par Gloryday Pharma.'), margin, pageHeight - 9);
    doc.text(text(`${order.reference} | Page ${page}/${pageCount}`), pageWidth - margin, pageHeight - 9, { align: 'right' });
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
  const doc = await createJsPdfInstance();
  const logoDataUrl = await loadBrandLogoDataUrl();
  const text = (value: unknown) => normalizePdfText(value);

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
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 2, 26, 24, 1.5, 1.5, 'F');
    doc.addImage(logoDataUrl, 'PNG', 15, 3, 24, 22, 'GLORYDAY_LOGO', 'FAST');
  }
  doc.text(text("FICHE DE DEMANDE D'ENGAGEMENT & VISA INTERNE"), logoDataUrl ? 44 : 14, 14, {
    maxWidth: pageWidth - (logoDataUrl ? 58 : 28),
  });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(text('Gloryday Pharma Gabon - Circuit de Validation Hiérarchique Clinique & Hôpital'), logoDataUrl ? 44 : 14, 21, {
    maxWidth: pageWidth - (logoDataUrl ? 58 : 28),
  });
  doc.text(text(`Réf : ${order.reference}`), pageWidth - 14, 21, { align: 'right' });

  // Établissement & Service Demandeur Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 34, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text(text('ÉTABLISSEMENT DEMANDEUR :'), 18, 41);
  doc.setFont('helvetica', 'normal');
  doc.text(text(`${order.customer.facilityName || 'Établissement'} (${order.customer.facilityType || 'Clinique'})`), 85, 41);

  doc.setFont('helvetica', 'bold');
  doc.text(text('SERVICE / BLOC OPÉRATOIRE :'), 18, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(text(options?.department || 'Bloc Chirurgical / Pharmacie Centrale'), 85, 48);

  doc.setFont('helvetica', 'bold');
  doc.text(text('RESPONSABLE DEMANDEUR :'), 18, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(text(`${order.customer.contactName || 'Major de Bloc'} (${order.customer.phone})`), 85, 55);

  // Table of Items
  let y = 66;
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(text('Désignation & Spécification Médicale'), 18, y + 5.5);
  doc.text(text('Qté'), 125, y + 5.5, { align: 'center' });
  doc.text('Prix Unit. (FCFA)', 155, y + 5.5, { align: 'right' });
  doc.text('Total (FCFA)', pageWidth - 18, y + 5.5, { align: 'right' });

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);

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
      ? `${text(item.productName)} (${text(item.variant)})`
      : text(item.productName);
    const truncatedLabel = doc.splitTextToSize(itemLabel || 'Article', 100);
    doc.text(truncatedLabel[0], 18, y + 5);
    doc.text(String(item.quantity), 125, y + 5, { align: 'center' });
    if (item.isQuote) {
      doc.text('Sur devis', 155, y + 5, { align: 'right' });
      doc.text('Sur devis', pageWidth - 18, y + 5, { align: 'right' });
    } else {
      const unitPrice = Number(item.price) || 0;
      const lineTotal = Number(item.total) || unitPrice * (Number(item.quantity) || 1);
      doc.text(formatPdfAmount(unitPrice), 155, y + 5, { align: 'right' });
      doc.text(formatPdfAmount(lineTotal), pageWidth - 18, y + 5, { align: 'right' });
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
  doc.text(text('MONTANT TOTAL ESTIMÉ À ENGAGER :'), 18, y + 6.5);
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.text(`${formatPdfAmount(order.estimatedTotal)} FCFA`, pageWidth - 18, y + 6.5, { align: 'right' });

  // 3-Signature Approval Block (The core of Internal Validation)
  y += 16;
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 25;
  }

  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text('CIRCUIT DES VISAS & BON POUR COMMANDE'), 14, y);

  y += 5;
  const colWidth = (pageWidth - 28 - 8) / 3;
  const boxHeight = 36;

  // Box 1: Visa Demandeur
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text('1. VISA DEMANDEUR'), 18, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(text('Major de Bloc / Surveillant(e)'), 18, y + 10);
  doc.text(text('Date : ____ / ____ / 2026'), 18, y + 26);
  doc.text(text('Signature & Cachet :'), 18, y + 31);

  // Box 2: Visa Direction Médicale
  const box2X = 14 + colWidth + 4;
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.roundedRect(box2X, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text('2. DIRECTION MÉDICALE'), box2X + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(text('Médecin Chef / Pharmacien Gérant'), box2X + 4, y + 10);
  doc.text(text('Date : ____ / ____ / 2026'), box2X + 4, y + 26);
  doc.text(text('Mention "Bon pour accord" :'), box2X + 4, y + 31);

  // Box 3: Visa Direction Financière
  const box3X = box2X + colWidth + 4;
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.roundedRect(box3X, y, colWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text('3. COMPTABILITÉ / DAF'), box3X + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(text('Contrôle Budgétaire & Engagement'), box3X + 4, y + 10);
  doc.text(text('Date : ____ / ____ / 2026'), box3X + 4, y + 26);
  doc.text(text('Visa de Paiement Prévu :'), box3X + 4, y + 31);

  const blob = doc.output('blob');
  const dataUrl = await readBlobAsDataUrl(blob);
  return { blob, dataUrl };
}

export async function generateInvoiceProjectPdf(
  order: Order,
  invoice: InvoiceRecord
): Promise<{ blob: Blob; dataUrl: string }> {
  const doc = await createJsPdfInstance();
  const logoDataUrl = await loadBrandLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const stampBlue = [48, 58, 154];
  const ink = [35, 38, 45];
  const muted = [105, 108, 116];
  const rule = [196, 199, 207];
  const pale = [248, 248, 251];
  const text = (value: unknown) => normalizePdfText(value);
  const title = invoice.type === 'facture' ? 'FACTURE' : 'AVOIR';
  const paymentLabels: Record<string, string> = {
    especes: 'Espèces', airtel_money: 'Airtel Money', moov_money: 'Moov Money',
    virement: 'Virement bancaire', cheque: 'Chèque', en_compte: 'Paiement en compte',
  };

  // En-tête sobre, inspiré de la facture papier Gloryday.
  doc.setDrawColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.setLineWidth(0.8);
  doc.line(margin, 9, pageWidth - margin, 9);
  doc.setLineWidth(0.25);
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, 13, 25, 22, 'GLORYDAY_LOGO', 'FAST');
  }
  doc.setTextColor(40, 102, 67);
  doc.setFont('times', 'bold');
  doc.setFontSize(17);
  doc.text('Gloryday Pharma', margin + 29, 21);
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Équipements et consommables hospitaliers · Libreville, Gabon', margin + 29, 27);

  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.7);
  doc.text('NIF : 250301 T', margin, 42);
  doc.text('RCCM : GA.LBV-01 2021-A10-00629', margin, 48);
  doc.text('BP 20350 · Libreville, Gabon', margin, 54);
  doc.text('+241 66 24 03 99 · +241 77 00 30 04', margin, 60);
  doc.setFontSize(6.9);
  doc.text('Ecobank : 40024 000020 36188011806 64', margin, 66);
  doc.text('Bamboo : 40021 01000 23055700201 24', margin, 72);

  const metaX = pageWidth - margin;
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  doc.text(text(title), metaX, 21, { align: 'right' });
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFontSize(9);
  doc.text(text(`N° ${invoice.number}`), metaX, 31, { align: 'right' });
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);
  doc.text(text(`Date : ${invoice.issueDate}`), metaX, 38, { align: 'right' });
  doc.text(text(`Commande : ${invoice.orderReference}`), metaX, 45, { align: 'right' });
  if (invoice.reason) {
    doc.setFont('times', 'italic');
    doc.setFontSize(7.6);
    doc.text(text(`Motif : ${invoice.reason}`), metaX, 53, { align: 'right', maxWidth: 82 });
  }

  const clientTop = 79;
  const clientHeight = 28;
  doc.setFillColor(pale[0], pale[1], pale[2]);
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.setLineWidth(0.25);
  doc.rect(margin, clientTop, contentWidth, clientHeight, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.text('CLIENT / DESTINATAIRE', margin + 4, clientTop + 6);
  doc.text('CONTACT ET LIVRAISON', margin + 105, clientTop + 6);
  const facilityType = order.customer.facilityType === 'Autre'
    ? (order.customer.facilityTypeOther || 'Autre établissement')
    : (order.customer.facilityType || 'Établissement');
  const facilityName = text(invoice.clientFacilityName || order.customer.facilityName || 'Établissement');
  const facilityNameWithoutType = facilityName.toLocaleLowerCase().startsWith(text(facilityType).toLocaleLowerCase())
    ? facilityName.slice(text(facilityType).length).trim()
    : facilityName;
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.text(text(facilityType).toUpperCase(), margin + 4, clientTop + 13);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(facilityNameWithoutType || facilityName, margin + 34, clientTop + 13, { maxWidth: 64 });
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(text(`Responsable : ${order.customer.contactName || 'Non renseigné'}`), margin + 4, clientTop + 20);
  const phones = [order.customer.phone, order.customer.secondaryPhone].filter(Boolean).join(' · ');
  doc.text(text(`Tél. : ${phones || 'Non renseigné'}`), margin + 105, clientTop + 13, { maxWidth: contentWidth - 109 });
  doc.text(text(`Adresse : ${order.customer.deliveryAddress || 'Non renseignée'}`), margin + 105, clientTop + 20, { maxWidth: contentWidth - 109 });

  const columns = [23, 70, 13, 26, 20, 30];
  const x = [margin];
  columns.forEach((width) => x.push(x[x.length - 1] + width));
  const referenceX = x[0] + 3;
  const designationX = x[1] + 3;
  const quantityX = x[2] + columns[2] / 2;
  const unitPriceX = x[4] - 3;
  const discountX = x[5] - 3;
  const totalX = x[6] - 3;
  const drawTableHeader = (top: number) => {
    doc.setFillColor(stampBlue[0], stampBlue[1], stampBlue[2]);
    doc.rect(margin, top, contentWidth, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    doc.text('Référence', referenceX, top + 6);
    doc.text('Désignation', designationX, top + 6);
    doc.text('Qté', quantityX, top + 6, { align: 'center' });
    doc.text('P.U. TTC', unitPriceX, top + 6, { align: 'right' });
    doc.text('Remise', discountX, top + 6, { align: 'right' });
    doc.text('Montant TTC', totalX, top + 6, { align: 'right' });
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.2);
    x.forEach((edge) => doc.line(edge, top, edge, top + 9));
  };

  let y = 112;
  drawTableHeader(y);
  y += 9;
  (order.items || []).forEach((item, index) => {
    const label = item.variant && item.variant !== 'Standard'
      ? `${text(item.productName)} (${text(item.variant)})`
      : text(item.productName || 'Article');
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    const labelLines = doc.splitTextToSize(label, columns[1] - 7);
    const rowHeight = Math.max(10, labelLines.length * 4.5 + 4);
    if (y + rowHeight > pageHeight - 110) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += 9;
    }
    if (index % 2 === 1) {
      doc.setFillColor(pale[0], pale[1], pale[2]);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    x.forEach((edge) => doc.line(edge, y, edge, y + rowHeight));
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('times', 'normal');
    doc.setFontSize(8.3);
    doc.text(text(item.productId ? item.productId.slice(-8).toUpperCase() : `L${index + 1}`), referenceX, y + 6.2);
    doc.setFontSize(9);
    doc.text(labelLines, designationX, y + 6.2, { lineHeightFactor: 1.1 });
    const valueY = y + Math.min(rowHeight - 2, Math.max(6.2, rowHeight / 2 + 1.2));
    doc.setFontSize(8.8);
    doc.text(String(item.quantity), quantityX, valueY, { align: 'center' });
    if (item.isQuote) {
      doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
      doc.text('Sur devis', unitPriceX, valueY, { align: 'right' });
      doc.text('—', discountX, valueY, { align: 'right' });
      doc.text('Sur devis', totalX, valueY, { align: 'right' });
    } else {
      const unitPrice = Number(item.price) || 0;
      const lineTotal = Number(item.total) || unitPrice * (Number(item.quantity) || 1);
      doc.text(formatPdfAmount(unitPrice), unitPriceX, valueY, { align: 'right' });
      doc.text(formatPdfAmount(Number(item.savings) || 0), discountX, valueY, { align: 'right' });
      doc.text(formatPdfAmount(lineTotal), totalX, valueY, { align: 'right' });
    }
    y += rowHeight;
  });

  const deliveryFee = Math.max(0, Math.trunc(Number(order.deliveryFee ?? order.customer.deliveryFee) || 0));
  if (deliveryFee > 0) {
    const rowHeight = 10;
    if (y + rowHeight > pageHeight - 110) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += 9;
    }
    doc.setFillColor(pale[0], pale[1], pale[2]);
    doc.rect(margin, y, contentWidth, rowHeight, 'F');
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    x.forEach((edge) => doc.line(edge, y, edge, y + rowHeight));
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('LIVRAISON', referenceX, y + 6.4);
    doc.text('Frais de livraison', designationX, y + 6.4);
    doc.text('1', quantityX, y + 6.4, { align: 'center' });
    doc.text(formatPdfAmount(deliveryFee), unitPriceX, y + 6.4, { align: 'right' });
    doc.text('0', discountX, y + 6.4, { align: 'right' });
    doc.text(formatPdfAmount(deliveryFee), totalX, y + 6.4, { align: 'right' });
    y += rowHeight;
  }

  const itemRowsEnd = y;
  const tableBottom = itemRowsEnd;
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  x.forEach((edge) => doc.line(edge, itemRowsEnd, edge, tableBottom));
  doc.line(margin, tableBottom, pageWidth - margin, tableBottom);

  const paidAmount = Math.min(invoice.totalTTC, getOrderPaidAmount(order));
  const remainingAmount = Math.min(invoice.totalTTC, getOrderRemainingBalance(order));
  const paymentMethod = order.customer.paymentMethod || '';
  const paymentStatus = remainingAmount <= 0
    ? 'Soldé'
    : paymentMethod === 'en_compte'
      ? (paidAmount > 0 ? 'En compte · acompte reçu' : 'En compte')
      : paidAmount > 0
        ? 'Avance reçue · solde dû'
        : 'À régler';
  const dueDate = order.collectionDueDate
    ? order.collectionDueDate.split('-').reverse().join('/')
    : paymentMethod === 'en_compte' ? 'À fixer' : 'Immédiate';
  const paidLabel = remainingAmount <= 0 ? 'Montant réglé' : 'Avance reçue';

  const paymentX = margin;
  const summaryY = tableBottom + 7;
  const panelGap = 8;
  const panelWidth = (contentWidth - panelGap) / 2;
  const paymentHeight = 43;
  doc.setFillColor(pale[0], pale[1], pale[2]);
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.rect(paymentX, summaryY, panelWidth, paymentHeight, 'FD');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.text('PAIEMENT', paymentX + 4, summaryY + 6);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(text(`Mode : ${paymentLabels[paymentMethod] || 'À convenir'}`), paymentX + 4, summaryY + 13, { maxWidth: panelWidth - 8 });
  doc.text(text(`Situation : ${paymentStatus}`), paymentX + 4, summaryY + 20, { maxWidth: panelWidth - 8 });
  doc.text(text(`${paidLabel} : ${formatPdfAmount(paidAmount)} F CFA`), paymentX + 4, summaryY + 27);
  doc.setFont('times', 'bold');
  doc.text(text(`Solde à régler : ${formatPdfAmount(remainingAmount)} F CFA`), paymentX + 4, summaryY + 34);
  doc.setFont('times', 'normal');
  doc.text(text(`Échéance : ${dueDate}`), paymentX + 4, summaryY + 40);

  const totalsX = paymentX + panelWidth + panelGap;
  const totalsWidth = panelWidth;
  const totalsHeight = paymentHeight;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.rect(totalsX, summaryY, totalsWidth, totalsHeight, 'FD');
  doc.setFillColor(pale[0], pale[1], pale[2]);
  doc.rect(totalsX, summaryY, totalsWidth, 8, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.text('RÉCAPITULATIF', totalsX + 4, summaryY + 5.6);
  const totalRow = (label: string, amount: number, top: number, bold = false) => {
    doc.setFont('times', bold ? 'bold' : 'normal');
    doc.text(text(label), totalsX + 4, top);
    doc.text(`${formatPdfAmount(amount)} F CFA`, totalsX + totalsWidth - 4, top, { align: 'right' });
  };
  doc.setFontSize(7.7);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  totalRow('Total HT', invoice.totalHT, summaryY + 15);
  totalRow(`TVA / CSS (${Math.round(invoice.tvaRate * 100)}%)`, invoice.tvaAmount, summaryY + 22);
  doc.setDrawColor(rule[0], rule[1], rule[2]);
  doc.line(totalsX + 4, summaryY + 26, totalsX + totalsWidth - 4, summaryY + 26);
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.setFontSize(9.5);
  totalRow('Total TTC', invoice.totalTTC, summaryY + 35, true);

  // Keep the stamp in its own lower-left area, without an extra container around it.
  const stampWidth = 78;
  const stampHeight = 24;
  const stampX = margin;
  const stampY = Math.min(summaryY + paymentHeight + 10, pageHeight - stampHeight - 19);
  doc.setDrawColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.setLineWidth(0.75);
  doc.rect(stampX, stampY, stampWidth, stampHeight, 'S');
  doc.setLineWidth(0.35);
  doc.rect(stampX + 1.2, stampY + 1.2, stampWidth - 2.4, stampHeight - 2.4, 'S');
  doc.setTextColor(stampBlue[0], stampBlue[1], stampBlue[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.2);
  doc.text('GLORYDAY PHARMA', stampX + stampWidth / 2, stampY + 8, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(6.1);
  doc.text(text('Consommables, r\u00e9actifs, \u00e9quipements m\u00e9dicaux'), stampX + stampWidth / 2, stampY + 14.5, { align: 'center' });
  doc.setFontSize(6.4);
  doc.text('+241 77 00 30 04 / +241 66 24 03 99', stampX + stampWidth / 2, stampY + 20, { align: 'center' });
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Gloryday Pharma · Libreville, Gabon', margin, pageHeight - 8);
    doc.text(text(`${invoice.number} · Page ${page}/${pageCount}`), pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const blob = doc.output('blob');
  const dataUrl = await readBlobAsDataUrl(blob);
  return { blob, dataUrl };
}

export async function downloadInvoiceProjectPdf(order: Order, invoice: InvoiceRecord): Promise<void> {
  const { blob } = await generateInvoiceProjectPdf(order, invoice);
  const prefix = invoice.type === 'facture' ? 'Facture' : 'Avoir';
  triggerPdfBlobDownload(blob, `${prefix}_${invoice.number}.pdf`);
}

export async function downloadDeliveryNotePdf(order: Order): Promise<void> {
  const doc = await createJsPdfInstance();
  const logoDataUrl = await loadBrandLogoDataUrl();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const blue = [13, 68, 232];
  const ink = [22, 22, 24];
  const muted = [100, 116, 139];
  const text = (value: unknown) => normalizePdfText(value);
  const orderDate = new Date(order.createdAt);
  const dateLabel = Number.isNaN(orderDate.getTime())
    ? new Date().toLocaleDateString('fr-FR')
    : orderDate.toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' });

  const drawHeader = (newPage = false) => {
    if (newPage) doc.addPage();
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(0, 0, pageWidth, 29, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    if (logoDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 2.5, 26, 24, 1.5, 1.5, 'F');
      doc.addImage(logoDataUrl, 'PNG', margin + 1, 3, 24, 23, 'GLORYDAY_DELIVERY_LOGO', 'FAST');
      doc.text('GLORYDAY PHARMA', margin + 31, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Distribution médicale · Libreville, Gabon', margin + 31, 20);
    } else {
      doc.text('GLORYDAY PHARMA', margin, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Distribution médicale · Libreville, Gabon', margin, 20);
    }
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BON DE LIVRAISON', margin, 39);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(text(`Commande : ${order.reference}`), pageWidth - margin, 37, { align: 'right' });
    doc.text(text(`Date : ${dateLabel}`), pageWidth - margin, 43, { align: 'right' });
  };

  drawHeader();
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, 50, contentWidth, 29, 2, 2, 'F');
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DESTINATAIRE', margin + 4, 57);
  doc.text('LIVRAISON', pageWidth / 2 + 4, 57);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFontSize(9);
  doc.text(text(order.customer.facilityName || 'Établissement'), margin + 4, 64);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(text(`${order.customer.contactName || 'Contact'} · ${order.customer.phone}`), margin + 4, 70);
  doc.text(text(order.customer.deliveryAddress || 'Adresse à confirmer'), pageWidth / 2 + 4, 64, { maxWidth: pageWidth / 2 - margin - 8 });
  doc.text(text(order.customer.deliveryMode === 'retrait' ? 'Retrait au dépôt' : `Livraison · ${order.courier?.name || 'Coursier à affecter'}`), pageWidth / 2 + 4, 70);

  const drawTableHeader = (top: number) => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin, top, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Article / conditionnement', margin + 3, top + 5.5);
    doc.text('Qté commandée', 124, top + 5.5, { align: 'center' });
    doc.text('Qté remise', 157, top + 5.5, { align: 'center' });
    doc.text('Lot / remarque', pageWidth - margin - 3, top + 5.5, { align: 'right' });
  };

  let y = 87;
  drawTableHeader(y);
  y += 8;
  (order.items || []).forEach((item, index) => {
    const label = item.variant && item.variant !== 'Standard'
      ? `${text(item.productName)} (${text(item.variant)})`
      : text(item.productName);
    const lines = doc.splitTextToSize(label || 'Article', 91);
    const rowHeight = Math.max(9, lines.length * 4.2 + 3);
    if (y + rowHeight > pageHeight - 47) {
      drawHeader(true);
      y = 49;
      drawTableHeader(y);
      y += 8;
    }
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(lines, margin + 3, y + 4.5);
    doc.text(String(Math.max(0, Number(item.quantity) || 0)), 124, y + 5, { align: 'center' });
    doc.setDrawColor(148, 163, 184);
    doc.line(147, y + rowHeight - 2, 167, y + rowHeight - 2);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    y += rowHeight;
  });

  if (y > pageHeight - 57) {
    drawHeader(true);
    y = 53;
  } else {
    y += 5;
  }
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  const instructions = order.isPartialDelivery
    ? 'Livraison partielle : renseignez la quantité remise pour chaque ligne et indiquez les reliquats dans les observations.'
    : 'À la réception, renseignez la quantité remise et signalez tout écart ou colis endommagé.';
  const instructionLines = doc.splitTextToSize(text(instructions), contentWidth);
  doc.text(instructionLines, margin, y + 3);
  y += instructionLines.length * 4 + 10;
  if (order.partialDeliveryNotes) {
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const notes = doc.splitTextToSize(text(`Reliquat / observations : ${order.partialDeliveryNotes}`), contentWidth);
    doc.text(notes, margin, y);
    y += notes.length * 4 + 6;
  }

  const signatureTop = Math.min(y, pageHeight - 45);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, signatureTop, contentWidth / 2 - 3, 28, 2, 2, 'S');
  doc.roundedRect(pageWidth / 2 + 3, signatureTop, contentWidth / 2 - 3, 28, 2, 2, 'S');
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Remis par', margin + 4, signatureTop + 6);
  doc.text('Reçu par', pageWidth / 2 + 7, signatureTop + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(text(order.courier?.name || 'Nom et signature'), margin + 4, signatureTop + 12);
  doc.text(text(order.deliveryProof?.receivedBy || 'Nom et signature du réceptionnaire'), pageWidth / 2 + 7, signatureTop + 12);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.setFontSize(7.5);
  doc.text('Date / signature', margin + 4, signatureTop + 23);
  doc.text('Date / signature / cachet', pageWidth / 2 + 7, signatureTop + 23);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('Bon de livraison · Les quantités remises doivent être vérifiées à la réception.', margin, pageHeight - 7);
    doc.text(text(`${order.reference} · Page ${page}/${pageCount}`), pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const safeReference = order.reference.replace(/[^A-Za-z0-9_-]/g, '_');
  triggerPdfBlobDownload(doc.output('blob'), `Bon_de_livraison_${safeReference}.pdf`);
}

export async function downloadOrderPdf(order: Order, existingDataUrl?: string): Promise<void> {
  const filename = `Bon_de_Commande_${order.reference}.pdf`;
  if (existingDataUrl) {
    try {
      triggerPdfBlobDownload(existingDataUrl, filename);
      return;
    } catch {
      // Fallback to fresh generation if stored dataUrl is malformed
    }
  }
  const { blob } = await generateOrderPdf(order);
  triggerPdfBlobDownload(blob, filename);
}
