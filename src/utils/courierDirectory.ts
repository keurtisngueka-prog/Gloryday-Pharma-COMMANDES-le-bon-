import { Courier } from '../types';

const COURIERS_STORAGE_KEY = 'gloryday_couriers_directory_v1';

export const INITIAL_COURIERS: Courier[] = [
  {
    id: 'cour-1',
    name: 'Jean-Marc Mba',
    phone: '+241 74 12 34 56',
    vehicle: 'Moto Yamaha YBR 125 (Caisson isotherme médical)',
    matricule: 'GA-8942-LBV',
    active: true,
    assignedOrdersCount: 2
  },
  {
    id: 'cour-2',
    name: 'Paul-Arnaud Nguema',
    phone: '+241 65 98 76 54',
    vehicle: 'Fourgonnette Peugeot Partner Climatique',
    matricule: 'GA-3120-LBV',
    active: true,
    assignedOrdersCount: 1
  },
  {
    id: 'cour-3',
    name: 'Brice Obame',
    phone: '+241 77 88 99 00',
    vehicle: 'Moto Honda CB125F (Urgences Bloc & Labo)',
    matricule: 'GA-5501-LBV',
    active: true,
    assignedOrdersCount: 3
  },
  {
    id: 'cour-4',
    name: 'Éric Ondo',
    phone: '+241 66 11 22 33',
    vehicle: 'Pick-up Toyota Hilux (Gros volumes & Hôpitaux régionaux)',
    matricule: 'GA-7840-LBV',
    active: true,
    assignedOrdersCount: 0
  }
];

export function getCouriers(): Courier[] {
  try {
    const raw = localStorage.getItem(COURIERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COURIERS_STORAGE_KEY, JSON.stringify(INITIAL_COURIERS));
      return INITIAL_COURIERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_COURIERS;
  }
}

export function saveCouriers(couriers: Courier[]): void {
  try {
    localStorage.setItem(COURIERS_STORAGE_KEY, JSON.stringify(couriers));
  } catch (err) {
    console.error('Erreur save couriers:', err);
  }
}
