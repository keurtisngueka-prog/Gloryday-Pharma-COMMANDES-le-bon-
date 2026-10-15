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
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GLORYDAY PHARMA', 14, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Distribution Médicale, Consommables & Équipements Hospitaliers', 14, 21);
  doc.setFontSize(8);
  doc.text('Libreville - GABON | Tél: +241 77 003 004 / +241 66 240 399', pageWidth - 14, 21, { align: 'right' });

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
  doc.text(`Mode de réception : ${order.customer.deliveryMode === 'livraison' ? 'Livraison sur site' : 'Retrait en agence'}`, pageWidth / 2 + 5, 62);
  doc.text(`Adresse : ${order.customer.deliveryAddress}`, pageWidth / 2 + 5, 67);
  doc.text(`Paiement prévu : ${order.customer.paymentMethod.replace('_', ' ').toUpperCase()}`, pageWidth / 2 + 5, 72);

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
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(totalsBoxX, y, 76, 26, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Sous-total articles fermes :', totalsBoxX + 4, y + 7);
  doc.text(`${order.estimatedTotal.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.setFontSize(10.5);
  doc.text('TOTAL ESTIMÉ :', totalsBoxX + 4, y + 15);
  doc.text(`${order.estimatedTotal.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, y + 15, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('Prix en FCFA hors taxes - Non soumis à la TVA (Sans TVA)', totalsBoxX + 4, y + 21);

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');
  return { blob, dataUrl };
}
