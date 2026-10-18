import { HealthcareStructure, FacilityType, User, JobTitle, DirectorApprovalStatus } from '../types';

const STRUCTURES_KEY = 'gloryday_healthcare_structures_v1';
const USERS_STORAGE_KEY = 'gloryday_registered_users_v2';

export function getDefaultQuotaForFacilityType(type: FacilityType): number {
  switch (type) {
    case 'Hôpital':
      return 10;
    case 'Polyclinique':
      return 5;
    case 'Clinique':
    case 'Laboratoire':
    case 'Pharmacie':
    case 'Cabinet médical':
    default:
      return 3;
  }
}

export const INITIAL_HEALTHCARE_STRUCTURES: HealthcareStructure[] = [
  {
    id: 'struct-chambrier',
    name: 'Clinique Chambrier',
    type: 'Clinique',
    maxAccounts: 3,
    city: 'Libreville',
    deliveryAddress: 'Montagne Sainte, Libreville',
    createdAt: '2026-01-10T08:00:00Z',
    directorName: 'Dr. Marcel Chambrier',
    directorPhone: '+24177001122'
  },
  {
    id: 'struct-el-rapha',
    name: 'Polyclinique El Rapha',
    type: 'Polyclinique',
    maxAccounts: 5,
    city: 'Libreville',
    deliveryAddress: 'Batterie 4, Libreville',
    createdAt: '2026-01-12T09:00:00Z',
    directorName: 'Dr. Jeanne Mengue',
    directorPhone: '+24166112233'
  },
  {
    id: 'struct-chul',
    name: 'CHU de Libreville (CHUL)',
    type: 'Hôpital',
    maxAccounts: 10,
    city: 'Libreville',
    deliveryAddress: 'Boulevard Léon Mba, Libreville',
    createdAt: '2026-01-05T07:30:00Z',
    directorName: 'Prof. Jean-Baptiste Nguema',
    directorPhone: '+24174889900'
  },
  {
    id: 'struct-bio-sante',
    name: 'Laboratoire Bio-Santé',
    type: 'Laboratoire',
    maxAccounts: 3,
    city: 'Libreville',
    deliveryAddress: 'Quartier Louis, Libreville',
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'struct-pharm-forestiers',
    name: 'Grande Pharmacie des Forestiers',
    type: 'Pharmacie',
    maxAccounts: 3,
    city: 'Libreville',
    deliveryAddress: 'Glass, Centre-Ville, Libreville',
    createdAt: '2026-02-15T11:00:00Z'
  },
  {
    id: 'struct-ebori',
    name: 'Hôpital Mère-Enfant Jeanne Ebori',
    type: 'Hôpital',
    maxAccounts: 10,
    city: 'Libreville',
    deliveryAddress: 'Camp de Gaulle, Libreville',
    createdAt: '2026-02-20T08:00:00Z'
  }
];

export function getHealthcareStructures(): HealthcareStructure[] {
  try {
    const raw = localStorage.getItem(STRUCTURES_KEY);
    if (!raw) {
      localStorage.setItem(STRUCTURES_KEY, JSON.stringify(INITIAL_HEALTHCARE_STRUCTURES));
      return INITIAL_HEALTHCARE_STRUCTURES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_HEALTHCARE_STRUCTURES;
  } catch (err) {
    console.error('Error reading healthcare structures from storage:', err);
    return INITIAL_HEALTHCARE_STRUCTURES;
  }
}

export function saveHealthcareStructures(structures: HealthcareStructure[]): void {
  try {
    localStorage.setItem(STRUCTURES_KEY, JSON.stringify(structures));
  } catch (err) {
    console.error('Error saving healthcare structures:', err);
  }
}

export function getStructureById(id: string): HealthcareStructure | undefined {
  const all = getHealthcareStructures();
  return all.find(s => s.id === id);
}

export function getStructureByName(name: string): HealthcareStructure | undefined {
  const all = getHealthcareStructures();
  const clean = name.trim().toLowerCase();
  return all.find(s => s.name.trim().toLowerCase() === clean);
}

export function registerOrGetStructure(
  name: string,
  type: FacilityType,
  address?: string,
  city: string = 'Libreville'
): HealthcareStructure {
  const all = getHealthcareStructures();
  const existing = getStructureByName(name);
  if (existing) {
    return existing;
  }

  const maxAccounts = getDefaultQuotaForFacilityType(type);
  const newStructure: HealthcareStructure = {
    id: `struct-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    type,
    maxAccounts,
    city,
    deliveryAddress: address?.trim(),
    createdAt: new Date().toISOString()
  };

  const updated = [...all, newStructure];
  saveHealthcareStructures(updated);
  return newStructure;
}

export function getRegisteredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRegisteredUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

export function getStructureMembers(structureId: string, users?: User[]): User[] {
  const list = users || getRegisteredUsers();
  return list.filter(u => u.structureId === structureId);
}

export function getStructureAccountsCount(structureId: string, users?: User[]): number {
  return getStructureMembers(structureId, users).length;
}

export function canAddAccountToStructure(
  structureId: string,
  users?: User[]
): { allowed: boolean; currentCount: number; maxAccounts: number; reason?: string } {
  const struct = getStructureById(structureId);
  if (!struct) {
    return { allowed: true, currentCount: 0, maxAccounts: 3 };
  }
  const currentCount = getStructureAccountsCount(structureId, users);
  if (currentCount >= struct.maxAccounts) {
    return {
      allowed: false,
      currentCount,
      maxAccounts: struct.maxAccounts,
      reason: `La structure « ${struct.name} » a atteint son quota maximal de ${struct.maxAccounts} comptes (${currentCount}/${struct.maxAccounts}). Contactez votre direction ou l'administrateur Gloryday.`
    };
  }
  return {
    allowed: true,
    currentCount,
    maxAccounts: struct.maxAccounts
  };
}

export function updateStructureQuota(structureId: string, newMax: number): HealthcareStructure | undefined {
  const all = getHealthcareStructures();
  const index = all.findIndex(s => s.id === structureId);
  if (index === -1) return undefined;

  const updated = [...all];
  updated[index] = {
    ...updated[index],
    maxAccounts: Math.max(1, newMax)
  };
  saveHealthcareStructures(updated);
  return updated[index];
}

export function getPendingDirectorRequests(users?: User[]): User[] {
  const list = users || getRegisteredUsers();
  return list.filter(u => u.jobTitle === 'directeur' && u.directorApprovalStatus === 'pending');
}

export function approveDirectorRequest(userId: string): { success: boolean; user?: User; structure?: HealthcareStructure; error?: string } {
  const allUsers = getRegisteredUsers();
  const uIdx = allUsers.findIndex(u => u.id === userId);
  if (uIdx === -1) {
    return { success: false, error: 'Utilisateur introuvable' };
  }

  const user = allUsers[uIdx];
  const updatedUser: User = {
    ...user,
    directorApprovalStatus: 'approved'
  };

  allUsers[uIdx] = updatedUser;
  saveRegisteredUsers(allUsers);

  // Link as director in HealthcareStructure if structureId exists
  let structure: HealthcareStructure | undefined;
  if (user.structureId) {
    const structures = getHealthcareStructures();
    const sIdx = structures.findIndex(s => s.id === user.structureId);
    if (sIdx > -1) {
      structures[sIdx] = {
        ...structures[sIdx],
        directorUserId: user.id,
        directorName: user.contactName || user.phone,
        directorPhone: user.phone
      };
      saveHealthcareStructures(structures);
      structure = structures[sIdx];
    }
  }

  // Update current user if it's the one logged in
  try {
    const current = localStorage.getItem('gloryday_current_user');
    if (current) {
      const parsed = JSON.parse(current);
      if (parsed.id === userId) {
        localStorage.setItem('gloryday_current_user', JSON.stringify(updatedUser));
      }
    }
  } catch {}

  return { success: true, user: updatedUser, structure };
}

export function rejectDirectorRequest(userId: string): { success: boolean; user?: User; error?: string } {
  const allUsers = getRegisteredUsers();
  const uIdx = allUsers.findIndex(u => u.id === userId);
  if (uIdx === -1) {
    return { success: false, error: 'Utilisateur introuvable' };
  }

  const updatedUser: User = {
    ...allUsers[uIdx],
    directorApprovalStatus: 'rejected'
  };

  allUsers[uIdx] = updatedUser;
  saveRegisteredUsers(allUsers);

  try {
    const current = localStorage.getItem('gloryday_current_user');
    if (current) {
      const parsed = JSON.parse(current);
      if (parsed.id === userId) {
        localStorage.setItem('gloryday_current_user', JSON.stringify(updatedUser));
      }
    }
  } catch {}

  return { success: true, user: updatedUser };
}
