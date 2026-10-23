import { CartItem, CustomerInfo, OrderDraft } from '../types';
import { loadBrandLogoDataUrl } from './pdfGenerator';

/**
 * Storage key partitioning for draft orders (offline resilience)
 */
export const getDraftsStorageKey = (userPhone?: string): string => {
  if (userPhone && userPhone.trim()) {
    const sanitized = userPhone.replace(/[\s\-\.\(\)]/g, '');
    return `gloryday_drafts_user_${sanitized}`;
  }
  return 'gloryday_drafts_guest';
};

export const getAutoDraftStorageKey = (userPhone?: string): string => {
  if (userPhone && userPhone.trim()) {
    const sanitized = userPhone.replace(/[\s\-\.\(\)]/g, '');
    return `gloryday_autodraft_user_${sanitized}`;
  }
  return 'gloryday_autodraft_guest';
};

export const notifyDraftsChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gloryday_drafts_updated'));
  }
};

/**
 * Retrieve all saved drafts for the active session
 */
export const getStoredDrafts = (userPhone?: string): OrderDraft[] => {
  if (!userPhone?.trim()) return [];
  try {
    const key = getDraftsStorageKey(userPhone);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list: OrderDraft[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : [];
  } catch (err) {
    console.error('Error loading stored drafts', err);
    return [];
  }
};

/**
 * Calculate total items and amount for a list of cart items
 */
export const calculateDraftTotals = (items: CartItem[]): { totalAmount: number; itemsCount: number } => {
  const itemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const totalAmount = items.reduce((acc, it) => {
    if (it.isQuote || it.price === 0) return acc;
    return acc + (it.price * it.quantity);
  }, 0);
  return { totalAmount, itemsCount };
};

/**
 * Save or update a draft order
 */
export const saveDraft = (
  draftData: {
    id?: string;
    name?: string;
    items: CartItem[];
    customerInfo?: Partial<CustomerInfo>;
    notes?: string;
    status?: 'offline_saved' | 'ready_to_sync' | 'synced';
    autoSaved?: boolean;
  },
  userPhone?: string
): OrderDraft => {
  if (!userPhone?.trim()) {
    throw new Error('Connectez-vous à votre compte client pour enregistrer un brouillon privé.');
  }
  const existingDrafts = getStoredDrafts(userPhone);
  const now = new Date().toISOString();
  const { totalAmount, itemsCount } = calculateDraftTotals(draftData.items);

  const fallbackName = draftData.customerInfo?.facilityName?.trim()
    ? `Brouillon ${draftData.customerInfo.facilityName.trim()} (${itemsCount} art.)`
    : `Brouillon ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  if (draftData.id) {
    // Update existing draft
    const index = existingDrafts.findIndex(d => d.id === draftData.id);
    if (index > -1) {
      const updatedDraft: OrderDraft = {
        ...existingDrafts[index],
        name: draftData.name?.trim() || existingDrafts[index].name,
        items: draftData.items,
        customerInfo: draftData.customerInfo || existingDrafts[index].customerInfo,
        notes: draftData.notes !== undefined ? draftData.notes : existingDrafts[index].notes,
        status: draftData.status || existingDrafts[index].status || 'offline_saved',
        totalAmount,
        itemsCount,
        updatedAt: now,
        autoSaved: draftData.autoSaved ?? false
      };
      existingDrafts[index] = updatedDraft;
      localStorage.setItem(getDraftsStorageKey(userPhone), JSON.stringify(existingDrafts));
      notifyDraftsChange();
      return updatedDraft;
    }
  }

  // Create new draft
  const newDraftId = draftData.id || `BROUILLON-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const newDraft: OrderDraft = {
    id: newDraftId,
    name: draftData.name?.trim() || fallbackName,
    createdAt: now,
    updatedAt: now,
    items: draftData.items,
    customerInfo: draftData.customerInfo || {},
    notes: draftData.notes || '',
    status: draftData.status || 'offline_saved',
    totalAmount,
    itemsCount,
    autoSaved: draftData.autoSaved ?? false
  };

  const updatedList = [newDraft, ...existingDrafts.filter(d => d.id !== newDraft.id)];
  localStorage.setItem(getDraftsStorageKey(userPhone), JSON.stringify(updatedList));
  notifyDraftsChange();
  return newDraft;
};

/**
 * Delete a draft
 */
export const deleteDraft = (draftId: string, userPhone?: string): void => {
  if (!userPhone?.trim()) return;
  try {
    const list = getStoredDrafts(userPhone);
    const filtered = list.filter(d => d.id !== draftId);
    localStorage.setItem(getDraftsStorageKey(userPhone), JSON.stringify(filtered));
    notifyDraftsChange();
  } catch (err) {
    console.error('Error deleting draft', err);
  }
};

/**
 * Duplicate a draft
 */
export const duplicateDraft = (draftId: string, userPhone?: string): OrderDraft | null => {
  if (!userPhone?.trim()) return null;
  const list = getStoredDrafts(userPhone);
  const found = list.find(d => d.id === draftId);
  if (!found) return null;

  const now = new Date().toISOString();
  const duplicated: OrderDraft = {
    ...found,
    id: `BROUILLON-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    name: `Copie - ${found.name}`,
    createdAt: now,
    updatedAt: now,
    autoSaved: false
  };

  const updated = [duplicated, ...list];
  localStorage.setItem(getDraftsStorageKey(userPhone), JSON.stringify(updated));
  notifyDraftsChange();
  return duplicated;
};

/**
 * Rename a draft
 */
export const renameDraft = (draftId: string, newName: string, userPhone?: string): OrderDraft | null => {
  if (!userPhone?.trim()) return null;
  const list = getStoredDrafts(userPhone);
  const index = list.findIndex(d => d.id === draftId);
  if (index === -1) return null;

  list[index] = {
    ...list[index],
    name: newName.trim() || list[index].name,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(getDraftsStorageKey(userPhone), JSON.stringify(list));
  notifyDraftsChange();
  return list[index];
};

/**
 * Auto-draft saving for real-time recovery on crash or offline interruption
 */
export const saveAutoDraft = (
  items: CartItem[],
  customerInfo: Partial<CustomerInfo>,
  userPhone?: string
): OrderDraft | null => {
  if (!userPhone?.trim()) return null;
  if (!items || items.length === 0) {
    clearAutoDraft(userPhone);
    return null;
  }
  const key = getAutoDraftStorageKey(userPhone);
  const now = new Date().toISOString();
  const { totalAmount, itemsCount } = calculateDraftTotals(items);

  const autoDraft: OrderDraft = {
    id: 'autodraft-active',
    name: customerInfo?.facilityName?.trim()
      ? `Autosave : ${customerInfo.facilityName.trim()}`
      : 'Brouillon automatique en cours',
    createdAt: now,
    updatedAt: now,
    items,
    customerInfo,
    status: 'offline_saved',
    totalAmount,
    itemsCount,
    autoSaved: true
  };

  try {
    localStorage.setItem(key, JSON.stringify(autoDraft));
  } catch (err) {
    console.error('Error saving autodraft', err);
  }
  return autoDraft;
};

export const getAutoDraft = (userPhone?: string): OrderDraft | null => {
  if (!userPhone?.trim()) return null;
  try {
    const key = getAutoDraftStorageKey(userPhone);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearAutoDraft = (userPhone?: string): void => {
  if (!userPhone?.trim()) return;
  try {
    const key = getAutoDraftStorageKey(userPhone);
    localStorage.removeItem(key);
  } catch {}
};

/**
 * Generate a WhatsApp URL from an offline draft so the buyer can transmit
 * their order by phone/data even if our cloud API isn't accessible!
 */
export const generateDraftWhatsAppUrl = (
  draft: OrderDraft,
  commercialPhone: string = '+24177003004'
): string => {
  const lines: string[] = [];
  lines.push('🏥 *GLORYDAY PHARMA - TRANSMISSION BROUILLON HORS-LIGNE*');
  lines.push(`📑 Réf Brouillon : *${draft.id}*`);
  lines.push(`🕒 Date : ${new Date(draft.updatedAt).toLocaleDateString('fr-FR')} à ${new Date(draft.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push('');
  lines.push('🏢 *Établissement demandeur :*');
  lines.push(`• Structure : *${draft.customerInfo.facilityName || 'Non précisé'}*`);
  if (draft.customerInfo.contactName) lines.push(`• Contact : ${draft.customerInfo.contactName}`);
  if (draft.customerInfo.phone) lines.push(`• Téléphone : ${draft.customerInfo.phone}`);
  if (draft.customerInfo.deliveryAddress) lines.push(`• Adresse de livraison : ${draft.customerInfo.deliveryAddress}`);
  if (draft.customerInfo.deliveryMode) lines.push(`• Mode réception : ${draft.customerInfo.deliveryMode === 'retrait' ? 'Retrait au dépôt Oloumi' : 'Livraison sur site'}`);
  if (draft.customerInfo.paymentMethod) lines.push(`• Règlement prévu : ${draft.customerInfo.paymentMethod.replace('_', ' ').toUpperCase()}`);
  if (draft.customerInfo.mobilePayment?.transactionReference) {
    lines.push(`• Réf Paiement Mobile : *${draft.customerInfo.mobilePayment.transactionReference}*`);
  }
  lines.push('');
  lines.push(`📦 *Articles en commande (${draft.items.length}) :*`);

  draft.items.forEach((it, idx) => {
    const priceStr = it.isQuote || it.price === 0 ? 'Sur Devis' : `${(it.price * it.quantity).toLocaleString('fr-FR')} FCFA`;
    lines.push(`${idx + 1}. *${it.productName}* [${it.variant}] x${it.quantity} — ${priceStr}`);
  });

  lines.push('');
  lines.push(`💰 *Total estimé :* *${draft.totalAmount.toLocaleString('fr-FR')} FCFA*`);
  if (draft.notes) {
    lines.push(`📝 *Remarques urgentes :* ${draft.notes}`);
  }
  lines.push('');
  lines.push('_Brouillon généré en mode hors-ligne suite à instabilité réseau. Merci de confirmer la disponibilité et le délai de livraison._');

  const cleanPhone = commercialPhone.replace(/\D/g, '');
  const encoded = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
};

/**
 * Generate an offline draft PDF Bon de Commande directly in the browser
 */
export const generateDraftPdf = async (draft: OrderDraft): Promise<{ blob: Blob; dataUrl: string }> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const logoDataUrl = await loadBrandLogoDataUrl();

  const pageWidth = doc.internal.pageSize.getWidth();

  const blueDark = [13, 68, 232];
  const graphite = [22, 22, 24];
  const amberDark = [180, 83, 9];

  // Top header banner
  doc.setFillColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  if (logoDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 2, 28, 24, 1.5, 1.5, 'F');
    doc.addImage(logoDataUrl, 'PNG', 15, 2.5, 26, 23, 'GLORYDAY_LOGO', 'FAST');
    doc.text('GLORYDAY PHARMA', 47, 13.5);
  } else {
    doc.text('GLORYDAY PHARMA', 14, 15);
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(logoDataUrl ? 'Distribution médicale · Libreville, Gabon' : 'Distribution Médicale, Consommables & Équipements Hospitaliers - GABON', logoDataUrl ? 47 : 14, 21);
  doc.setFontSize(8);
  doc.text('Urgences Libreville: +241 77 003 004 / 66 240 399', pageWidth - 14, 21, { align: 'right' });

  // Badge Hors-Ligne
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(14, 32, pageWidth - 28, 10, 2, 2, 'FD');
  doc.setTextColor(amberDark[0], amberDark[1], amberDark[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT BROUILLON HORS-LIGNE — VALABLE POUR SAISIE OU DISPATCH D\'URGENCE', 18, 38.5);

  // Sub-header / Draft Details Box
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(draft.name || 'BROUILLON DE COMMANDE', 14, 50);

  // Draft info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - 85, 44, 71, 24, 2, 2, 'FD');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Identifiant : ${draft.id}`, pageWidth - 80, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mis à jour : ${new Date(draft.updatedAt).toLocaleDateString('fr-FR')} ${new Date(draft.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 80, 56);
  doc.text(`Total articles : ${draft.itemsCount}`, pageWidth - 80, 62);

  // Client Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 60, pageWidth - 28, 26, 2, 2, 'F');
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.text('ÉTABLISSEMENT / CLINIQUE DEMANDEUR', 18, 66);
  doc.setFontSize(9);
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text(`Structure : ${draft.customerInfo.facilityName || 'Non renseigné'}`, 18, 72);
  doc.text(`Contact : ${draft.customerInfo.contactName || 'Responsable Achat'} | Tél: ${draft.customerInfo.phone || 'Non renseigné'}`, 18, 77);
  doc.text(`Adresse : ${draft.customerInfo.deliveryAddress || 'Libreville'}`, 18, 82);

  // Table Header
  let startY = 92;
  doc.setFillColor(235, 238, 242);
  doc.rect(14, startY, pageWidth - 28, 8, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text('Désignation de l\'article médical', 18, startY + 5.5);
  doc.text('Variante / Spécification', 105, startY + 5.5);
  doc.text('Qté', 145, startY + 5.5, { align: 'right' });
  doc.text('Prix Unit.', 168, startY + 5.5, { align: 'right' });
  doc.text('Total FCFA', pageWidth - 18, startY + 5.5, { align: 'right' });

  // Rows
  let currentY = startY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  draft.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(14, currentY, pageWidth - 28, 7.5, 'F');
    }

    doc.setTextColor(graphite[0], graphite[1], graphite[2]);
    const cleanName = item.productName.length > 46 ? item.productName.substring(0, 43) + '...' : item.productName;
    doc.text(cleanName, 18, currentY + 5);

    const cleanVar = item.variant.length > 22 ? item.variant.substring(0, 20) + '...' : item.variant;
    doc.text(cleanVar, 105, currentY + 5);

    doc.text(item.quantity.toString(), 145, currentY + 5, { align: 'right' });

    const unitPrice = item.isQuote || item.price === 0 ? 'Devis' : item.price.toLocaleString('fr-FR');
    doc.text(unitPrice, 168, currentY + 5, { align: 'right' });

    const rowTotal = item.isQuote || item.price === 0 ? 'Sur Devis' : (item.price * item.quantity).toLocaleString('fr-FR');
    doc.setFont('helvetica', 'bold');
    doc.text(rowTotal, pageWidth - 18, currentY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    currentY += 7.5;
  });

  // Total summary box
  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - 90, currentY, 76, 16, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(blueDark[0], blueDark[1], blueDark[2]);
  doc.text('TOTAL ESTIMÉ :', pageWidth - 85, currentY + 7);
  doc.setTextColor(graphite[0], graphite[1], graphite[2]);
  doc.text(`${draft.totalAmount.toLocaleString('fr-FR')} FCFA`, pageWidth - 18, currentY + 7, { align: 'right' });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('* Hors frais de livraison éventuels selon zone', pageWidth - 18, currentY + 12, { align: 'right' });

  // Footer notes
  currentY += 24;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ce brouillon est conservé localement sur votre appareil. Dès rétablissement de la connexion, finalisez en 1 clic.', 14, currentY);
  doc.text('Pour urgence absolue : Présentez ce document au dépôt central Gloryday Oloumi ou transmettez par WhatsApp.', 14, currentY + 4.5);

  const blob = doc.output('blob');
  const dataUrl = doc.output('dataurlstring');
  return { blob, dataUrl };
};
