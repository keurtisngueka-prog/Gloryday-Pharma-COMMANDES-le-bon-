export interface LibrevilleNeighborhood {
  id: string;
  name: string;
  zone: string;
  estimatedMinutes: string;
  estimatedText: string;
  landmarkExample: string;
  isExpressEligible: boolean;
  baseDeliveryFee: number; // in FCFA (0 if free/included)
  defaultCoordinates: {
    lat: number;
    lng: number;
  };
}

export interface LibrevilleZoneGroup {
  zoneName: string;
  description: string;
  averageDelay: string;
  neighborhoods: LibrevilleNeighborhood[];
}

export const LIBREVILLE_DEFAULT_CENTER = {
  lat: 0.3924,
  lng: 9.4536,
};

export const LIBREVILLE_ZONE_GROUPS: LibrevilleZoneGroup[] = [
  {
    zoneName: 'Zone 1 · Centre & Cœur Urbain',
    description: 'Centre des affaires, cliniques et pharmacies centrales',
    averageDelay: '30 - 45 min',
    neighborhoods: [
      {
        id: 'centre-ville',
        name: 'Centre-Ville',
        zone: 'Zone 1',
        estimatedMinutes: '30 - 40 min',
        estimatedText: '30 à 40 minutes (Express)',
        landmarkExample: 'Près de la Mairie Centrale ou Bd Triomphal',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.3924, lng: 9.4536 }
      },
      {
        id: 'batterie-iv',
        name: 'Batterie IV',
        zone: 'Zone 1',
        estimatedMinutes: '30 - 45 min',
        estimatedText: '30 à 45 minutes (Express)',
        landmarkExample: 'Près de la Polyclinique Chambrier / Ambassades',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.4158, lng: 9.4422 }
      },
      {
        id: 'louis',
        name: 'Quartier Louis',
        zone: 'Zone 1',
        estimatedMinutes: '35 - 45 min',
        estimatedText: '35 à 45 minutes',
        landmarkExample: 'Avenue de Cointet ou bord de mer',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.4065, lng: 9.4461 }
      },
      {
        id: 'glass',
        name: 'Glass',
        zone: 'Zone 1',
        estimatedMinutes: '35 - 50 min',
        estimatedText: '35 à 50 minutes',
        landmarkExample: 'Carrefour Glass / Ancien Sobraga',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.3742, lng: 9.4618 }
      },
      {
        id: 'oloumi',
        name: 'Zone Industrielle Oloumi',
        zone: 'Zone 1',
        estimatedMinutes: '40 - 50 min',
        estimatedText: '40 à 50 minutes',
        landmarkExample: 'Entrepôts Oloumi ou Rue de la Peyrie',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.3665, lng: 9.4692 }
      },
      {
        id: 'mont-bouet',
        name: 'Mont-Bouët / Camp de Police',
        zone: 'Zone 1',
        estimatedMinutes: '40 - 55 min',
        estimatedText: '40 à 55 minutes',
        landmarkExample: 'Proche Grand Marché ou Pharmacie Centrale',
        isExpressEligible: true,
        baseDeliveryFee: 0,
        defaultCoordinates: { lat: 0.3982, lng: 9.4628 }
      }
    ]
  },
  {
    zoneName: 'Zone 2 · Nord Estuaire & Akanda',
    description: 'Akanda, Angondjé, CHU Mère-Enfant et environs',
    averageDelay: '45 - 60 min',
    neighborhoods: [
      {
        id: 'angondje',
        name: 'Angondjé (Stade de l’Amitié)',
        zone: 'Zone 2',
        estimatedMinutes: '45 - 60 min',
        estimatedText: '45 à 60 minutes',
        landmarkExample: 'Vers le Stade de l’Amitié ou Carrefour Amissa',
        isExpressEligible: true,
        baseDeliveryFee: 2000,
        defaultCoordinates: { lat: 0.5112, lng: 9.3995 }
      },
      {
        id: 'akanda-centre',
        name: 'Akanda Centre / CHU Mère-Enfant',
        zone: 'Zone 2',
        estimatedMinutes: '50 - 65 min',
        estimatedText: '50 à 65 minutes',
        landmarkExample: 'Vers le CHUO ou CHU Angondjé',
        isExpressEligible: true,
        baseDeliveryFee: 2000,
        defaultCoordinates: { lat: 0.4985, lng: 9.4060 }
      },
      {
        id: 'avorbam',
        name: 'Avorbam',
        zone: 'Zone 2',
        estimatedMinutes: '50 - 65 min',
        estimatedText: '50 à 65 minutes',
        landmarkExample: 'Bordure voie express Akanda',
        isExpressEligible: false,
        baseDeliveryFee: 2500,
        defaultCoordinates: { lat: 0.4840, lng: 9.4135 }
      },
      {
        id: 'sabliere',
        name: 'La Sablière',
        zone: 'Zone 2',
        estimatedMinutes: '40 - 55 min',
        estimatedText: '40 à 55 minutes',
        landmarkExample: 'Vers l’Aéroport Léon Mba / Bord de mer',
        isExpressEligible: true,
        baseDeliveryFee: 2000,
        defaultCoordinates: { lat: 0.4590, lng: 9.4180 }
      },
      {
        id: 'cap-esterias',
        name: 'Cap Estérias',
        zone: 'Zone 2',
        estimatedMinutes: '75 - 90 min',
        estimatedText: '1h15 à 1h30 (Zone Nord Éloignée)',
        landmarkExample: 'Fin de goudron Cap Estérias',
        isExpressEligible: false,
        baseDeliveryFee: 5000,
        defaultCoordinates: { lat: 0.6115, lng: 9.3360 }
      }
    ]
  },
  {
    zoneName: 'Zone 3 · Est Urbain, Vallons & PKs',
    description: 'Nzeng-Ayong, Charbonnages et axes vers Ntoum',
    averageDelay: '45 - 75 min',
    neighborhoods: [
      {
        id: 'charbonnages',
        name: 'Charbonnages',
        zone: 'Zone 3',
        estimatedMinutes: '40 - 55 min',
        estimatedText: '40 à 55 minutes',
        landmarkExample: 'Carrefour Charbonnages / Total',
        isExpressEligible: true,
        baseDeliveryFee: 1500,
        defaultCoordinates: { lat: 0.4275, lng: 9.4655 }
      },
      {
        id: 'nzeng-ayong',
        name: 'Nzeng-Ayong',
        zone: 'Zone 3',
        estimatedMinutes: '50 - 70 min',
        estimatedText: '50 à 70 minutes',
        landmarkExample: 'Rond-point de Nzeng-Ayong ou Stade',
        isExpressEligible: true,
        baseDeliveryFee: 2000,
        defaultCoordinates: { lat: 0.4190, lng: 9.4930 }
      },
      {
        id: 'plein-ciel',
        name: 'Plein Ciel / Bissegué',
        zone: 'Zone 3',
        estimatedMinutes: '45 - 60 min',
        estimatedText: '45 à 60 minutes',
        landmarkExample: 'Échangeur Plein Ciel',
        isExpressEligible: true,
        baseDeliveryFee: 1500,
        defaultCoordinates: { lat: 0.3965, lng: 9.4810 }
      },
      {
        id: 'sotega-kinguele',
        name: 'Sotéga / Kinguélé',
        zone: 'Zone 3',
        estimatedMinutes: '45 - 60 min',
        estimatedText: '45 à 60 minutes',
        landmarkExample: 'Carrefour Sotéga ou Pharmacie Kinguélé',
        isExpressEligible: true,
        baseDeliveryFee: 1500,
        defaultCoordinates: { lat: 0.4055, lng: 9.4765 }
      },
      {
        id: 'pk5-pk8',
        name: 'PK 5 à PK 8',
        zone: 'Zone 3',
        estimatedMinutes: '50 - 65 min',
        estimatedText: '50 à 65 minutes',
        landmarkExample: 'Axe Voie Rapide / PK7 École Normale',
        isExpressEligible: true,
        baseDeliveryFee: 2000,
        defaultCoordinates: { lat: 0.3910, lng: 9.5050 }
      },
      {
        id: 'pk9-pk12',
        name: 'PK 9 à PK 12',
        zone: 'Zone 3',
        estimatedMinutes: '60 - 80 min',
        estimatedText: '1h à 1h20',
        landmarkExample: 'Marché PK12 / Sortie Libreville',
        isExpressEligible: false,
        baseDeliveryFee: 3000,
        defaultCoordinates: { lat: 0.3860, lng: 9.5380 }
      }
    ]
  },
  {
    zoneName: 'Zone 4 · Sud Industriel & Owendo',
    description: 'Owendo, Port, Centre Hospitalier d’Owendo (CHUO)',
    averageDelay: '60 - 90 min',
    neighborhoods: [
      {
        id: 'owendo-chuo',
        name: 'Owendo (CHUO / Hôpital Pédiatrique)',
        zone: 'Zone 4',
        estimatedMinutes: '60 - 80 min',
        estimatedText: '60 à 80 minutes',
        landmarkExample: 'Centre Hospitalier Universitaire d’Owendo',
        isExpressEligible: true,
        baseDeliveryFee: 2500,
        defaultCoordinates: { lat: 0.3045, lng: 9.5015 }
      },
      {
        id: 'port-owendo',
        name: 'Port d’Owendo / Zone Portuaire',
        zone: 'Zone 4',
        estimatedMinutes: '65 - 85 min',
        estimatedText: '65 à 85 minutes',
        landmarkExample: 'Bord du Port minéralier / OPRAG',
        isExpressEligible: false,
        baseDeliveryFee: 3000,
        defaultCoordinates: { lat: 0.2895, lng: 9.5060 }
      },
      {
        id: 'alenakiri-sni',
        name: 'Alénakiri / SNI Owendo',
        zone: 'Zone 4',
        estimatedMinutes: '70 - 90 min',
        estimatedText: '1h10 à 1h30',
        landmarkExample: 'Zone Cité SNI Owendo',
        isExpressEligible: false,
        baseDeliveryFee: 3000,
        defaultCoordinates: { lat: 0.3120, lng: 9.5140 }
      }
    ]
  }
];

export const ALL_LIBREVILLE_NEIGHBORHOODS: LibrevilleNeighborhood[] = LIBREVILLE_ZONE_GROUPS.flatMap(
  group => group.neighborhoods
);

export function getNeighborhoodById(id: string): LibrevilleNeighborhood | undefined {
  return ALL_LIBREVILLE_NEIGHBORHOODS.find(n => n.id === id);
}

export function detectNeighborhoodFromAddress(address: string): LibrevilleNeighborhood | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  return ALL_LIBREVILLE_NEIGHBORHOODS.find(n => 
    lower.includes(n.name.toLowerCase()) || 
    lower.includes(n.id.replace(/-/g, ' '))
  );
}

export function resolveOrderDestinationCoordinates(
  neighborhoodId?: string,
  deliveryAddress?: string
): { lat: number; lng: number; neighborhoodName: string } {
  if (neighborhoodId) {
    const found = getNeighborhoodById(neighborhoodId);
    if (found) {
      return {
        lat: found.defaultCoordinates.lat,
        lng: found.defaultCoordinates.lng,
        neighborhoodName: found.name
      };
    }
  }
  if (deliveryAddress) {
    const detected = detectNeighborhoodFromAddress(deliveryAddress);
    if (detected) {
      return {
        lat: detected.defaultCoordinates.lat,
        lng: detected.defaultCoordinates.lng,
        neighborhoodName: detected.name
      };
    }
    const lower = deliveryAddress.toLowerCase();
    if (lower.includes('akanda') || lower.includes('angondje') || lower.includes('angondjé')) {
      return { lat: 0.4985, lng: 9.4060, neighborhoodName: 'Akanda' };
    }
    if (lower.includes('owendo')) {
      return { lat: 0.3045, lng: 9.5015, neighborhoodName: 'Owendo' };
    }
  }
  return {
    lat: LIBREVILLE_DEFAULT_CENTER.lat,
    lng: LIBREVILLE_DEFAULT_CENTER.lng,
    neighborhoodName: 'Libreville Centre'
  };
}

export function getEstimatedDeliveryText(neighborhoodId?: string, fallbackAddress?: string): string {
  if (neighborhoodId) {
    const found = getNeighborhoodById(neighborhoodId);
    if (found) return found.estimatedText;
  }
  if (fallbackAddress) {
    const detected = detectNeighborhoodFromAddress(fallbackAddress);
    if (detected) return detected.estimatedText;
  }
  return '45 à 60 minutes (Grand Libreville)';
}

export function computeDeliveryTimeWindow(
  neighborhoodId?: string, 
  baseDate: Date = new Date()
): { timeWindow: string; shortWindow: string; isTomorrow: boolean } {
  const neighborhood = neighborhoodId ? getNeighborhoodById(neighborhoodId) : undefined;
  
  // Extract minutes range
  let minMinutes = 35;
  let maxMinutes = 55;
  if (neighborhood && neighborhood.estimatedMinutes) {
    const parts = neighborhood.estimatedMinutes.match(/\d+/g);
    if (parts && parts.length >= 2) {
      minMinutes = parseInt(parts[0], 10);
      maxMinutes = parseInt(parts[1], 10);
    } else if (parts && parts.length === 1) {
      minMinutes = parseInt(parts[0], 10);
      maxMinutes = minMinutes + 25;
    }
  }

  // Current hours in local time
  const currentHours = baseDate.getHours();

  // If outside regular distribution depot hours (18h00 to 07h30)
  if (currentHours >= 18 || currentHours < 7) {
    return {
      timeWindow: 'Demain matin dès 08h30 (Première tournée prioritaire)',
      shortWindow: 'Demain dès 08h30',
      isTomorrow: true
    };
  }

  const start = new Date(baseDate.getTime() + minMinutes * 60 * 1000);
  const end = new Date(baseDate.getTime() + maxMinutes * 60 * 1000);

  const formatTime = (d: Date) => {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}h${m}`;
  };

  const startStr = formatTime(start);
  const endStr = formatTime(end);

  return {
    timeWindow: `Aujourd'hui entre ${startStr} et ${endStr}`,
    shortWindow: `${startStr} - ${endStr}`,
    isTomorrow: false
  };
}
