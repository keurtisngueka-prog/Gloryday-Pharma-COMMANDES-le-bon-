import { SystemSettings, User } from '../types';
import { logAuditEvent } from './auditLogger';

const SETTINGS_STORAGE_KEY = 'gloryday_system_settings_v1';

export const DEFAULT_SETTINGS: SystemSettings = {
  minOrderAmount: 25000,
  openingHours: 'Lun - Ven : 07h30 - 18h30 | Sam : 08h00 - 14h00 (Urgences 24/7)',
  whatsappPrimaryPhone: '+24177439379',
  whatsappSecondaryPhone: '+24166203040',
  airtelMerchantPhone: '+24177439379',
  moovMerchantPhone: '+24166203040',
  deliveryZones: [
    { id: 'zone-1', name: 'Zone 1 · Centre & Cœur Urbain (Centre-Ville, Batterie IV, Glass)', fee: 0, delayHours: 1, active: true },
    { id: 'zone-2', name: 'Zone 2 · Nord Résidentiel & Aéronautique (Sablière, Angondjé, Avorbam)', fee: 2500, delayHours: 2, active: true },
    { id: 'zone-3', name: 'Zone 3 · Est & Périphérie Universitaire (PK5 - PK12, Nzeng-Ayong, Mindoubé)', fee: 3000, delayHours: 3, active: true },
    { id: 'zone-4', name: 'Zone 4 · Sud & Nkok ZES (Owendo Port, Alénakiri, Nkok)', fee: 5000, delayHours: 4, active: true },
    { id: 'zone-interurbain', name: 'Zone 5 · Interurbain Gabon (Port-Gentil, Franceville, Oyem par fret)', fee: 15000, delayHours: 24, active: true }
  ],
  volumeDiscounts: [
    { minQuantity: 20, discountPercentage: 15 },
    { minQuantity: 10, discountPercentage: 10 },
    { minQuantity: 5, discountPercentage: 5 }
  ],
  promoCodes: [
    { code: 'PHARMA2026', discountPercentage: 10, validUntil: '2026-12-31', minOrderAmount: 50000, active: true },
    { code: 'URGENCE5', discountPercentage: 5, validUntil: '2026-12-31', minOrderAmount: 25000, active: true },
    { code: 'BIENVENUE', discountPercentage: 8, validUntil: '2026-12-31', minOrderAmount: 30000, active: true }
  ],
  customPrices: [],
  whatsappTemplates: {
    orderConfirmation: 'Bonjour {facilityName}, nous confirmons la réception de votre commande {reference} pour un montant estimé de {total} FCFA. Préparation en cours chez Gloryday Pharma.',
    inTransit: 'Votre commande {reference} est en cours de livraison avec notre coursier {courierName} ({courierPhone}). Délai estimé : {eta}.',
    delivered: 'Votre commande {reference} a bien été réceptionnée à {facilityName}. Merci pour votre confiance envers Gloryday Pharma Gabon.',
    reminderInactive: 'Bonjour {facilityName}, Gloryday Pharma reste à votre disposition pour le réassort de vos dispositifs médicaux. Consultez notre catalogue à jour.'
  },
  pdfHeaderInfo: {
    companyName: 'GLORYDAY PHARMA GABON SARL',
    legalNotice: 'Distributeur Agréé de Dispositifs Médicaux & Équipements de Santé',
    rccm: 'RG/LBV2024B12984',
    nif: '098452179830001',
    address: 'Montée de Louis, B.P. 4088 Libreville, Gabon',
    phone: '+241 77 43 93 79 / +241 66 20 30 40'
  }
};

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      deliveryZones: parsed.deliveryZones || DEFAULT_SETTINGS.deliveryZones,
      volumeDiscounts: parsed.volumeDiscounts || DEFAULT_SETTINGS.volumeDiscounts,
      promoCodes: parsed.promoCodes || DEFAULT_SETTINGS.promoCodes,
      whatsappTemplates: { ...DEFAULT_SETTINGS.whatsappTemplates, ...(parsed.whatsappTemplates || {}) },
      pdfHeaderInfo: { ...DEFAULT_SETTINGS.pdfHeaderInfo, ...(parsed.pdfHeaderInfo || {}) }
    };
  } catch (err) {
    console.error('Erreur lecture system settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings, updatedBy?: User): void {
  try {
    const oldSettings = getSystemSettings();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    if (updatedBy) {
      logAuditEvent(
        updatedBy,
        'modification_parametres',
        'Paramètres Système',
        'GLOBAL_SETTINGS',
        'Mise à jour des paramètres opérationnels (tarifs, zones, marchands ou modèles)',
        JSON.stringify(oldSettings).substring(0, 100),
        JSON.stringify(settings).substring(0, 100)
      );
    }
  } catch (e) {
    console.error('Erreur sauvegarde system settings:', e);
  }
}

export function getCustomClientProductPrice(clientId: string, productId: string): number | null {
  const settings = getSystemSettings();
  const found = settings.customPrices.find(cp => cp.clientId === clientId && cp.productId === productId);
  return found ? found.customPrice : null;
}
