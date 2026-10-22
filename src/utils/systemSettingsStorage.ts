export interface SystemSettings {
  companyName: string;
  headquartersAddress: string;
  whatsappOfficialPhone: string;
  supportEmail: string;
  airtelMoneyPhone: string;
  airtelMoneyMerchantName: string;
  airtelUssdPrefix: string;
  moovMoneyPhone: string;
  moovMoneyMerchantName: string;
  moovUssdPrefix: string;
  freeDeliveryThreshold: number;
  standardDeliveryFeeLibreville: number;
  enableAutoWhatsAppOnStageChange: boolean;
  customPreparationTemplate: string;
  customPickedUpTemplate: string;
  customInTransitTemplate: string;
  customDeliveredTemplate: string;
  updatedAt: string;
}

const SETTINGS_STORAGE_KEY = 'gloryday_system_settings';

if (typeof window !== 'undefined') {
  try {
    const legacySettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (legacySettings) {
      const parsed = JSON.parse(legacySettings);
      if (parsed && typeof parsed === 'object' && 'adminPassword' in parsed) {
        delete parsed.adminPassword;
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  companyName: 'Gloryday Pharma Gabon',
  headquartersAddress: 'Centre-Ville / Boulevard Triomphal, Libreville, Gabon',
  whatsappOfficialPhone: '+241 77 003 004',
  supportEmail: 'direction@glorydaypharma.ga',
  airtelMoneyPhone: '077 00 30 04',
  airtelMoneyMerchantName: 'GLORYDAY PHARMA GABON',
  airtelUssdPrefix: '*150*1*1*',
  moovMoneyPhone: '066 24 03 99',
  moovMoneyMerchantName: 'GLORYDAY PHARMA',
  moovUssdPrefix: '*555*2*1*',
  freeDeliveryThreshold: 150000,
  standardDeliveryFeeLibreville: 3000,
  enableAutoWhatsAppOnStageChange: false,
  customPreparationTemplate: 'Votre commande {REF} pour {ETABLISSEMENT} est en cours de préparation par notre équipe.',
  customPickedUpTemplate: 'Votre colis {REF} a été pris en charge par le coursier {COURSIER} ({TELEPHONE_COURSIER}).',
  customInTransitTemplate: 'Votre commande {REF} est en cours d’acheminement vers {ETABLISSEMENT}. Arrivée estimée : {DELAI}.',
  customDeliveredTemplate: 'Votre commande {REF} a été livrée et réceptionnée avec succès à {ETABLISSEMENT}. Merci pour votre confiance.',
  updatedAt: new Date().toISOString()
};

export function getSystemSettings(): SystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      return DEFAULT_SYSTEM_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'adminPassword' in parsed) {
      delete parsed.adminPassword;
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(parsed));
    }
    return { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

export function saveSystemSettings(newSettings: Partial<SystemSettings>): SystemSettings {
  const current = getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...newSettings,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gloryday_settings_updated'));
    }
  } catch (e) {
    console.error('Failed to save system settings', e);
  }

  return updated;
}

export function resetSystemSettings(): SystemSettings {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gloryday_settings_updated'));
    }
  } catch (e) {
    console.error('Failed to reset system settings', e);
  }
  return DEFAULT_SYSTEM_SETTINGS;
}
