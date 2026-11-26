import type { ClientRecord, FacilityType } from '../types';

export type ClientDirectoryImportRecord = Pick<ClientRecord, 'facilityName' | 'contactName' | 'companyPhone'> &
  Partial<Pick<ClientRecord,
    'invoiceName' | 'facilityType' | 'facilityTypeOther' | 'directorName' | 'secondaryPhone' |
    'city' | 'deliveryAddress' | 'deliveryInstructions'
  >>;

export interface ClientDirectoryImportRow {
  rowNumber: number;
  facilityName: string;
  companyPhone: string;
  status: 'ready' | 'duplicate' | 'invalid';
  issues: string[];
}

export interface ClientDirectoryImportPreview {
  success: boolean;
  message: string;
  fileName: string;
  totalRowsRead: number;
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: ClientDirectoryImportRow[];
  records: ClientDirectoryImportRecord[];
}

const FACILITY_TYPES: FacilityType[] = [
  'Clinique', 'Polyclinique', 'Hôpital', 'Laboratoire', 'Pharmacie', 'Cabinet médical', 'Autre'
];

const FIELD_ALIASES: Record<keyof ClientDirectoryImportRecord, string[]> = {
  facilityName: ['Nom de l’entreprise ou structure', 'Nom de l’entreprise', 'Nom établissement', 'Nom établissement client', 'Nom Établissement', 'Établissement', 'Nom', 'facilityName'],
  invoiceName: ['Nom court pour facture', 'Nom facture', 'invoiceName'],
  facilityType: ['Type de structure', 'Type établissement', 'Type Établissement', 'facilityType'],
  facilityTypeOther: ['Précision si autre', 'Autre type', 'facilityTypeOther'],
  contactName: ['Contact principal', 'Contact opérationnel', 'Contact responsable', 'Contact', 'contactName'],
  directorName: ['Directeur général propriétaire', 'Directeur général', 'Propriétaire', 'directorName'],
  companyPhone: ['Téléphone de l’entreprise', 'Téléphone entreprise', 'Téléphone de l’établissement', 'Téléphone', 'companyPhone'],
  secondaryPhone: ['Téléphone secondaire', '2e téléphone', 'secondaryPhone'],
  city: ['Ville localité', 'Ville', 'Localité', 'city'],
  deliveryAddress: ['Adresse de livraison', 'Adresse', 'deliveryAddress'],
  deliveryInstructions: ['Précisions d’accès ou de livraison', 'Précision adresse', 'Repère livraison', 'deliveryInstructions'],
};

const EXPORT_COLUMNS: Array<{ key: keyof ClientDirectoryImportRecord; label: string }> = [
  { key: 'facilityName', label: 'Nom de l’entreprise ou structure *' },
  { key: 'invoiceName', label: 'Nom court pour facture' },
  { key: 'facilityType', label: 'Type de structure' },
  { key: 'facilityTypeOther', label: 'Précision si autre' },
  { key: 'contactName', label: 'Contact principal *' },
  { key: 'directorName', label: 'Directeur général / propriétaire' },
  { key: 'companyPhone', label: 'Téléphone de l’entreprise *' },
  { key: 'secondaryPhone', label: 'Téléphone secondaire' },
  { key: 'city', label: 'Ville / localité' },
  { key: 'deliveryAddress', label: 'Adresse de livraison' },
  { key: 'deliveryInstructions', label: 'Précisions d’accès ou de livraison' },
];

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\*/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
}

function makePreview(fileName: string, message: string): ClientDirectoryImportPreview {
  return {
    success: false,
    message,
    fileName,
    totalRowsRead: 0,
    readyCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    rows: [],
    records: [],
  };
}

function getClientCompanyPhone(client: any): string {
  return cellText(client?.companyPhone || client?.phone);
}

function getClientKeySets(clients: any[]) {
  const names = new Set<string>();
  const phones = new Set<string>();
  for (const client of clients) {
    if (client?.hasDirectoryRecord !== true && client?.hasAccount !== true) continue;
    const name = normalizeName(cellText(client?.facilityName));
    const phone = normalizePhone(getClientCompanyPhone(client));
    if (name) names.add(name);
    if (phone) phones.add(phone);
  }
  return { names, phones };
}

export async function parseClientDirectorySpreadsheet(
  file: File,
  existingClients: any[]
): Promise<ClientDirectoryImportPreview> {
  try {
    const extension = file.name.toLowerCase().split('.').pop();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      return makePreview(file.name, 'Utilisez un fichier Excel (.xlsx, .xls) ou CSV.');
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return makePreview(file.name, 'Le fichier doit peser au maximum 5 Mo.');
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellFormula: false, bookVBA: false, WTF: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return makePreview(file.name, 'Aucune feuille trouvée dans le fichier.');

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
      header: 1,
      defval: '',
      raw: false,
    });
    const sheetRange = workbook.Sheets[firstSheetName]['!ref'];
    const sourceStartRow = sheetRange ? XLSX.utils.decode_range(sheetRange).s.r : 0;
    const requiredFields: Array<keyof ClientDirectoryImportRecord> = ['facilityName', 'contactName', 'companyPhone'];
    let headerRowIndex = -1;
    let columnIndexes = new Map<keyof ClientDirectoryImportRecord, number>();

    for (let index = 0; index < Math.min(matrix.length, 20); index++) {
      const headerLookup = new Map(matrix[index].map((value, column) => [normalizeHeader(value), column]));
      const candidateIndexes = new Map<keyof ClientDirectoryImportRecord, number>();
      for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<[keyof ClientDirectoryImportRecord, string[]]>) {
        for (const alias of aliases) {
          const column = headerLookup.get(normalizeHeader(alias));
          if (column !== undefined) {
            candidateIndexes.set(field, column);
            break;
          }
        }
      }
      if (requiredFields.every((field) => candidateIndexes.has(field))) {
        headerRowIndex = index;
        columnIndexes = candidateIndexes;
        break;
      }
    }

    if (headerRowIndex < 0) {
      return makePreview(file.name, 'Les colonnes obligatoires doivent contenir le nom de l’entreprise, le contact principal et le téléphone de l’entreprise.');
    }

    const nonEmptyRows = matrix
      .map((values, offset) => ({ values, rowNumber: offset + sourceStartRow + 1 }))
      .slice(headerRowIndex + 1)
      .filter(({ values }) => values.some((value) => cellText(value) !== ''));
    if (!nonEmptyRows.length) return makePreview(file.name, 'Aucune ligne client à importer dans ce fichier.');
    if (nonEmptyRows.length > 500) return makePreview(file.name, 'Le fichier dépasse la limite de 500 clients par import.');

    const known = getClientKeySets(existingClients);
    const rows: ClientDirectoryImportRow[] = [];
    const records: ClientDirectoryImportRecord[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const { values, rowNumber } of nonEmptyRows) {
      const data = {} as Record<keyof ClientDirectoryImportRecord, string>;
      for (const field of Object.keys(FIELD_ALIASES) as Array<keyof ClientDirectoryImportRecord>) {
        const column = columnIndexes.get(field);
        data[field] = column === undefined ? '' : cellText(values[column]);
      }

      const issues: string[] = [];
      if (!data.facilityName) issues.push('Nom de l’entreprise manquant.');
      if (!data.contactName) issues.push('Contact principal manquant.');
      if (!data.companyPhone) issues.push('Téléphone de l’entreprise manquant.');
      const normalizedPhone = normalizePhone(data.companyPhone);
      if (data.companyPhone && !/^\d{8,15}$/.test(normalizedPhone)) issues.push('Téléphone invalide : indiquez 8 à 15 chiffres.');
      if (data.facilityName.length > 120) issues.push('Nom trop long (120 caractères maximum).');
      if (data.contactName.length > 120) issues.push('Contact trop long (120 caractères maximum).');
      if (data.companyPhone.length > 32) issues.push('Téléphone trop long (32 caractères maximum).');
      if (data.invoiceName.length > 120 || data.facilityTypeOther.length > 120 || data.directorName.length > 120) issues.push('Un nom ou une précision dépasse 120 caractères.');
      if (data.secondaryPhone.length > 32) issues.push('Téléphone secondaire trop long (32 caractères maximum).');
      if (data.city.length > 100) issues.push('Ville trop longue (100 caractères maximum).');
      if (data.deliveryAddress.length > 300) issues.push('Adresse trop longue (300 caractères maximum).');
      if (data.deliveryInstructions.length > 250) issues.push('Précision de livraison trop longue (250 caractères maximum).');

      const facilityType = data.facilityType as FacilityType | '';
      if (facilityType && !FACILITY_TYPES.includes(facilityType)) issues.push('Type de structure non reconnu.');

      if (issues.length) {
        invalidCount++;
        rows.push({ rowNumber, facilityName: data.facilityName, companyPhone: data.companyPhone, status: 'invalid', issues });
        continue;
      }

      const nameKey = normalizeName(data.facilityName);
      const isDuplicate = known.names.has(nameKey) || known.phones.has(normalizedPhone);
      if (isDuplicate) {
        duplicateCount++;
        rows.push({ rowNumber, facilityName: data.facilityName, companyPhone: data.companyPhone, status: 'duplicate', issues: ['Une fiche avec ce nom ou ce téléphone existe déjà. Elle sera ignorée.'] });
        continue;
      }

      known.names.add(nameKey);
      known.phones.add(normalizedPhone);
      records.push({
        facilityName: data.facilityName.slice(0, 120),
        invoiceName: data.invoiceName.slice(0, 120) || undefined,
        facilityType: facilityType || 'Clinique',
        facilityTypeOther: data.facilityTypeOther.slice(0, 120) || undefined,
        contactName: data.contactName.slice(0, 120),
        directorName: data.directorName.slice(0, 120) || undefined,
        companyPhone: data.companyPhone.slice(0, 32),
        secondaryPhone: data.secondaryPhone.slice(0, 32) || undefined,
        city: data.city.slice(0, 100) || undefined,
        deliveryAddress: data.deliveryAddress.slice(0, 300) || undefined,
        deliveryInstructions: data.deliveryInstructions.slice(0, 250) || undefined,
      });
      rows.push({ rowNumber, facilityName: data.facilityName, companyPhone: data.companyPhone, status: 'ready', issues: [] });
    }

    return {
      success: true,
      message: `${records.length} client(s) prêt(s), ${duplicateCount} doublon(s) ignoré(s), ${invalidCount} ligne(s) à corriger.`,
      fileName: file.name,
      totalRowsRead: nonEmptyRows.length,
      readyCount: records.length,
      duplicateCount,
      invalidCount,
      rows,
      records,
    };
  } catch (error) {
    return makePreview(file.name, `Lecture impossible : ${error instanceof Error ? error.message : 'format non reconnu'}.`);
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadClientDirectoryXlsx(clients: any[]): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = EXPORT_COLUMNS.map((column) => column.label);
  const rows = clients.map((client) => EXPORT_COLUMNS.map(({ key }) => {
    if (key === 'companyPhone') return cellText(client.companyPhone || client.phone);
    return cellText(client[key]);
  }));
  const sheetRows: unknown[][] = [
    [],
    ['Répertoire des clients Gloryday Pharma'],
    ['Une ligne par entreprise ou structure. Les champs marqués * sont obligatoires.'],
    [],
    headers,
    ...rows,
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet['!cols'] = [34, 28, 21, 23, 28, 30, 24, 23, 21, 38, 38].map((wch) => ({ wch }));
  if (rows.length) worksheet['!autofilter'] = { ref: `A5:K${5 + rows.length}` };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
  XLSX.writeFile(workbook, `gloryday-repertoire-clients-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadClientDirectoryTemplateXlsx(): Promise<void> {
  const XLSX = await import('xlsx');
  const headers = EXPORT_COLUMNS.map((column) => column.label);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, Array(headers.length).fill('')]);
  worksheet['!cols'] = [34, 28, 21, 23, 28, 30, 24, 23, 21, 38, 38].map((wch) => ({ wch }));
  worksheet['!autofilter'] = { ref: `A1:K2` };
  worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  const instructions = XLSX.utils.aoa_to_sheet([
    ['MODE D’EMPLOI — RÉPERTOIRE CLIENTS GLORYDAY PHARMA'],
    ['1. Remplir la feuille « Clients », une structure par ligne.'],
    ['2. Le nom de la structure, le contact principal et le téléphone de l’entreprise sont obligatoires.'],
    ['3. Garder les téléphones au format texte pour conserver le +241 et les zéros initiaux.'],
    ['4. Enregistrer en .xlsx, .xls ou .csv puis importer dans l’application.'],
    ['5. Limite : 500 clients par import. Les doublons sont signalés et ignorés; les lignes invalides doivent être corrigées.'],
    ['Types acceptés : Clinique, Polyclinique, Hôpital, Laboratoire, Pharmacie, Cabinet médical, Autre.'],
  ]);
  instructions['!cols'] = [{ wch: 115 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
  XLSX.utils.book_append_sheet(workbook, instructions, 'Consignes');
  XLSX.writeFile(workbook, 'modele-vierge-repertoire-clients-gloryday.xlsx');
}
