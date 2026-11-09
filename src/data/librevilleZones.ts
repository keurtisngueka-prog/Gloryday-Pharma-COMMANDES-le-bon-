export interface LibrevilleNeighborhood {
  id: string;
  name: string;
  zone: string;
  estimatedMinutes: string;
  estimatedText: string;
  landmarkExample: string;
  isExpressEligible: boolean;
  baseDeliveryFee: number; // in FCFA (0 if free/included)
  administrativeArea?: string;
  aliases?: string[];
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

const EXISTING_NEIGHBORHOODS = LIBREVILLE_ZONE_GROUPS.flatMap(group => group.neighborhoods);

// Official Gabonese Journal register for Libreville, Akanda and Owendo.
// Existing grouped IDs stay available for addresses already stored in accounts.
type NeighborhoodRow = [id: string, name: string, administrativeArea: string, zone: string, fee: number, aliases?: string[]];
const EXPANDED_NEIGHBORHOOD_ROWS: NeighborhoodRow[] = [
  ['aeroport', 'Aéroport', '1er arrondissement de Libreville', 'Zone 2', 2000],
  ['okala-sud', 'Okala Sud', '1er arrondissement de Libreville', 'Zone 2', 2000, ['Okala']],
  ['mikolongo', 'Mikolongo', '1er arrondissement de Libreville', 'Zone 2', 2000],
  ['lycee-indjendje', 'Lycée Indjendje Gondjout', '1er arrondissement de Libreville', 'Zone 2', 2000, ['Indjendje Gondjout']],
  ['alibandeng', 'Alibandeng', '1er arrondissement de Libreville', 'Zone 3', 2000, ['Alibandeng']],
  ['pierre-de-mbigou', 'Pierre de Mbigou', '1er arrondissement de Libreville', 'Zone 3', 2000],
  ['camp-de-gaulle', 'Camp de Gaulle', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['tahiti', 'Tahiti', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['cite-democratie', 'Cité de la Démocratie', '1er arrondissement de Libreville', 'Zone 3', 2000],
  ['lac-bleu', 'Lac Bleu', '1er arrondissement de Libreville', 'Zone 3', 2000],
  ['diba-diba', 'Diba-Diba', '1er arrondissement de Libreville', 'Zone 3', 2000],
  ['ondogo-1', 'Ondogo 1 GR', '1er arrondissement de Libreville', 'Zone 3', 2000, ['Ondogo 1']],
  ['bel-air-lbv', 'Bel-Air', '1er arrondissement de Libreville', 'Zone 3', 2000],
  ['lycee-leon-mba', 'Lycée Léon MBA', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['gue-gue', 'Gué-Gué', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['bas-gue-gue', 'Bas de Gué-Gué', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['haut-gue-gue', 'Haut de Gué-Gué', '1er arrondissement de Libreville', 'Zone 1', 0, ['Hauts de Gué-Gué']],
  ['ongongo', 'Ongongo', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['kalikak', 'Kalikak', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['camp-des-boys', 'Camp des Boys', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['derriere-prison', 'Derrière la Prison', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['palais-justice', 'Palais de Justice', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['ecole-normale', 'École Normale', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['cite-pomidou', 'Cité Pompidou', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['gros-bouquet-1', 'Gros-Bouquet I', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['gros-bouquet-2', 'Gros-Bouquet II', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['trois-quartiers', 'Trois-Quartiers', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['quaben', 'Quaben', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['jeanne-ebori', 'Jeanne Ebori', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['plaine-orety-louis', 'Plaine-Orety (côté Louis)', '1er arrondissement de Libreville', 'Zone 1', 0, ['Plaine Orety']],
  ['jeanne-blanche', 'Jeanne et Blanche', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['ancienne-sobraga-ens', 'Ancienne Sobraga (côté ENS)', '1er arrondissement de Libreville', 'Zone 1', 0],
  ['uob', 'Université Omar Bongo', '2e arrondissement de Libreville', 'Zone 1', 0, ['UOB']],
  ['ancien-site-rtg', 'Ancien site de la RTG', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['plaine-orety-uob', 'Plaine-Orety (côté UOB)', '2e arrondissement de Libreville', 'Zone 1', 0, ['Plaine Orety']],
  ['saint-nicolas', 'Saint-Nicolas', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['port-mole', 'Port-Môle', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['vallee-sainte-marie', 'Vallée Sainte-Marie', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['archeveche', 'Archevêché', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['jean-paul-ii', 'Jean-Paul II', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['bessieux', 'Bessieux', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['hotel-de-ville', 'Hôtel de Ville', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['fonction-publique', 'Fonction Publique', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['cocotiers', 'Cocotiers', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['atong-abe', 'Atong-Abé', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['nkembo', 'Nkembo', '2e arrondissement de Libreville', 'Zone 1', 0],
  ['la-campagne', 'La Campagne', '2e arrondissement de Libreville', 'Zone 3', 1500],
  ['sotega', 'Sotéga', '2e arrondissement de Libreville', 'Zone 3', 1500, ['Sodega']],
  ['sociga', 'SOCIGA', '2e arrondissement de Libreville', 'Zone 3', 1500],
  ['avea', 'Avéa', '2e arrondissement de Libreville', 'Zone 3', 1500],
  ['atsibi-ntsos', 'Atsib-Ntsos', '2e arrondissement de Libreville', 'Zone 3', 1500, ['Atsibe-Ntsos', 'Atsibi Tsoss']],
  ['usso', 'USSO', '2e arrondissement de Libreville', 'Zone 3', 1500, ['IUSO']],
  ['cite-caisse', 'Cité de la Caisse', '2e arrondissement de Libreville', 'Zone 3', 1500],
  ['cite-mebiame', 'Cité Mebiame', '2e arrondissement de Libreville', 'Zone 3', 1500],
  ['sorbonne', 'Sorbonne', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['sainte-anne', 'Sainte-Anne', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['akemindjogoni', 'Akémindjogoni', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['abenelang', 'Abénélang', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['cinq-palmiers', 'Cinq-Palmiers', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['carrefour-hassan', 'Carrefour Hassan', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['presidence', 'Présidence', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['chul', 'CHUL', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['avenue-cointet', 'Avenue de Cointet', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['derriere-hopital', 'Derrière l’Hôpital', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['montagne-sainte', 'Montagne Sainte', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['petit-paris', 'Petit-Paris', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['peyrie', 'La Peyrie', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['peyrie-dakar', 'Peyrie Dakar', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['akebe-ville', 'Akébé-Ville', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['nombakele-nord', 'Nombakélé-Nord', '3e arrondissement de Libreville', 'Zone 1', 0],
  ['stfo', 'STFO', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['venez-voir', 'Venez-Voir', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['likouala', 'Likouala', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['akebe-plaine', 'Akébé Plaine', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['belle-vue', 'Belle-Vue', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['belle-vue-2', 'Belle-Vue II', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['kinguele-1', 'Kinguélé I', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['kinguele-2', 'Kinguélé II', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['akebe-frontiere', 'Akébé Frontière', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['awendje-zone-b2', 'Awendjé Zone B2', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['belles-peintures', 'Belles-Peintures', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['dragon', 'Dragon', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['cosmopark', 'Cosmopark', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['rio', 'Rio', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['terre-nouvelle-3', 'Terre Nouvelle (secteur 3e)', '3e arrondissement de Libreville', 'Zone 3', 1500, ['Terre Nouvelle']],
  ['pk5', 'PK 5', '3e arrondissement de Libreville', 'Zone 3', 1500],
  ['pk6', 'PK 6', '3e arrondissement de Libreville', 'Zone 3', 2000],
  ['pk7', 'PK 7', '3e arrondissement de Libreville', 'Zone 3', 2000],
  ['pk8', 'PK 8', '3e arrondissement de Libreville', 'Zone 3', 2000],
  ['ambilambani', 'Ambilambani', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['baraka', 'Baraka', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['carrefour-boulingui', 'Carrefour Boulingui', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['plaine-niger', 'Plaine Niger', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['baraka-mission', 'Baraka Mission', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['awendje-2', 'Awendjé II', '4e arrondissement de Libreville', 'Zone 3', 1500],
  ['poste-centrale', 'Poste Centrale', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['hollando', 'Hollando', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['bicig-centre', 'BICIG Centre', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['waterman', 'Waterman', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['chambre-commerce', 'Chambre de Commerce', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['saint-benoit', 'Saint-Benoît', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['nombakele-sud', 'Nombakélé-Sud', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['batavea', 'Batavéa', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['london', 'London', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['saint-michel', 'Saint-Michel', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['toulon', 'Toulon', '4e arrondissement de Libreville', 'Zone 1', 0],
  ['cite-damas', 'Cité Damas', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['bissegue', 'Bisségué', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['beau-sejour', 'Beau-Séjour', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['fopi', 'FOPI', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['mindoube-1', 'Mindoubé I', '5e arrondissement de Libreville', 'Zone 4', 2500],
  ['mindoube-2', 'Mindoubé II', '5e arrondissement de Libreville', 'Zone 4', 2500],
  ['iai', 'IAI', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['golf-lbv', 'Golf', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['ozangue', 'Ozangué', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['pk10-droit', 'PK 10 (côté droit de la Nationale)', '5e arrondissement de Libreville', 'Zone 3', 2500, ['PK10 droite']],
  ['melen-ena', 'Melen ENA', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['nzeng-miang', 'Nzeng-Miang', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['bizango-rail', 'Bizango-Rail', '5e arrondissement de Libreville', 'Zone 3', 2500],
  ['lalala-gauche', 'Lalala à gauche', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['lalala-droite', 'Lalala à droite', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['lalala-dakar', 'Lalala Dakar', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['acae', 'ACAE', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['soduco', 'SODUCO', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['ozoungue', 'Ozoungué', '5e arrondissement de Libreville', 'Zone 3', 2000],
  ['injs', 'INJS', '5e arrondissement de Libreville', 'Zone 4', 2000],
  ['ondogo-2', 'Ondogo 2', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['montalier', 'Montalier', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['lycee-djoue-dabany', 'Lycée Djoué Dabany', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['pk9-gauche', 'PK 9 (côté gauche de la Nationale)', '6e arrondissement de Libreville', 'Zone 3', 2500, ['PK9 gauche']],
  ['pk10-gauche', 'PK 10 (côté gauche de la Nationale)', '6e arrondissement de Libreville', 'Zone 3', 2500, ['PK10 gauche']],
  ['pk11-gauche', 'PK 11 (côté gauche de la Nationale)', '6e arrondissement de Libreville', 'Zone 3', 2500, ['PK11 gauche']],
  ['derriere-hopital-militaire', 'Derrière l’Hôpital Militaire', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['melen', 'Melen', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['oveng', 'Oveng', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['bambouchine', 'Bambouchine', '6e arrondissement de Libreville', 'Zone 3', 2500, ['Bambou-Chine', 'Bambouchine']],
  ['akougbe', 'Akougbe', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['sibang-nkol-ogoum', 'Sibang-Nkol-Ogoum', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['sibang-arboretum', 'Sibang-Arboretum', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['adzebe-sibang', 'Adzébé-Sibang', '6e arrondissement de Libreville', 'Zone 3', 2500],
  ['marche-bananes', 'Marché-Bananes', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['sga', 'SGA', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['nzeng-ayong-centre', 'Nzeng-Ayong (centre)', '6e arrondissement de Libreville', 'Zone 3', 2000],
  ['marseille-akanda', 'Marseille', '1er arrondissement d’Akanda', 'Zone 2', 2500],
  ['mveng-ayong-akanda', 'Mveng-Ayong', '1er arrondissement d’Akanda', 'Zone 2', 3000],
  ['premier-campement-akanda', '1er Campement', '1er arrondissement d’Akanda', 'Zone 2', 2500, ['Premier Campement']],
  ['makwengue', 'Makwengue', '1er arrondissement d’Akanda', 'Zone 2', 3000],
  ['iyalala', 'Iyalala', '1er arrondissement d’Akanda', 'Zone 2', 3000],
  ['malibe-1', 'Malibé 1', '1er arrondissement d’Akanda', 'Zone 2', 3500],
  ['malibe-2', 'Malibé 2', '1er arrondissement d’Akanda', 'Zone 2', 3500],
  ['santa-clara', 'Santa-Clara', '1er arrondissement d’Akanda', 'Zone 2', 3000],
  ['bolokobouet', 'Bolokobouet', '1er arrondissement d’Akanda', 'Zone 2', 3500],
  ['gabaga', 'Gabaga', '1er arrondissement d’Akanda', 'Zone 2', 4000],
  ['ile-mbanie', 'Île Mbanié', '1er arrondissement d’Akanda', 'Zone 2', 5000],
  ['okala-akanda', 'Okala', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['delta-postal', 'Delta Postal', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['gigi', 'Gigi', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['sherko', 'Sherko', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['entraco', 'Entraco', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['cite-amissa', 'Cité Amissa', '2e arrondissement d’Akanda', 'Zone 2', 2000],
  ['cap-caravane', 'Cap Caravane', '2e arrondissement d’Akanda', 'Zone 2', 2500],
  ['akournam-1', 'Akournam 1', '1er arrondissement d’Owendo', 'Zone 4', 2500],
  ['cite-sni-owendo', 'Cité SNI', '1er arrondissement d’Owendo', 'Zone 4', 2500],
  ['cite-octra', 'Cité OCTRA', '1er arrondissement d’Owendo', 'Zone 4', 2500],
  ['awoungou', 'Awoungou', '1er arrondissement d’Owendo', 'Zone 4', 2500],
  ['service-civique', 'Service Civique', '1er arrondissement d’Owendo', 'Zone 4', 2500],
  ['owendo-port', 'Owendo Port', '1er arrondissement d’Owendo', 'Zone 4', 3000],
  ['virie', 'Virié', '1er arrondissement d’Owendo', 'Zone 4', 3000],
  ['akournam-2', 'Akournam 2', '2e arrondissement d’Owendo', 'Zone 4', 3000],
  ['igoumie', 'Igoumié', '2e arrondissement d’Owendo', 'Zone 4', 3000],
  ['mbila-nyambi', 'Mbila-Nyambi', '2e arrondissement d’Owendo', 'Zone 4', 3000],
  ['pointe-claire', 'Pointe Claire', '2e arrondissement d’Owendo', 'Zone 4', 3000],
  ['ile-coniquet', 'Île Coniquet', '2e arrondissement d’Owendo', 'Zone 4', 5000],
];

const zoneTemplates = new Map<string, LibrevilleNeighborhood>();
EXISTING_NEIGHBORHOODS.forEach(neighborhood => {
  if (!zoneTemplates.has(neighborhood.zone)) zoneTemplates.set(neighborhood.zone, neighborhood);
});

const expandedNeighborhoods: LibrevilleNeighborhood[] = EXPANDED_NEIGHBORHOOD_ROWS.map(([id, name, administrativeArea, zone, fee, aliases]) => {
  const template = zoneTemplates.get(zone) || zoneTemplates.get('Zone 1')!;
  return {
    ...template,
    id,
    name,
    zone,
    baseDeliveryFee: fee,
    administrativeArea,
    aliases,
    estimatedMinutes: template.estimatedMinutes,
    estimatedText: template.estimatedText,
    landmarkExample: `Précisez un repère exact pour ${name}`,
    isExpressEligible: false,
    defaultCoordinates: { ...template.defaultCoordinates },
  };
});

export const ALL_LIBREVILLE_NEIGHBORHOODS: LibrevilleNeighborhood[] = [
  ...EXISTING_NEIGHBORHOODS,
  ...expandedNeighborhoods,
];

// Arrondissements administratifs (distincts des zones tarifaires de livraison).
// Les secteurs qui traversent une limite administrative restent explicitement indiqués.
const NEIGHBORHOOD_ADMINISTRATIVE_AREAS: Record<string, string> = {
  'centre-ville': '3e arrondissement de Libreville',
  'batterie-iv': '1er arrondissement de Libreville',
  louis: '1er arrondissement de Libreville',
  glass: '4e arrondissement de Libreville',
  oloumi: '5e arrondissement de Libreville',
  'mont-bouet': '3e arrondissement de Libreville',
  angondje: '2e arrondissement d’Akanda',
  'akanda-centre': '2e arrondissement d’Akanda',
  avorbam: '2e arrondissement d’Akanda',
  sabliere: '2e arrondissement d’Akanda',
  'cap-esterias': '1er arrondissement d’Akanda',
  charbonnages: '1er arrondissement de Libreville',
  'nzeng-ayong': '6e arrondissement de Libreville',
  'plein-ciel': '5e arrondissement de Libreville',
  'sotega-kinguele': '2e arrondissement (Sotéga) ou 3e (Kinguélé), Libreville',
  'pk5-pk8': '3e arrondissement de Libreville',
  'pk9-pk12': '5e ou 6e arrondissement de Libreville, selon le côté de la Nationale',
  'owendo-chuo': '1er arrondissement d’Owendo',
  'port-owendo': '1er arrondissement d’Owendo',
  'alenakiri-sni': '1er arrondissement d’Owendo'
};

export function getNeighborhoodAdministrativeArea(neighborhoodId: string): string {
  return ALL_LIBREVILLE_NEIGHBORHOODS.find(neighborhood => neighborhood.id === neighborhoodId)?.administrativeArea
    || NEIGHBORHOOD_ADMINISTRATIVE_AREAS[neighborhoodId]
    || 'Arrondissement à confirmer';
}

export function getNeighborhoodById(id: string): LibrevilleNeighborhood | undefined {
  return ALL_LIBREVILLE_NEIGHBORHOODS.find(n => n.id === id);
}

export function buildNeighborhoodDeliveryAddress(neighborhoodId: string, instructions = ''): string {
  const neighborhood = getNeighborhoodById(neighborhoodId);
  if (!neighborhood) return instructions.trim();
  const details = instructions.trim();
  const administrativeArea = getNeighborhoodAdministrativeArea(neighborhoodId);
  const base = `${neighborhood.name}, ${administrativeArea}, ${neighborhood.zone}, Gabon`;
  return details ? `${base} · Repère : ${details}` : base;
}

export function extractDeliveryInstructions(address: string, neighborhoodId?: string): string {
  const neighborhood = (neighborhoodId && getNeighborhoodById(neighborhoodId)) || detectNeighborhoodFromAddress(address);
  if (!address.trim()) return '';
  if (!neighborhood) {
    return address
      .replace(/\b(Libreville|Gabon)\b/gi, ' ')
      .replace(/[·,;|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  let remainder = address;
  for (const part of [neighborhood.name, getNeighborhoodAdministrativeArea(neighborhood.id), neighborhood.zone, 'Libreville', 'Akanda', 'Owendo', 'Gabon']) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    remainder = remainder.replace(new RegExp(escaped, 'ig'), ' ');
  }
  return remainder
    .replace(/rep[eè]re\s*:?/gi, ' ')
    .replace(/[·,;|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
