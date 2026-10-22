import { Product, Pack } from '../types';

export const LEGACY_DEMO_PRODUCT_IDS = new Set([
  'c-ser-01',
  'c-ser-02',
  'c-ser-03',
  'c-ser-04',
  'c-ser-05',
  'c-ser-06',
  'c-ser-07',
  'c-ser-08',
  'c-ser-09',
  'c-ser-10',
  'c-ser-11',
  'c-ser-12',
  'c-ser-13',
  'c-gan-01',
  'c-gan-02',
  'c-gan-03',
  'c-gan-04',
  'eq-01',
  'eq-02',
  'eq-03',
  'eq-04',
  'eq-05',
  'eq-07',
  'eq-dev-01',
  'eq-dev-02',
  'eq-dev-03',
  'eq-dev-04',
  'eq-dev-05',
  'r-02',
  'r-03',
  'r-06',
  'r-09',
  'h-01',
  'h-02',
  'h-06',
  'p-01',
  'p-03',
  'u-01',
  'u-03',
  'prod-1',
  'prod-2',
  'prod-3',
  'prod-4',
  'prod-5',
  'prod-6'
]);

export const LEGACY_DEMO_PACK_IDS = new Set([
  'pack-perfusion-express',
  'pack-protection-bloc',
  'pack-depistage-labo',
  'pack-1',
  'pack-2',
  'pack-3',
  'pack-4'
]);

export const CATEGORIES = [
  'Tous les articles',
  'Consommables médicaux',
  'Tests Rapides (TdR) & Autres',
  'Biochimie & Marqueurs',
  'Réactifs, Colorants, Contrôles & Calibrateurs',
  'Petits Matériels & Appareils',
  'Équipements sur Devis'
] as const;

export const CONSUMABLE_SUBCATEGORIES = [
  'Toutes les sous-catégories',
  'Seringues et perfusion',
  'Gants',
  'Sondes et oxygène',
  'Pansements',
  'Tenues et champs',
  'Tubes et laboratoire',
  'Chirurgie et examen'
] as const;

export const MEDICAL_SPECIALTIES = [
  { id: 'all', label: 'Toutes spécialités' },
  { id: 'chirurgie', label: 'Bloc & Chirurgie' },
  { id: 'perfusion', label: 'Perfusion & Injection' },
  { id: 'pansements', label: 'Plaies & Pansements' },
  { id: 'maternite', label: 'Maternité & Pédiatrie' },
  { id: 'urgence', label: 'Urgence & Réanimation' },
  { id: 'hygiene', label: 'Hygiène & Protection' },
  { id: 'laboratoire', label: 'Diagnostic & Labo' }
] as const;

export type MedicalSpecialtyId = typeof MEDICAL_SPECIALTIES[number]['id'];

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  'seringe': ['seringue', 'aiguille', 'injection'],
  'seringues': ['seringue', 'aiguille'],
  'cathlon': ['catheter', 'cathéter', 'perfusion', 'veineux'],
  'catheter': ['cathlon', 'cathéter'],
  'gants': ['gant', 'examen', 'chirurgicaux', 'latex', 'nitrile'],
  'gant': ['gants', 'latex', 'nitrile'],
  'paludisme': ['malaria', 'tdr', 'plasmodium', 'goutte epaisse'],
  'malaria': ['paludisme', 'tdr'],
  'sida': ['hiv', 'vih', 'depistage'],
  'vih': ['hiv', 'sida'],
  'hiv': ['vih', 'sida'],
  'tension': ['tensiometre', 'tensiomètre', 'brassard', 'pression'],
  'bebe': ['neonatal', 'pédiatrique', 'foetal', 'doppler', 'couveuse'],
  'pansement': ['compresse', 'bande', 'gaze', 'sparadrap', 'tulle']
};

export const INITIAL_PRODUCTS: Product[] = [
  // =========================================================================
  // 1. CONSOMMABLES MÉDICAUX (89 RÉFÉRENCES)
  // =========================================================================
  {
    id: 'c-01',
    name: 'Aiguille de ponction lombaire stérile (G18 à G27)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité (Calibre au choix G18-G27)', price: 800 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Aiguille de ponction lombaire spinale stérile à biseau Quincke avec mandrin ajusté. Disponible en jauges 18G à 27G.'
  },
  {
    id: 'c-02',
    name: 'Aiguilles à ailettes épicraniennes (23G)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Unité stérile 23G', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Micro-perfuseur à ailettes épicrânien flexible pour perfusion et prélèvements pédiatriques ou veines difficiles.'
  },
  {
    id: 'c-03',
    name: 'Aiguilles dentaires stériles (Boîte)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte de 100 aiguilles', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Aiguilles dentaires stériles siliconées à filetage métrique pour seringues d\'anesthésie dentaire locale et locorégionale.'
  },
  {
    id: 'c-04',
    name: 'Aiguilles hypodermiques stériles (G18 à G25)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 100 aiguilles (G18, G19, G21, G22, G23, G25)', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Aiguilles hypodermiques stériles à usage unique en acier inoxydable à biseau triple pour injection et prélèvement.'
  },
  {
    id: 'c-05',
    name: 'Alèse jetable absorbante (60 x 90 cm)',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'hygiene',
    variants: [
      { label: 'Paquet de 10 alèses', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Alèse de protection de lit et brancard ultra-absorbante 60x90 cm avec film polyéthylène imperméable étanche.'
  },
  {
    id: 'c-06',
    name: 'Bâtonnets abaisse-langue en bois (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 bâtonnets', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Abaisse-langue en bois blanc de bouleau à bords arrondis et surface lisse pour examen oropharyngé adulte et pédiatrique.'
  },
  {
    id: 'c-07',
    name: 'Bandes d\'ouate orthopédique sous-plâtre',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 10 cm x 2.7 m', price: 500 },
      { label: 'Rouleau 15 cm x 2.7 m', price: 750 },
      { label: 'Rouleau 20 cm x 2.7 m', price: 950 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Bande d\'ouate hydrophobe protectrice pour rembourrage sous plâtre, résines de contention et pansements compressifs.'
  },
  {
    id: 'c-08',
    name: 'Bandes de crêpe élastique de maintien',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 10 cm x 4 m', price: 350 },
      { label: 'Rouleau 15 cm x 4 m', price: 500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Bande de crêpe 100% coton à lisières tissées pour contention légère, maintien d\'attelles et fixation de pansements.'
  },
  {
    id: 'c-09',
    name: 'Bandes de gaze hydrophile bordée',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 10 cm x 4 m', price: 300 },
      { label: 'Rouleau 15 cm x 4 m', price: 400 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 25,
    description: 'Bande de gaze hydrophile pur coton non élastique pour fixation de compresses et soins infirmiers courants.'
  },
  {
    id: 'c-10',
    name: 'Bandes plâtrées à prise rapide',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'chirurgie',
    variants: [
      { label: 'Rouleau 10 cm x 2.7 m', price: 800 },
      { label: 'Rouleau 15 cm x 2.7 m', price: 1100 },
      { label: 'Rouleau 20 cm x 2.7 m', price: 1400 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Bande plâtrée crémeuse d\'immobilisation orthopédique à immersion tiède et prise rapide (3 à 5 minutes).'
  },
  {
    id: 'c-11',
    name: 'Bavettes / Masques chirurgicaux 3 plis (Boîte de 50)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 50 masques', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Masques chirurgicaux 3 plis type II avec barrette nasale ajustable et élastiques auriculaires souples hypoallergéniques.'
  },
  {
    id: 'c-12',
    name: 'Bébés bonnets en maille coton naissance',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'maternite',
    variants: [
      { label: 'Unité naissance', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Bonnet néonatal en jersey doux respirant pour maintien thermique des nouveau-nés en salle d\'accouchement et maternité.'
  },
  {
    id: 'c-13',
    name: 'Bistouri jetable avec manche (Lames N° 11 à 24)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile (N° 11, 15, 20, 21, 22, 23, 24)', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Scalpel chirurgical stérile à manche plastique gradué et lame en acier au carbone avec capuchon protecteur de sécurité.'
  },
  {
    id: 'c-14',
    name: 'Blouse de protection pour visiteurs / patient jetable',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Unité sous sachet', price: 500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 25,
    description: 'Blouse d\'isolement non-tissée polypropylène à manches longues avec poignets élastiqués et fermeture à nouer au dos.'
  },
  {
    id: 'c-15',
    name: 'Boîte de Pétri stérile en polystyrène (90 mm)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Unité stérile avec couvercle', price: 300 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Boîte de Pétri stérile 90 mm avec ergots de ventilation pour culture microbiologique et antibiogrammes de paillasse.'
  },
  {
    id: 'c-16',
    name: 'Bouchon obturateur Luer Lock stérile',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Unité stérile', price: 150 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Bouchon d\'obturation stérile mâle/femelle Luer-Lock universel pour cathéter veineux et prolongateur de perfusion.'
  },
  {
    id: 'c-17',
    name: 'Bouillotte médicale à eau chaude en caoutchouc',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'urgence',
    variants: [
      { label: 'Unité 2 Litres', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Bouillotte en caoutchouc naturel vulcanisé avec bouchon fileté à joint étanche pour thermothérapie et soins hospitaliers.'
  },
  {
    id: 'c-18',
    name: 'Calots chirurgicaux jetables (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte de 100 calots', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Calot chirurgical non tissé respirant avec liens de serrage à l\'arrière pour personnel de bloc opératoire et stérilisation.'
  },
  {
    id: 'c-19',
    name: 'Canule de Guedel stérile oropharyngée (CH 000 à 5)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile (Taille 000 à 5)', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Canule oropharyngée semi-rigide à code couleur avec bloc anti-morsure pour maintien de la liberté des voies aériennes.'
  },
  {
    id: 'c-20',
    name: 'Canule de Mayo oropharyngée',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Canule pharyngienne courbée pour anesthésie et réanimation d\'urgence évitant la chute de langue en position dorsale.'
  },
  {
    id: 'c-21',
    name: 'Canules d\'aspiration chirurgicale Yankauer stériles',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile avec tubulure ou embout standard', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Canule rigide transparente coudée Yankauer avec orifices latéraux anti-traumatiques pour aspiration peropératoire.'
  },
  {
    id: 'c-22',
    name: 'Capillaires pour hématocrite (Avec ou sans héparine)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Tube de 100 capillaires', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tubes micro-capillaires en verre de précision calibrés pour micro-méthode hématocrite et centrifugation de paillasse.'
  },
  {
    id: 'c-23',
    name: 'Capuchons protecteurs pour thermomètre tympanique',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'hygiene',
    variants: [
      { label: 'Unité protectrice', price: 200 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Embout sonde jetable hygiénique sans latex ni BPA évitant la contamination croisée lors des prises thermiques auriculaires.'
  },
  {
    id: 'c-24',
    name: 'Casques jetables / Charlottes à clip plissées (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 charlottes', price: 3000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Charlotte accordéon en non-tissé polypropylène élastiquée respirante pour personnel soignant et industrie pharmaceutique.'
  },
  {
    id: 'c-25',
    name: 'Cathéter veineux périphérique (Cathlon) G18 à G26',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Unité stérile (G18 Vert, G20 Rose, G22 Bleu, G24 Jaune, G26 Violet)', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Cathéter intraveineux court stérile avec valve d\'injection et ailettes de fixation. Canule FEP radio-opaque atraumatique.'
  },
  {
    id: 'c-26',
    name: 'Champs opératoires stériles (Avec ou sans trou)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile 75 x 90 cm', price: 1200 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Champ opératoire stérile en matière bi-couche absorbante et film polyéthylène imperméable stérile pour petite et grande chirurgie.'
  },
  {
    id: 'c-27',
    name: 'Charlotte chirurgien couvrante',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité', price: 350 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Coiffe chirurgicale ergonomique en tissu non-tissé dense pour couverture totale de la chevelure en environnement stérile.'
  },
  {
    id: 'c-28',
    name: 'Clamp ombilical de Barr stérile',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'maternite',
    variants: [
      { label: 'Unité stérile', price: 150 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Pince à cordon ombilical stérile à crans de sécurité anti-réouverture pour clampage sécurisé à la délivrance néonatale.'
  },
  {
    id: 'c-29',
    name: 'Clamps de Kocher en plastique stérile jetable',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Pince hémostatique plastique stérile à crémaillère pour clampage de tubulures de perfusion, sondes et pansements.'
  },
  {
    id: 'c-30',
    name: 'Collecteur d\'aiguilles et objets perforants DASRI',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'hygiene',
    variants: [
      { label: 'Collecteur 3 à 5 Litres', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Boîte de sécurité imperforable jaune conforme norme NF X30-500 avec opercule de désolidarisation pour aiguilles et lames.'
  },
  {
    id: 'c-31',
    name: 'Compresses de gaze stériles 100% coton',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Pochette de 2 compresses (7.5 x 7.5 cm)', price: 250 },
      { label: 'Pochette de 2 compresses (10 x 10 cm)', price: 300 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Compresses de gaze hydrophile pur coton pliées 8 plis, 17 fils/cm², stériles et sans effilochage pour pansements et désinfection.'
  },
  {
    id: 'c-32',
    name: 'Compresses non stériles pur coton (10 x 10 cm, Sachet de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Sachet de 100 compresses', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Sachet de 100 compresses de gaze non stériles 10x10 cm pour soins généraux, désinfection cutanée et absorption clinique.'
  },
  {
    id: 'c-33',
    name: 'Coton hydrophile zig-zag chirurgical (500g)',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Paquet de 500 grammes', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Coton blanc 100% hydrophile blanchi sans chlore plié en accordéon zig-zag haute absorption pour usage médical et infirmier.'
  },
  {
    id: 'c-34',
    name: 'Couvre-chaussures / Surchaussures jetables (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 surchaussures', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Surchaussures en polyéthylène bleu gaufré avec élastique d\'ajustement cheville pour zones stériles, laboratoire et bloc.'
  },
  {
    id: 'c-35',
    name: 'Couteau de circoncision chirurgical jetable stérile',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile sous blister', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Lame chirurgicale profilée stérile dédiée aux actes de circoncision avec manche ergonomique antidérapant.'
  },
  {
    id: 'c-36',
    name: 'Écouvillons de prélèvement stériles en tube protecteur',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Unité stérile avec tige plastique', price: 150 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Écouvillon de prélèvement stérile en dacron/coton sur tige plastique dans tube protecteur étiqueté pour prélèvements bactériologiques.'
  },
  {
    id: 'c-37',
    name: 'Embouts de micropipette jaunes (200 µl - Sachet de 1000)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Sachet de 1000 embouts jaunes (20-200 µl)', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Embouts coniques universels en polypropylène vierge transparent de haute précision pour pipeteurs automatiques 20 à 200 µl.'
  },
  {
    id: 'c-38',
    name: 'Embouts de micropipette bleus (1000 µl - Sachet de 1000)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Sachet de 1000 embouts bleus (100-1000 µl)', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Cônes de pipetage universels bleus en polypropylène hydrophobe pour distribution précise de réactifs 100 à 1000 µl.'
  },
  {
    id: 'c-39',
    name: 'Embouts de micropipette blancs cristaux (10 µl - Sachet de 1000)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Sachet de 1000 embouts blancs (0.5-10 µl)', price: 7500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Micro-embouts cristal ultra-fins de haute précision pour micro-dosages enzymatiques, biologie moléculaire et micropipettes 0.5-10 µl.'
  },
  {
    id: 'c-40',
    name: 'Fil de suture Catgut chromé avec aiguille sertie',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte de 12 sachets (déc. 2/0, 3/0, 0, 1)', price: 1000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Suture chirurgicale résorbable d\'origine naturelle traitée aux sels de chrome pour réduction du temps de résorption.'
  },
  {
    id: 'c-41',
    name: 'Fil de suture Soie tressée noire avec aiguille',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Sachet stérile avec aiguille (déc. 2/0, 3/0, 0)', price: 800 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Suture non résorbable en soie naturelle tressée siliconée offrant une excellente tenue du nœud et maniabilité chirurgicale.'
  },
  {
    id: 'c-42',
    name: 'Fil de suture Nylon monofilament avec aiguille',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Sachet stérile avec aiguille (déc. 2/0, 3/0, 4/0)', price: 800 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Fil de suture synthétique non résorbable en polyamide monobrin pour fermeture cutanée esthétique et traumatologie.'
  },
  {
    id: 'c-43',
    name: 'Fil de suture Polyglactine 910 résorbable tressé (Vicryl)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Sachet stérile avec aiguille triangulaire ou ronde', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Suture synthétique tressée résorbable de référence pour plans profonds, chirurgie viscérale, gynécologie et césariennes.'
  },
  {
    id: 'c-44',
    name: 'Gants d\'examen en latex non poudrés (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 gants (Taille S)', price: 4000 },
      { label: 'Boîte de 100 gants (Taille M)', price: 4000 },
      { label: 'Boîte de 100 gants (Taille L)', price: 4000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Gants d\'examen en pur latex naturel non poudrés à surface texturée pour sensibilité tactile optimale et confort professionnel.'
  },
  {
    id: 'c-45',
    name: 'Gants d\'examen en latex poudrés (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 gants (Taille S)', price: 3500 },
      { label: 'Boîte de 100 gants (Taille M)', price: 3500 },
      { label: 'Boîte de 100 gants (Taille L)', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Gants médicaux d\'examen en latex légèrement poudrés à l\'amidon de maïs pour un gantage rapide même sur mains humides.'
  },
  {
    id: 'c-46',
    name: 'Gants d\'examen en nitrile bleu non poudrés (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'hygiene',
    variants: [
      { label: 'Boîte de 100 gants nitrile (Taille S)', price: 4500 },
      { label: 'Boîte de 100 gants nitrile (Taille M)', price: 4500 },
      { label: 'Boîte de 100 gants nitrile (Taille L)', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Gants de protection en nitrile synthétique sans latex hypoallergéniques, ultra-résistants aux produits chimiques et perforations.'
  },
  {
    id: 'c-47',
    name: 'Gants chirurgicaux stériles poudrés (Paire)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'chirurgie',
    variants: [
      { label: 'Paire stérile (Taille 6.5)', price: 450 },
      { label: 'Paire stérile (Taille 7.0)', price: 450 },
      { label: 'Paire stérile (Taille 7.5)', price: 450 },
      { label: 'Paire stérile (Taille 8.0)', price: 450 },
      { label: 'Paire stérile (Taille 8.5)', price: 450 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Gants de chirurgie stériles emballés sous portefeuille individuel stérile avec forme anatomique gauche/droite et manchette roulée.'
  },
  {
    id: 'c-48',
    name: 'Gants chirurgicaux stériles non poudrés (Paire)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'chirurgie',
    variants: [
      { label: 'Paire stérile non poudrée (Taille 6.5)', price: 550 },
      { label: 'Paire stérile non poudrée (Taille 7.0)', price: 550 },
      { label: 'Paire stérile non poudrée (Taille 7.5)', price: 550 },
      { label: 'Paire stérile non poudrée (Taille 8.0)', price: 550 },
      { label: 'Paire stérile non poudrée (Taille 8.5)', price: 550 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Gants d\'intervention chirurgicale stériles hypoallergéniques sans poudre pour limiter les risques de granulomes et d\'irritation.'
  },
  {
    id: 'c-49',
    name: 'Gants de gynécologie à manchette longue stériles (Paire)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    specialty: 'maternite',
    variants: [
      { label: 'Paire stérile manchette 45 cm', price: 900 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Gants gynéco-obstétricaux stériles à manchette montant jusqu\'au coude (45 cm) pour révision utérine et accouchement.'
  },
  {
    id: 'c-50',
    name: 'Gel de contact conducteur pour échographie et ECG',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon doseur 250 ml', price: 1500 },
      { label: 'Bidon économique 5 Litres', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Gel hypoallergénique hydrosoluble transparent non gras de haute conductivité acoustique pour sondes ultrasons et électrodes.'
  },
  {
    id: 'c-51',
    name: 'Gobelet stérile de recueil d\'urine / crachat (60 ml)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon stérile 60 ml avec bouchon à vis étanche', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 40,
    description: 'Pot de recueil stérile avec bouchon à vis hermétique rouge étanche et étiquette inscriptible pour ECBU et coproculture.'
  },
  {
    id: 'c-52',
    name: 'Lames de bistouri stériles en acier carbone (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte de 100 lames (N° 10, 11, 15, 20, 21, 22, 23, 24)', price: 5000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Lames chirurgicales tranchantes stériles emballées sous feuille d\'aluminium protectrice compatibles manches N° 3 et N° 4.'
  },
  {
    id: 'c-53',
    name: 'Lames porte-objet pour microscope à bord dépoli (Boîte de 50)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 50 lames dépolies', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Lames porte-objets en verre optique 26 x 76 mm à bords chanfreinés et zone dépolie inscriptible pour frottis et cytologie.'
  },
  {
    id: 'c-54',
    name: 'Lamelles couvre-objet carrées (22 x 22 mm, Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 lamelles 22x22 mm', price: 1200 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Lamelles couvre-objets ultrafines en verre borosilicaté neutre transparent pour observation microscopique entre lame et lamelle.'
  },
  {
    id: 'c-55',
    name: 'Lancettes de sécurité à rétraction automatique (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 lancettes de sécurité', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Lancettes à piqûre capillaire sécurisée avec rétraction automatique irréversible prévenant tout risque d\'AES pour le soignant.'
  },
  {
    id: 'c-56',
    name: 'Lunettes de protection médicale / Écran facial panoramique',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Unité lunettes étanches', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Lunettes-masque médicales transparentes avec aération indirecte antibuée et monture enveloppante étanche aux projections de fluides.'
  },
  {
    id: 'c-57',
    name: 'Lunettes à oxygène nasales avec tubulure 2m',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Unité Adulte tubulure étoilée', price: 800 },
      { label: 'Unité Pédiatrique tubulure étoilée', price: 800 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Canule nasale d\'oxygénothérapie avec embouts incurvés souples et tubulure cannelée anti-écrasement de 2 mètres.'
  },
  {
    id: 'c-58',
    name: 'Masque à oxygène simple avec élastique et tubulure',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Masque simple Adulte', price: 1200 },
      { label: 'Masque simple Enfant', price: 1200 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Masque d\'oxygénothérapie moyenne concentration en PVC transparent de qualité médicale avec pince-nez métallique réglable.'
  },
  {
    id: 'c-59',
    name: 'Masque à oxygène haute concentration avec réservoir',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Masque haute concentration avec ballon réservoir', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Masque sans réinhalation à ballon réservoir et valves unidirectionnelles délivrant une FiO2 élevée (80-100%) en urgence vitale.'
  },
  {
    id: 'c-60',
    name: 'Masque pour aérosolthérapie / Kit nébulisation complet',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Kit nébuliseur complet avec cuve et tubulure', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Ensemble masque aérosol avec chambre de nébulisation graduée 6 ml pour administration par inhalation de bronchodilatateurs.'
  },
  {
    id: 'c-61',
    name: 'Pansements adhésifs prédécoupés hypoallergéniques (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Boîte de 100 pansements assortis', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Pansements plastiques aérés avec compresse centrale non adhérente pour protection des petites plaies et points d\'injection.'
  },
  {
    id: 'c-62',
    name: 'Papier thermique pour électrocardiographe (Rouleau / Liasse)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'laboratoire',
    variants: [
      { label: 'Rouleau standard 50mm / 63mm / 80mm', price: 2500 },
      { label: 'Liasse pliée 110mm / 210mm A4', price: 5500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Papier d\'enregistrement thermique médical millimétré haute sensibilité pour tracés ECG 1, 3, 6 ou 12 canaux.'
  },
  {
    id: 'c-63',
    name: 'Pâte conductrice à électrodes EEG / ECG',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'laboratoire',
    variants: [
      { label: 'Tube de pâte conductrice 250g', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pâte adhésive et conductrice formulée pour assurer une impédance minimale lors d\'examens EEG, potentiels évoqués et ECG.'
  },
  {
    id: 'c-64',
    name: 'Bande toise souple pour nourrisson',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'maternite',
    variants: [
      { label: 'Bande de toise pédiatrique enroulable', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Ruban anthropométrique résistant et lavable gradué en millimètres pour mesure du périmètre crânien et taille des nourrissons.'
  },
  {
    id: 'c-65',
    name: 'Pissette plastique col de cygne graduée (500 ml)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon pissette 500 ml', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Flacon laveur souple en polyéthylène basse densité à col coudé pour distribution précise d\'eau distillée et solvants.'
  },
  {
    id: 'c-66',
    name: 'Poche de recueil d\'urine vidangeable avec valve antiretour (2L)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Poche à urine 2 Litres vidangeable', price: 450 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Poche à urine stérile graduée de 2000 ml avec tubulure renforcée 90 cm, valve de vidange rapide et clapet antiretour.'
  },
  {
    id: 'c-67',
    name: 'Poche de recueil d\'urine pédiatrique adhésive stérile',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'maternite',
    variants: [
      { label: 'Unité stérile Fille ou Garçon', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 40,
    description: 'Collecteur d\'urine pédiatrique stérile avec mousse adhésive hypoallergénique anatomique pour prélèvement chez le nourrisson.'
  },
  {
    id: 'c-68',
    name: 'Prolongateur de perfusion stérile Luer Lock',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Prolongateur 50 cm / 100 cm / 150 cm', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Ligne de perfusion intermédiaire stérile transparente avec embouts Luer-Lock mâle/femelle et clamp de débit.'
  },
  {
    id: 'c-69',
    name: 'Rasoirs jetables médicaux double tranchant (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte de 100 rasoirs', price: 6000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Rasoir de préparation préopératoire à double tranchant avec peigne protecteur pour dépilation rapide sans micro-coupures.'
  },
  {
    id: 'c-70',
    name: 'Robinet à trois voies stérile pour perfusion Luer Lock',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Unité stérile 3 voies', price: 400 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 40,
    description: 'Robinet multi-voies stérile résistant aux lipides avec repères d\'orientation et 3 connecteurs Luer-Lock de sécurité.'
  },
  {
    id: 'c-71',
    name: 'Sacs poubelle DASRI déchets d\'activités de soins (Jaune / Noir)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'hygiene',
    variants: [
      { label: 'Rouleau de 25 sacs DASRI 50 Litres', price: 2500 },
      { label: 'Rouleau de 25 sacs DASRI 100 Litres', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Sacs étanches renforcés à soudure étanche et marquage biohazard réglementaire pour tri et élimination des déchets de soins.'
  },
  {
    id: 'c-72',
    name: 'Seringue 1 ml tuberculine / insuline stérile avec aiguille (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 100 seringues 1 ml avec aiguille 26G/27G', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Seringue 1 ml 3 pièces transparente à graduation ultra-précise 0.01 ml avec aiguille fine sertie pour intradermoréaction et insuline.'
  },
  {
    id: 'c-73',
    name: 'Seringue 2 ml / 2.5 ml 3 pièces avec aiguille stérile (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 100 seringues 2 ml/2.5 ml', price: 4000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Seringue 2.5 ml stérile à piston souple avec aiguille hypodermique 21G/23G pour injection intramusculaire et sous-cutanée.'
  },
  {
    id: 'c-74',
    name: 'Seringue 5 ml 3 pièces avec aiguille stérile (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 100 seringues 5 ml', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Seringue 5 ml 3 pièces à glissement régulier avec aiguille montée 21G x 1.5" pour injections et prélèvements sanguins.'
  },
  {
    id: 'c-75',
    name: 'Seringue 10 ml 3 pièces avec aiguille stérile (Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 100 seringues 10 ml', price: 5500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Seringue 10 ml stérile à graduation claire et butée d\'arrêt avec aiguille 21G pour dilution et administration médicamenteuse.'
  },
  {
    id: 'c-76',
    name: 'Seringue 20 ml 3 pièces sans ou avec aiguille (Boîte de 50)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Boîte de 50 seringues 20 ml', price: 5000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Seringue 20 ml stérile à embout Luer excentré pour préparation d\'antibiotiques, perfusions et ponctions de volumes.'
  },
  {
    id: 'c-77',
    name: 'Seringue 50 ml / 60 ml pour gavage ou embout cathéter',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile 50/60 ml embout conique large', price: 800 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Grande seringue stérile 60 ml à embout cathéter conique pour alimentation entérale, lavage vésical et aspiration chirurgicale.'
  },
  {
    id: 'c-78',
    name: 'Sonde d\'aspiration trachéale stérile (CH 06 à CH 18)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile (CH 06 à CH 18)', price: 400 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 25,
    description: 'Sonde d\'aspiration bronchique souple avec raccord muni d\'un regard de contrôle digital du vide d\'aspiration.'
  },
  {
    id: 'c-79',
    name: 'Sonde gastrique de Levin stérile (CH 10 à CH 18)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile (CH 10 à CH 18)', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Sonde nasogastrique en PVC thermo-sensible avec 4 yeux latéraux et ligne radio-opaque pour décompression ou tubage gastrique.'
  },
  {
    id: 'c-80',
    name: 'Sonde d\'alimentation entérale pédiatrique stérile',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'maternite',
    variants: [
      { label: 'Unité stérile CH 04 / CH 06 / CH 08', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Micro-sonde de gavage néonatal en polyuréthane ou silicone souple avec repères centimétriques et bouchon étanche.'
  },
  {
    id: 'c-81',
    name: 'Sonde vésicale de Foley 2 voies stérile en silicone ou latex (CH 12 à 24)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile ballonnet 10-30 ml (CH 12 à 24)', price: 900 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 25,
    description: 'Sonde urinaire à demeure avec ballonnet gonflable symétrique et valve pour raccord seringue Luer pour sondage vésical continu.'
  },
  {
    id: 'c-82',
    name: 'Sonde vésicale de Foley 3 voies pour lavage vésical continu (CH 18 à 24)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile 3 voies pour irrigation (CH 18 à 24)', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Sonde urinaire 3 voies permettant l\'irrigation et le drainage vésical post-opératoire continu avec bocal de perfusion.'
  },
  {
    id: 'c-83',
    name: 'Sonde urinaire de Nelaton stérile droite (CH 08 à 18)',
    category: 'Consommables médicaux',
    subcategory: 'Sondes et oxygène',
    specialty: 'chirurgie',
    variants: [
      { label: 'Unité stérile sans ballonnet (CH 08 à 18)', price: 400 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Sonde d\'évacuation urinaire intermittente droite à extrémité distale ronde fermée et deux orifices latéraux sans ballonnet.'
  },
  {
    id: 'c-84',
    name: 'Sparadrap microperforé plastique transparent imperméable',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 2.5 cm x 9 m', price: 1200 },
      { label: 'Rouleau 5 cm x 9 m', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Sparadrap occlusif plastique microperforé sécable à la main bidirectionnellement pour fixation de pansements et tubulures.'
  },
  {
    id: 'c-85',
    name: 'Sparadrap microporeux non-tissé hypoallergénique (Type Micropore)',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 2.5 cm x 9 m', price: 1200 },
      { label: 'Rouleau 5 cm x 9 m', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Adhésif chirurgical blanc papier non tissé respirant haute tolérance cutanée pour peaux fragiles, pansements fréquents et pédiatrie.'
  },
  {
    id: 'c-86',
    name: 'Sparadrap tissu / toile haute adhérence résistant',
    category: 'Consommables médicaux',
    subcategory: 'Pansements',
    specialty: 'pansements',
    variants: [
      { label: 'Rouleau 5 cm x 5 m', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Ruban adhésif médical en tissu résistant indéchirable pour maintien d\'attelles, sondes lourdes et pansements compressifs.'
  },
  {
    id: 'c-87',
    name: 'Spéculum vaginal jetable stérile transparent (S, M, L)',
    category: 'Consommables médicaux',
    subcategory: 'Chirurgie et examen',
    specialty: 'maternite',
    variants: [
      { label: 'Unité stérile (Taille S / Petit)', price: 450 },
      { label: 'Unité stérile (Taille M / Moyen)', price: 450 },
      { label: 'Unité stérile (Taille L / Grand)', price: 450 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Spéculum gynécologique stérile en polystyrène cristal transparent avec vis de blocage à crémaillère pour examen du col utérin.'
  },
  {
    id: 'c-88',
    name: 'Tablier de protection jetable en polyéthylène (Paquet de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tenues et champs',
    specialty: 'hygiene',
    variants: [
      { label: 'Paquet de 100 tabliers étanches', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tabliers étanches lisses avec tour de cou et liens latéraux à la taille protégeant la tenue contre éclaboussures et liquides biologiques.'
  },
  {
    id: 'c-89',
    name: 'Trousse / Tubulure de perfusion stérile avec prise d\'air',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'perfusion',
    variants: [
      { label: 'Unité stérile avec régulateur de débit et filtre', price: 300 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 50,
    description: 'Perfuseur de soluté stérile par gravité avec perforateur à prise d\'air obturable, chambre compte-gouttes filtrante et molette précise.'
  },
  {
    id: 'c-90',
    name: 'Tubulure pour transfusion sanguine avec filtre 200 µm stérile',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    specialty: 'urgence',
    variants: [
      { label: 'Unité stérile avec chambre de transfusion filtrante', price: 600 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Transfuseur de sang stérile avec filtre à micro-agrégats de 200 microns évitant le passage de caillots lors des transfusions de CGR.'
  },
  {
    id: 'c-91',
    name: 'Tubes de prélèvement sous vide EDTA K3 (Violet, 4 ml - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes EDTA K3 4 ml', price: 7000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Tubes de sang sous vide avec anticoagulant EDTA K3 pour numération formule sanguine (NFS), groupage et charge virale.'
  },
  {
    id: 'c-92',
    name: 'Tubes sous vide Sec avec activateur de coagulation (Rouge, 4/5 ml - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes secs rouges 5 ml', price: 7000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Tubes de prélèvement sous vide sans anticoagulant avec silice micronisée pour obtention rapide du sérum en biochimie et sérologie.'
  },
  {
    id: 'c-93',
    name: 'Tubes sous vide Gel Séparateur + Activateur (Jaune, 5 ml - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes gel jaune 5 ml', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Tubes sous vide avec gel polymère inerte assurant une barrière physique étanche et stable entre le caillot et le sérum après centrifugation.'
  },
  {
    id: 'c-94',
    name: 'Tubes sous vide Héparinate de Lithium (Vert, 4 ml - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes héparine verte 4 ml', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tubes de prélèvement sous vide pour analyses de biochimie d\'urgence sur plasma hépariné et ionogramme sanguin.'
  },
  {
    id: 'c-95',
    name: 'Tubes sous vide Citrate de Sodium 3.2% (Bleu / Noir - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes Citrate coagulation (Bleu)', price: 8000 },
      { label: 'Boîte de 100 tubes Citrate VS (Noir)', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tubes sous vide calibrés au ratio 1:9 de citrate de sodium pour hémostase (TP, TCA, Fibrinogène) ou vitesse de sédimentation (VS).'
  },
  {
    id: 'c-96',
    name: 'Tubes sous vide Fluorure / Oxalate glycémie (Gris, 4 ml - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tubes gris glycémie 4 ml', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tubes de sang sous vide avec inhibiteur de la glycolyse (fluorure de sodium) pour dosage précis de la glycémie et du lactate.'
  },
  {
    id: 'c-97',
    name: 'Corps de pompe / Support prélève-tube pour tubes sous vide',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Unité réutilisable ou jetable', price: 250 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 30,
    description: 'Porte-tube cylindrique en polypropylène compatible avec aiguilles à double biseau et aiguilles à ailettes sous vide.'
  },
  {
    id: 'c-98',
    name: 'Aiguilles de prélèvement multiple sous vide (21G, 22G - Boîte de 100)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 aiguilles sous vide 21G ou 22G', price: 5500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Aiguilles stériles à double biseau avec manchon caoutchouc protecteur permettant le prélèvement séquentiel de plusieurs tubes.'
  },
  {
    id: 'c-99',
    name: 'Unité de prélèvement à ailettes avec tubulure sous vide (21G, 23G)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Unité stérile 21G ou 23G avec raccord luer', price: 450 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 25,
    description: 'Dispositif de prélèvement épicrânien stérile à ailettes souples avec tubulure 19 cm pour veines fragiles ou pédiatrie.'
  },
  {
    id: 'c-100',
    name: 'Urinex / Bocal de recueil d\'urine des 24 heures (2L ou 2.5L)',
    category: 'Consommables médicaux',
    subcategory: 'Tubes et laboratoire',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bocal rigide gradué 2.5 Litres avec poignée', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Récipient opaque en polyéthylène avec poignée de transport, col large et bouchon fileté hermétique pour protéinurie et clairance des 24h.'
  },

  // =========================================================================
  // 2. TESTS RAPIDES (TdR) & AUTRES (49 RÉFÉRENCES)
  // =========================================================================
  {
    id: 'tdr-01',
    name: 'Bandelettes de glycémie On Call Plus (Boîte de 50)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 50 bandelettes + puce', price: 12500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Bandelettes réactives pour lecteur On Call Plus nécessitant 1 µl de sang avec résultat rapide en 10 secondes.'
  },
  {
    id: 'tdr-02',
    name: 'Bandelettes de glycémie Accu-Chek Active (Boîte de 50)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 50 bandelettes d\'origine', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Bandelettes de mesure de glycémie pour appareils Roche Accu-Chek Active avec zone de dosage colorimétrique de contrôle visuel.'
  },
  {
    id: 'tdr-03',
    name: 'Bandelettes de glycémie Accu-Chek Instant (Boîte de 50)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 50 bandelettes Instant', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Bandelettes réactives avec fente d\'aspiration capillaire ultra-large pour lecteur de glycémie Roche Accu-Chek Instant.'
  },
  {
    id: 'tdr-04',
    name: 'Bandelettes urinaires 10 paramètres (Boîte de 100)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 bandelettes 10P', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Bandelettes d\'analyse urinaire multiparamétrique : Leucocytes, Nitrites, Urobilinogène, Protéines, pH, Sang, Densité, Cétones, Bilirubine, Glucose.'
  },
  {
    id: 'tdr-05',
    name: 'Bandelettes urinaires 4 paramètres (Boîte de 100)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 bandelettes 4P', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Bandelettes urinaires de dépistage 4 paramètres : Protéines, Glucose, pH et Sang dans les urines.'
  },
  {
    id: 'tdr-06',
    name: 'Bandelettes urinaires 2 paramètres (Glucose + Protéines - Boîte de 100)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 bandelettes 2P', price: 5000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Bandelettes réactives pour dépistage rapide de la glycosurie et de la protéinurie chez la femme enceinte et patients diabétiques.'
  },
  {
    id: 'tdr-07',
    name: 'Bandelettes réactives pour Hémoglobinomètre Mission Plus Hb (Boîte de 50)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 50 bandelettes + puce calibrée', price: 25000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Bandelettes micro-cuvettes réactives de dosage instantané du taux d\'hémoglobine totale (Hb) et hématocrite calculé (Hct).'
  },
  {
    id: 'tdr-08',
    name: 'Test Rapide Paludisme / Malaria Pf Antigène (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests cassettes avec diluant', price: 10000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Test immunochromatographique rapide de détection qualitative de la protéine HRP-2 de Plasmodium falciparum sur sang total.'
  },
  {
    id: 'tdr-09',
    name: 'Test Rapide Paludisme / Malaria Pf/Pan Combo (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests Pf/Pan avec diluant', price: 12500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Test différentiel rapide détectant à la fois P. falciparum (HRP-2) et les autres espèces plasmodiales Pan (P. vivax, ovale, malariae).'
  },
  {
    id: 'tdr-10',
    name: 'Test Rapide VIH 1&2 / HIV 1/2 Determine (Boîte de 100)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 100 tests Determine Alere/Abbott', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test immunologique rapide de première intention de référence OMS pour le dépistage qualitatif des anticorps anti-VIH-1 et VIH-2.'
  },
  {
    id: 'tdr-11',
    name: 'Test Rapide VIH 1&2 Cassette avec compte-gouttes (Boîte de 40)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 40 tests cassettes + tampon', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Cassettes de dépistage immunochromatographique des anticorps dirigés contre les virus de l\'immunodéficience humaine types 1 et 2.'
  },
  {
    id: 'tdr-12',
    name: 'Test Rapide Hépatite B HBsAg Cassette (Boîte de 40)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 40 cassettes HBsAg', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Test rapide sur sang/sérum/plasma pour la détection qualitative précoce de l\'antigène de surface du virus de l\'hépatite B (Ag HBs).'
  },
  {
    id: 'tdr-13',
    name: 'Test Rapide Hépatite C Anti-HCV Cassette (Boîte de 40)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 40 cassettes Anti-HCV', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Dispositif de dépistage rapide des anticorps spécifiques dirigés contre le virus de l\'hépatite C (VHC).'
  },
  {
    id: 'tdr-14',
    name: 'Test Rapide Syphilis TP Cassette (Boîte de 40)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 40 cassettes Treponema Pallidum', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Test sérologique tréponémique rapide sur sang, sérum ou plasma pour détection des anticorps anti-Treponema pallidum.'
  },
  {
    id: 'tdr-15',
    name: 'Test Rapide Combo VIH 1/2 + Syphilis TP Duo (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests combinés Duo', price: 25000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Test combiné simultané 2-en-1 préconisé en consultation prénatale (CPN) pour dépister conjointement le VIH et la syphilis.'
  },
  {
    id: 'tdr-16',
    name: 'Test Rapide de Grossesse HCG Cassette (Boîte de 40)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'maternite',
    variants: [
      { label: 'Boîte de 40 cassettes HCG avec pipette', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Test de grossesse urinaire haute sensibilité (25 mUI/ml) en format cassette individuelle avec résultat en 3 à 5 minutes.'
  },
  {
    id: 'tdr-17',
    name: 'Test Rapide de Grossesse HCG Bandelette (Boîte de 50)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'maternite',
    variants: [
      { label: 'Boîte de 50 bandelettes HCG', price: 6000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Bandelettes réactives de détection de l\'hormone gonadotrophine chorionique humaine dans l\'urine pour diagnostic précoce de grossesse.'
  },
  {
    id: 'tdr-18',
    name: 'Test Rapide Chlamydia Trachomatis Antigène (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests avec réactifs d\'extraction', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test rapide par écouvillonnage endocervical ou urétral pour la détection qualitative directe de l\'antigène Chlamydia trachomatis.'
  },
  {
    id: 'tdr-19',
    name: 'Test Rapide Gonorrhée / Neisseria Gonorrhoeae (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests + tubes d\'extraction', price: 25000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test immunochromatographique rapide pour le diagnostic présomptif d\'infection à gonocoque sur prélèvements génitaux.'
  },
  {
    id: 'tdr-20',
    name: 'Test Rapide Toxoplasmose IgG/IgM Combo (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests Toxoplasma gondii', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Différenciation rapide des anticorps IgG (immunité acquise) et IgM (infection récente) dirigés contre Toxoplasma gondii.'
  },
  {
    id: 'tdr-21',
    name: 'Test Rapide Rubéole IgG/IgM Combo (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 cassettes Rubella', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Détection et différenciation des anticorps IgG et IgM contre le virus de la rubéole dans le cadre du bilan préconceptionnel et prénatal.'
  },
  {
    id: 'tdr-22',
    name: 'Test Rapide Cytomégalovirus CMV IgG/IgM (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests CMV', price: 26000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Diagnostic sérologique rapide des anticorps IgG et IgM anti-cytomégalovirus sur sérum, plasma ou sang total.'
  },
  {
    id: 'tdr-23',
    name: 'Test Rapide Helicobacter Pylori Anticorps sérique (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 cassettes H. Pylori Ac', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Recherche sérologique rapide des anticorps anti-H. pylori pour l\'exploration des ulcères gastro-duodénaux et gastrites.'
  },
  {
    id: 'tdr-24',
    name: 'Test Rapide Helicobacter Pylori Antigène fécal (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests Ag selles avec flacons pré-remplis', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Détection directe non invasive de l\'antigène fécal d\'H. pylori confirmant l\'infection active et le contrôle post-éradication.'
  },
  {
    id: 'tdr-25',
    name: 'Test Rapide Fièvre Typhoïde Salmonella IgG/IgM (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 cassettes Typhoid', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Détection qualitative rapide des anticorps IgG et IgM spécifiques de Salmonella typhi pour le diagnostic des fièvres entériques.'
  },
  {
    id: 'tdr-26',
    name: 'Test Rapide Rotavirus + Adénovirus fécal Combo (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'maternite',
    variants: [
      { label: 'Boîte de 25 tests gastro-entérite virale', price: 26000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Diagnostic rapide différentiel étiologique des diarrhées aiguës virales de l\'enfant et du nourrisson sur échantillon de selle.'
  },
  {
    id: 'tdr-27',
    name: 'Test Rapide Sang occulte dans les selles FOB (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests hémoglobine humaine fécale', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Test immunologique spécifique de l\'hémoglobine humaine sans régime alimentaire préalable pour le dépistage des saignements digestifs.'
  },
  {
    id: 'tdr-28',
    name: 'Test Rapide Troponine I cardiaque cTnI (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'urgence',
    variants: [
      { label: 'Boîte de 25 tests d\'urgence cTnI', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Marqueur de nécrose myocardique pour le diagnostic précoce de l\'infarctus du myocarde (SCA) aux urgences.'
  },
  {
    id: 'tdr-29',
    name: 'Test Rapide D-Dimères quantitatif / semi-quantitatif (Boîte de 10)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'urgence',
    variants: [
      { label: 'Boîte de 10 tests D-Dimères', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test rapide d\'exclusion de la thrombose veineuse profonde (TVP) et de l\'embolie pulmonaire (EP) chez le patient symptomatique.'
  },
  {
    id: 'tdr-30',
    name: 'Test Rapide C-Réactive Protéine CRP semi-quantitative (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests seuils 10-40-80 mg/L', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Évaluation rapide du syndrome inflammatoire aigu et différentiation bactérienne/virale lors de fièvres inexpliquées.'
  },
  {
    id: 'tdr-31',
    name: 'Test Rapide PSA Antigène prostatique spécifique (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 cassettes PSA seuil 4 ng/ml', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dépistage d\'orientation clinique de l\'hypertrophie bénigne de la prostate et surveillance prostatique masculine.'
  },
  {
    id: 'tdr-32',
    name: 'Test Rapide Microalbuminurie semi-quantitative (Boîte de 25)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Boîte de 25 tests urinaires micro-albumine', price: 25000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dépistage précoce de la néphropathie débutante chez les patients hypertendus et diabétiques de type 1 ou 2.'
  },
  {
    id: 'tdr-33',
    name: 'Test Rapide Multi-Drogues urinaire (Panel 5 ou 10 paramètres)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Test cassette multi-drogues unité', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Dépistage instantané dans les urines des principales substances : THC/Cannabis, Cocaïne, Opiacés, Amphétamines, Benzodiazépines.'
  },
  {
    id: 'tdr-34',
    name: 'Sérums-tests de groupage sanguin ABO + Rhésus (Kit Anti-A, Anti-B, Anti-AB, Anti-D)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret complet 4 flacons x 10 ml', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Anticorps monoclonaux prêts à l\'emploi pour détermination directe sur plaque ou en tube des antigènes érythrocytaires ABO et Rh (D).'
  },
  {
    id: 'tdr-35',
    name: 'Sérum Anti-D seul pour détermination du Rhésus (Flacon 10 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon compte-gouttes 10 ml', price: 7500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactif monoclonal Anti-D (Rh1) pour confirmation du facteur Rhésus positif ou négatif en immuno-hématologie transfusionnelle.'
  },
  {
    id: 'tdr-36',
    name: 'Sérum Anti-A seul pour groupage érythrocytaire (Flacon 10 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon compte-gouttes 10 ml (Bleu)', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactif monoclonal Anti-A coloré en bleu pour identification spécifique de l\'antigène A du système ABO.'
  },
  {
    id: 'tdr-37',
    name: 'Sérum Anti-B seul pour groupage érythrocytaire (Flacon 10 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon compte-gouttes 10 ml (Jaune)', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactif monoclonal Anti-B coloré en jaune pour identification spécifique de l\'antigène B du système ABO.'
  },
  {
    id: 'tdr-38',
    name: 'Sérum Anti-AB seul pour groupage érythrocytaire (Flacon 10 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon compte-gouttes 10 ml (Incolore)', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactif monoclonal Anti-AB permettant la détection des sous-groupes faibles de l\'antigène A ou B.'
  },
  {
    id: 'tdr-39',
    name: 'RPR Carbone Test Syphilis non tréponémique (Kit 100 déterminations)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit 100 tests complet avec cartes et agitateur', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test d\'agglutination sur carte pour le diagnostic sérologique et le suivi de l\'efficacité thérapeutique de la syphilis.'
  },
  {
    id: 'tdr-40',
    name: 'TPHA Test Syphilis hémagglutination tréponémique (100 déterminations)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit 100 tests complet avec hématies sensibilisées', price: 38000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test de micro-hémagglutination passive pour la confirmation spécifique et le titrage des anticorps dirigés contre Treponema pallidum.'
  },
  {
    id: 'tdr-41',
    name: 'Widal et Félix Réactifs Antigéniques Salmonellose (Kit complet O, H, AO, BO)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit complet de sérodiagnostic Widal', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Suspensions antigéniques bactériennes pour sérodiagnostic de la fièvre typhoïde et des fièvres paratyphoïdes A et B.'
  },
  {
    id: 'tdr-42',
    name: 'Réactif de Drabkin pour dosage de l\'hémoglobine totale',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon pour reconstitution 1 Litre', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution pour méthode internationale de référence à la cyanméthémoglobine lue au spectrophotomètre à 540 nm.'
  },
  {
    id: 'tdr-43',
    name: 'Kit pour Électrophorèse de l\'hémoglobine (Tampon + Révélateur)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit complet pour acétate de cellulose', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactifs pour séparation et identification des variants d\'hémoglobine (HbA, HbS drépanocytaire, HbC, HbF) à pH alcalin.'
  },
  {
    id: 'tdr-44',
    name: 'Test d\'Emmel / Réactif Métabisulfite de sodium pour falciformation',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon réactif d\'induction de falciformation', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Test microscopique de désoxygénation in vitro mettant en évidence la falciformation des hématies drépanocytaires.'
  },
  {
    id: 'tdr-45',
    name: 'Papier buvard spécial test de Guthrie / Buvards de prélèvement néonatal',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Paquet de 50 buvards calibrés', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Cartes buvards normalisées en coton pour recueil de gouttes de sang capillaire au talon (DBS) pour dépistages néonatals.'
  },
  {
    id: 'tdr-46',
    name: 'Huile à immersion pour microscopie optique (Flacon 100 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon compte-gouttes 100 ml', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Huile minérale synthétique d\'indice de réfraction calibré n=1.518 pour objectif microscope x100 à immersion.'
  },
  {
    id: 'tdr-47',
    name: 'Huile à immersion pour microscopie optique grand conditionnement (500 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon laboratoire 500 ml', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Flacon économique pour laboratoires d\'analyses à haute cadence d\'examens parasitologiques (Goutte épaisse) et bactériologiques.'
  },
  {
    id: 'tdr-48',
    name: 'Liquide de Turk pour numération microscopique des leucocytes (Flacon 500 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon 500 ml prêt à l\'emploi', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution hypotonique d\'acide acétique et bleu de gentiane lysant les hématies et colorant le noyau des globules blancs en cellule de Malassez.'
  },
  {
    id: 'tdr-49',
    name: 'Liquide de Hayem pour numération microscopique des hématies (Flacon 500 ml)',
    category: 'Tests Rapides (TdR) & Autres',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon 500 ml prêt à l\'emploi', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution isotonique conservatrice empêchant l\'agrégation et l\'hémolyse pour numération manuelle des globules rouges.'
  },

  // =========================================================================
  // 3. BIOCHIMIE & MARQUEURS (38 RÉFÉRENCES)
  // =========================================================================
  {
    id: 'bio-01',
    name: 'Acide urique réactif Monlabtest / Biolab (Kit biochimie)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret réactif enzymatique Uricase-POD', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage enzymatique colorimétrique de l\'acide urique pour le suivi de la goutte et de l\'hyperuricémie rénale.'
  },
  {
    id: 'bio-02',
    name: 'Albumine réactif colorimétrique au Vert de Bromocrésol',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon réactif BCG liquide', price: 14000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage colorimétrique direct de l\'albumine sérique dans l\'exploration de la fonction hépatique et du statut nutritionnel.'
  },
  {
    id: 'bio-03',
    name: 'Amylase réactif enzymatique cinétique',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret cinétique UV CNPG3', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Mesure de l\'activité enzymatique de l\'alpha-amylase pour le diagnostic des pancréatites aiguës et douleurs abdominales.'
  },
  {
    id: 'bio-04',
    name: 'Transaminases ASAT / GOT réactif cinétique UV IFCC',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret ASAT/GOT IFCC liquide', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Détermination cinétique UV de l\'aspartate aminotransférase dans le bilan hépatique, cardiaque et musculaire.'
  },
  {
    id: 'bio-05',
    name: 'Transaminases ALAT / GPT réactif cinétique UV IFCC',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret ALAT/GPT IFCC liquide', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage cinétique de l\'alanine aminotransférase, enzyme spécifique de la cytolyse hépatique (hépatites, stéatose).'
  },
  {
    id: 'bio-06',
    name: 'Bilirubine Totale réactif colorimétrique (DMSO / Jendrassik)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Bilirubine Totale', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Évaluation des ictères, de l\'hémolyse et des pathologies biliaires et hépatiques par diazotation.'
  },
  {
    id: 'bio-07',
    name: 'Bilirubine Directe / Conjuguée réactif colorimétrique',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Bilirubine Directe', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage spécifique de la fraction conjuguée dans l\'exploration des cholestases et ictères rétentionnels.'
  },
  {
    id: 'bio-08',
    name: 'Bilirubine Totale + Directe Kit combiné biochimie',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret combiné Totale + Directe', price: 26000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Kit complet deux paramètres pour exploration exhaustive du métabolisme de la bilirubine adulte et néonatale.'
  },
  {
    id: 'bio-09',
    name: 'Calcium sérique réactif colorimétrique (Arsenazo III)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon réactif Calcium liquide', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Méthode directe stable au réactif Arsenazo III sans déprotéinisation pour l\'exploration phospho-calcique.'
  },
  {
    id: 'bio-10',
    name: 'Cholestérol Total réactif enzymatique CHOD-PAP',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Cholestérol Total liquide', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage enzymatique de routine pour le bilan lipidique et l\'évaluation du risque cardiovasculaire.'
  },
  {
    id: 'bio-11',
    name: 'Cholestérol HDL direct réactif sans précipitation',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret HDL direct 2 réactifs', price: 32000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Mesure directe du cholestérol des lipoprotéines de haute densité (bon cholestérol) sans étape de centrifugation préalable.'
  },
  {
    id: 'bio-12',
    name: 'Cholestérol LDL direct réactif sans précipitation',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret LDL direct 2 réactifs', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Mesure directe sélective des LDL sans recours à la formule de Friedewald, applicable même en présence de triglycérides élevés.'
  },
  {
    id: 'bio-13',
    name: 'Créatine Kinase Totale CK-NAC réactif cinétique UV',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret CK-NAC cinétique', price: 32000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Enzyme musculaire de référence dans le dépistage de la rhabdomyolyse, myopathies et traumatismes musculaires.'
  },
  {
    id: 'bio-14',
    name: 'Créatine Kinase fraction CK-MB réactif immunoinhibition',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret CK-MB cinétique UV', price: 38000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Fraction spécifique du myocarde pour la surveillance cardiologique et la stratification du syndrome coronarien.'
  },
  {
    id: 'bio-15',
    name: 'Chlore / Chlorures réactif colorimétrique au Thiocyanate',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Chlorures liquide', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Paramètre clé de l\'ionogramme sanguin et urinaire pour l\'évaluation de l\'équilibre acido-basique et du trou anionique.'
  },
  {
    id: 'bio-16',
    name: 'Créatinine réactif cinétique Jaffé Monlabtest / Biolab',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Créatinine cinétique bicomposant', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Méthode cinétique de Jaffé compensée pour l\'évaluation de la clairance rénale et du débit de filtration glomérulaire (DFG).'
  },
  {
    id: 'bio-17',
    name: 'Créatinine 2X Ml PROMED (Flacon réactif)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Présentation PROMED (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Réactif de créatinine gamme PROMED pour automates et spectrophotomètres de laboratoire. Prix disponible sur demande / proforma.'
  },
  {
    id: 'bio-18',
    name: 'CRP C-Réactive Protéine biochimie turbidimétrique haute sensibilité',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret CRP turbidimétrie latex', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage quantitatif précis de la protéine C-réactive sur automate de biochimie pour quantification de l\'inflammation.'
  },
  {
    id: 'bio-19',
    name: 'Fer sérique + TIBC (Capacité totale de fixation) Kit complet',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit complet Fer + TIBC à la Ferrozine', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Bilan martial complet pour le diagnostic différentiel des anémies ferripriprives et surcharges hémochromatosiques.'
  },
  {
    id: 'bio-20',
    name: 'Ferritine réactif turbidimétrique au latex pour automate',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Ferritine immunoturbidimétrie', price: 48000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage quantitatif précis des réserves corporelles en fer par méthode immunoturbidimétrique automatisable.'
  },
  {
    id: 'bio-21',
    name: 'Gamma-GT réactif enzymatique cinétique Szasz IFCC',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret GGT liquide', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Marqueur sensible de l\'obstruction biliaire, de la cholestase et de l\'induction enzymatique hépatique médicamenteuse/toxique.'
  },
  {
    id: 'bio-22',
    name: 'Glucose réactif enzymatique GOD-PAP Monlabtest / Biolab',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Glucose GOD-PAP liquide', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Dosage colorimétrique à la glucose-oxydase de référence pour glycémie veineuse de laboratoire et épreuves d\'hyperglycémie provoquée.'
  },
  {
    id: 'bio-23',
    name: 'Glucose 5X100 Ml PROMED (Kit grand volume)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Pack 5 x 100 ml PROMED (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Conditionnement grand volume PROMED de réactif glucose GOD-PAP pour laboratoires d\'analyses à fort débit. Sur devis.'
  },
  {
    id: 'bio-24',
    name: 'Hémoglobine Glyquée HbA1c réactif turbidimétrique pour biochimie',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit HbA1c complet avec lysant et calibrateurs', price: 55000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Suivi de l\'équilibre glycémique moyen des 3 derniers mois chez les patients diabétiques conforme aux normes NGSP/IFCC.'
  },
  {
    id: 'bio-25',
    name: 'LDH Lactate Déshydrogénase réactif cinétique UV',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret LDH IFCC', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Indicateur général de destruction tissulaire, d\'hémolyse intramédullaire et de suivi en oncologie.'
  },
  {
    id: 'bio-26',
    name: 'Lipase réactif enzymatique cinétique haute spécificité',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Lipase colorimétrique cinétique', price: 38000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Marqueur de premier plan pour le diagnostic précoce et spécifique des pancréatites aiguës avec persistance prolongée.'
  },
  {
    id: 'bio-27',
    name: 'Magnésium réactif colorimétrique au Bleu de Xylidyl',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Magnésium sans déprotéinisation', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Bilan ionique dans les troubles neuromusculaires, crampes, tétanie et réanimation électrolytique.'
  },
  {
    id: 'bio-28',
    name: 'Phosphatase Alcaline PAL DEA cinétique IFCC',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret PAL tampon DEA', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Exploration conjointe des hépatopathies cholestatiques et du remodelage osseux (rachitisme, métastases ostéolytiques).'
  },
  {
    id: 'bio-29',
    name: 'Phosphore inorganique / Phosphates réactif UV au phosphomolybdate',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Phosphore UV liquide', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dosage couplé au calcium pour explorer les désordres parathyroïdiens et l\'insuffisance rénale chronique.'
  },
  {
    id: 'bio-30',
    name: 'Protéines Totales sériques réactif colorimétrique du Biuret',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon réactif du Biuret prêt à l\'emploi', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Évaluation rapide de la protidémie totale, des dysprotéinémies et du rapport albumine/globulines.'
  },
  {
    id: 'bio-31',
    name: 'Protéines Urinaires & LCR au Rouge de Pyrogallol',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret microprotéinurie / LCR', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Méthode très sensible adaptée aux faibles concentrations en protéines dans le liquide céphalo-rachidien et les urines.'
  },
  {
    id: 'bio-32',
    name: 'Potassium réactif turbidimétrique / enzymatique sans déprotéinisation',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Potassium liquide', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Paramètre fondamental de l\'ionogramme plasmatique pour surveillance des dyskaliémies à risque d\'arythmie cardiaque.'
  },
  {
    id: 'bio-33',
    name: 'Sodium réactif enzymatique / colorimétrique Monlabtest',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Sodium enzymatique', price: 26000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Détermination du sodium sérique pour le diagnostic des troubles de l\'hydratation intra- et extracellulaire.'
  },
  {
    id: 'bio-34',
    name: 'Sodium 2X50 Ml PROMED (Kit spectrophotométrie)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Pack 2 x 50 ml PROMED (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Kit de dosage de sodium pour automates de laboratoire gamme PROMED. Tarif sur demande / proforma.'
  },
  {
    id: 'bio-35',
    name: 'Triglycérides réactif enzymatique GPO-PAP',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Triglycérides mono-réactif liquide', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Dosage des triglycérides plasmatiques pour dépistage des hyperlipidémies et prévention du risque d\'athérosclérose.'
  },
  {
    id: 'bio-36',
    name: 'Urée réactif cinétique UV / Uréase-GLDH',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret Urée cinétique bicomposant', price: 16000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Méthode cinétique UV enzymatique de référence pour l\'exploration de la fonction rénale et de l\'état d\'hydratation.'
  },
  {
    id: 'bio-37',
    name: 'Facteur Rhumatoïde FR test d\'agglutination au latex (Kit 100 déterminations)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit 100 tests latex complet avec contrôles', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Dépistage et titrage sur plaque des auto-anticorps dirigés contre les IgG pour le diagnostic de la polyarthrite rhumatoïde.'
  },
  {
    id: 'bio-38',
    name: 'ASLO Antistreptolysine O test d\'agglutination au latex (Kit 100 déterminations)',
    category: 'Biochimie & Marqueurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit 100 tests latex complet ASLO', price: 24000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Recherche sérologique des anticorps neutralisant la streptolysine O lors des complications post-streptococciques (RAA, GNA).'
  },

  // =========================================================================
  // 4. RÉACTIFS, COLORANTS, CONTRÔLES & CALIBRATEURS (17 RÉFÉRENCES)
  // =========================================================================
  {
    id: 'rea-01',
    name: 'Alcool éthylique dénaturé 70° médical (Bidon de 5 Litres)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'hygiene',
    variants: [
      { label: 'Bidon de 5 Litres', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Alcool éthylique à 70% v/v pour désinfection cutanée, préparation du champ opératoire et désinfection des surfaces médicales.'
  },
  {
    id: 'rea-02',
    name: 'Alcool éthylique dénaturé 90° de laboratoire (Bidon de 5 Litres)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bidon de 5 Litres', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Alcool concentré à 90% pour déshydratation histologique, fixation des frottis cytologiques et usages techniques de laboratoire.'
  },
  {
    id: 'rea-03',
    name: 'Alcool à 70° officinal prêt à l\'emploi (Flacon 1 Litre)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'hygiene',
    variants: [
      { label: 'Flacon 1 Litre avec bouchon sécurité', price: 3500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Alcool antiseptique cutané en flacon d\'un litre pour soins infirmiers quotidiens et postes de soins.'
  },
  {
    id: 'rea-04',
    name: 'Détergent enzymatique tri-enzymatique désinfectant instruments (Bidon 5L)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'hygiene',
    variants: [
      { label: 'Bidon concentré 5 Litres', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution enzymatique concentrée pour pré-désinfection et nettoyage de l\'instrumentation chirurgicale et des endoscopes.'
  },
  {
    id: 'rea-05',
    name: 'Diluant universel pour automate d\'hématologie NFS (Bidon de 20L)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bidon cubitainer de 20 Litres', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Solution isotonique tamponnée stabilisée pour comptage volumétrique et impédancemétrie des éléments figurés du sang.'
  },
  {
    id: 'rea-06',
    name: 'Lyse sans cyanure pour automate d\'hématologie NFS (Flacon 500 ml / 1L)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon réactif de lyse 500 ml', price: 30000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Réactif de lyse rapide des érythrocytes et libération de l\'hémoglobine pour spectrophotométrie sur compteurs hématologiques.'
  },
  {
    id: 'rea-07',
    name: 'Rinçage / Détergent enzymatique Cleaner pour automate NFS (5L)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bidon de 5 Litres', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution nettoyante de rinçage déprotéinisante évitant le colmatage des cuves et ouvertures de mesure des compteurs hématologiques.'
  },
  {
    id: 'rea-08',
    name: 'Eau distillée déminéralisée stérile de laboratoire (Bidon de 5 Litres)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bidon de 5 Litres', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Eau de haute pureté conductivité < 1 µS/cm pour reconstitution de réactifs, rinçage de verrerie et autoclaves.'
  },
  {
    id: 'rea-09',
    name: 'Colorant Giemsa solution concentrée de référence (Flacon de 1 Litre)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon verre ambré 1 Litre', price: 14000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Coloration panoptique de référence pour la recherche du paludisme (goutte épaisse, frottis mince) et cytologie médullaire.'
  },
  {
    id: 'rea-10',
    name: 'Colorant Giemsa solution concentrée (Flacon de 500 ml)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon verre 500 ml', price: 8500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Solution mère de Giemsa prête à diluer dans tampon d\'eau distillée neutre à pH 7.2 pour lecture microscopique.'
  },
  {
    id: 'rea-11',
    name: 'Kit Coloration de Gram complet pour bactériologie (4 flacons x 250 ml)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit 4 flacons (Violet de gentiane, Lugol, Décolorant, Safranine)', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Ensemble complet pour différentiation bactérienne Gram positif / Gram négatif sur frottis directs et cultures.'
  },
  {
    id: 'rea-12',
    name: 'Colorant RAL 555 kit de coloration rapide hématologie (3 flacons x 250 ml)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Coffret 3 bains RAL 555', price: 26000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Méthode d\'immersion ultrarapide en 15 secondes pour frottis sanguins d\'urgence, leucocytes et morphologie érythrocytaire.'
  },
  {
    id: 'rea-13',
    name: 'Colorant Bleu de crésyl brillant pour réticulocytes (Flacon 100 ml)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon 100 ml prêt à l\'emploi', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Coloration supravitale des réticulocytes pour apprécier l\'activité régénérative de l\'érythropoïèse médullaire.'
  },
  {
    id: 'rea-14',
    name: 'Calibrateur multiparamétrique de biochimie clinique (Calimat / Multical)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon lyophilisé à valeurs titrées traçables', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Sérum d\'étalonnage multiparamétrique d\'origine humaine pour calibration des automates et spectrophotomètres.'
  },
  {
    id: 'rea-15',
    name: 'Sérum de contrôle biochimie Niveau Normal (Pathonorm N)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon de contrôle niveau normal', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Contrôle de qualité interne quotidien (CQI) pour validation de la précision et exactitude des dosages en zone physiologique.'
  },
  {
    id: 'rea-16',
    name: 'Sérum de contrôle biochimie Niveau Pathologique (Pathonorm P)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Flacon de contrôle niveau pathologique', price: 22000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Sérum titré à des concentrations élevées pour contrôle de la linéarité et des valeurs critiques en milieu hospitalier.'
  },
  {
    id: 'rea-17',
    name: 'Sang de contrôle pour automate d\'hématologie NFS (3 ou 5 populations)',
    category: 'Réactifs, Colorants, Contrôles & Calibrateurs',
    specialty: 'laboratoire',
    variants: [
      { label: 'Tube de sang de contrôle titré avec feuille de valeurs', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Suspension de cellules sanguines stabilisées pour vérification de la justesse des numérations plaquettes, hématies et globules blancs.'
  },

  // =========================================================================
  // 5. PETITS MATÉRIELS & APPAREILS (49 RÉFÉRENCES)
  // =========================================================================
  {
    id: 'mat-01',
    name: 'Boîte d\'instruments inox pour petite chirurgie (Set complet 12 pièces)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte inox avec jeu d\'instruments complet', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Set en acier inoxydable qualité chirurgicale autoclavable comprenant ciseaux, pinces dissectrices, porte-aiguille et manches de bistouri.'
  },
  {
    id: 'mat-02',
    name: 'Boîte d\'accouchement inox complète pour maternité',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Boîte inox complète avec instruments obstétricaux', price: 75000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Set complet spécial délivrance comprenant ciseaux à épisiotomie Braun-Stadler, pinces ombilicales, pinces de Kocher et boîte inox perforée.'
  },
  {
    id: 'mat-03',
    name: 'Boîte de pansement inox avec instruments de soins',
    category: 'Petits Matériels & Appareils',
    specialty: 'pansements',
    variants: [
      { label: 'Boîte inox avec pinces et ciseaux à pansements', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Boîte métallique de stérilisation garnie de pinces Kocher, pinces dissectrices sans griffes, ciseaux mousses pour réfection de plaies.'
  },
  {
    id: 'mat-04',
    name: 'Ciseaux chirurgicaux inox droits ou courbes (14 cm / 16 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Ciseaux droits mousse/pointu 14 cm', price: 3500 },
      { label: 'Ciseaux courbes 16 cm', price: 4000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Ciseaux d\'opération en acier inoxydable autoclavable forgé de haute précision pour coupe de tissus et fils chirurgicaux.'
  },
  {
    id: 'mat-05',
    name: 'Ciseaux de Metzenbaum inox pour dissection fine',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Metzenbaum 14 cm ou 18 cm', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Ciseaux à branches longues et lames courtes effilées pour dissection délicate des structures anatomiques profondes.'
  },
  {
    id: 'mat-06',
    name: 'Ciseaux à pansements et bandages de Lister inox',
    category: 'Petits Matériels & Appareils',
    specialty: 'pansements',
    variants: [
      { label: 'Ciseaux Lister 14 cm ou 18 cm avec bouton protecteur', price: 4000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Ciseaux coudés à bout rond mousse sécurisé permettant de découper plâtres, bandes et vêtements sans léser la peau.'
  },
  {
    id: 'mat-07',
    name: 'Pince de Kocher inox droite ou courbe avec griffes 1x2 (14 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Pince Kocher inox droite 14 cm', price: 3000 },
      { label: 'Pince Kocher inox courbe 14 cm', price: 3000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Pince hémostatique à mors cannelés transversaux munis de dents d\'engrenage solides à crémaillère autobloquante.'
  },
  {
    id: 'mat-08',
    name: 'Pince de Péan inox sans griffes (14 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Pince Péan inox 14 cm', price: 3000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Pince hémostatique atraumatique à mors striés sans griffes pour hémostase temporaire et saisie délicate des tissus.'
  },
  {
    id: 'mat-09',
    name: 'Pince à disséquer inox chirurgicale (14 cm / 16 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Pince sans griffes 14 cm', price: 2500 },
      { label: 'Pince avec griffes 1x2 14 cm', price: 2500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Pince anatomique préhensile à ressort souple pour préhension des tissus cutanés ou manipulation de compresses stériles.'
  },
  {
    id: 'mat-10',
    name: 'Pince porte-aiguille Mayo-Hegar inox (16 cm / 18 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Porte-aiguille Mayo-Hegar 16 cm', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Instrument de suture robuste à mors quadrillés avec rainure centrale de maintien ferme des aiguilles courbes sans rotation.'
  },
  {
    id: 'mat-11',
    name: 'Pince de Pozzi inox pour gynécologie et biopsie du col',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Pince Pozzi 24 cm à griffes pénétrantes', price: 7500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pince longue à griffes fines incurvées pour fixation et traction atraumatique du col de l\'utérus lors de la pose de stérilet ou hystérométrie.'
  },
  {
    id: 'mat-12',
    name: 'Pince de Cheron inox coudée pour pansements gynécologiques',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Pince Cheron 25 cm coudée', price: 6500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pince longue à mors ovales striés conçue pour l\'antisepsie vulvo-vaginale et la préhension de tampons au fond du vagin.'
  },
  {
    id: 'mat-13',
    name: 'Pince de Michel pour agrafes (Pose et ôte agrafes)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Pince combinée pose / dépose agrafes', price: 6000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pince métallique double usage pour serrage d\'agrafes de Michel et ablation sans douleur au moyen de becs spécialement usinés.'
  },
  {
    id: 'mat-14',
    name: 'Pince hémostatique mosquito inox droite ou courbe (12 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Pince Halstead Mosquito 12 cm', price: 3000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Pince hémostatique miniature ultra-précise pour clampage des petits vaisseaux fins en chirurgie plastique et pédiatrique.'
  },
  {
    id: 'mat-15',
    name: 'Haricot / Bassin réniforme inox médical (20 cm / 25 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'hygiene',
    variants: [
      { label: 'Bassin haricot inox 20 cm', price: 4500 },
      { label: 'Bassin haricot inox 25 cm', price: 6000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Cuvette réniforme en acier inoxydable poli miroir résistante aux désinfectants pour recueil de liquides, pansements et instruments souillés.'
  },
  {
    id: 'mat-16',
    name: 'Boîte de stérilisation inox avec couvercle ajusté',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Boîte inox 20 x 10 x 5 cm', price: 18000 },
      { label: 'Boîte inox 30 x 15 x 8 cm', price: 28000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Conteneur rigide en acier inoxydable de qualité médicale pour conditionnement et stérilisation thermique des sets chirurgicaux.'
  },
  {
    id: 'mat-17',
    name: 'Tambour de stérilisation inox à fentes d\'aération réglables',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Tambour diamètre 24 cm', price: 25000 },
      { label: 'Tambour diamètre 28 cm', price: 32000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Boîte cylindrique inox pour stérilisation du linge chirurgical, blouses et compresses avec bague coulissante de fermeture hermétique.'
  },
  {
    id: 'mat-18',
    name: 'Plateau inox rectangulaire chirurgical (20 x 30 cm)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Plateau rectangulaire inox 20 x 30 cm', price: 8500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Plateau inox à rebords arrondis pour disposition aseptique de l\'instrumentation sur table de Mayo ou chariot de pansements.'
  },
  {
    id: 'mat-19',
    name: 'Porte-coton / Boîte à compresses inox avec couvercle',
    category: 'Petits Matériels & Appareils',
    specialty: 'hygiene',
    variants: [
      { label: 'Porte-coton cylindrique inox', price: 6000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Bocal en acier inoxydable avec couvercle bouton pour conservation stérile des tampons d\'ouate et mèches de gaze.'
  },
  {
    id: 'mat-20',
    name: 'Poupinel / Stérilisateur à chaleur sèche de table (Capacité 20L)',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Stérilisateur Poupinel avec thermostat et minuterie', price: 185000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 2,
    description: 'Appareil de stérilisation à air chaud sec à régulation thermique précise jusqu\'à 200°C pour instruments chirurgicaux en métal et verrerie.'
  },
  {
    id: 'mat-21',
    name: 'Autoclave de paillasse pour stérilisation à vapeur d\'eau sous pression',
    category: 'Petits Matériels & Appareils',
    specialty: 'chirurgie',
    variants: [
      { label: 'Autoclave de table vertical/horizontal 18L', price: 350000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 2,
    description: 'Stérilisateur à vapeur humide 121°C / 134°C avec manomètre et soupape de sécurité pour élimination des micro-organismes et spores.'
  },
  {
    id: 'mat-22',
    name: 'Tensiomètre manopoire anéroïde professionnel avec brassard adulte',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Ensemble manopoire avec trousse de transport', price: 18000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Tensiomètre mécanique robuste avec boîtier antichoc, valve de dégonflage douce et brassard lavable en nylon calibré.'
  },
  {
    id: 'mat-23',
    name: 'Tensiomètre électronique à brassard - Modèle Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Appareil automatique brassard bras Standard', price: 30000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Moniteur de pression artérielle numérique oscillométrique au bras avec grand écran LCD et indicateur de niveau OMS.'
  },
  {
    id: 'mat-24',
    name: 'Tensiomètre électronique à brassard - Modèle Pro Mémoire Clinique',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Modèle Pro clinique multi-mémoires double utilisateur', price: 40000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Tensiomètre professionnel haute précision avec détection des arythmies cardiaques (IHB), double mémoire 2x99 mesures et adaptateur secteur.'
  },
  {
    id: 'mat-25',
    name: 'Tensiomètre électronique à poignet - Modèle Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Modèle poignet compact avec boîtier', price: 30000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Appareil compact de mesure tensionnelle au poignet avec capteur de positionnement et gonflage automatique confortable.'
  },
  {
    id: 'mat-26',
    name: 'Tensiomètre électronique à poignet - Modèle Pro Haute Précision',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Modèle Pro poignet écran rétroéclairé', price: 50000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Tensiomètre poignet haut de gamme doté d\'un capteur d\'angle optique validé cliniquement avec calcul de la moyenne des 3 dernières mesures.'
  },
  {
    id: 'mat-27',
    name: 'Stéthoscope double pavillon type Rappaport / Spengler',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Stéthoscope acoustique double tubulure avec embouts', price: 12000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Stéthoscope médical à double pavillon réversible membrane et cloche pour auscultation cardiaque et pulmonaire adulte et pédiatrique.'
  },
  {
    id: 'mat-28',
    name: 'Stéthoscope de Pinard obstétrical en bois ou aluminium',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Stéthoscope Pinard en bois de hêtre', price: 3500 },
      { label: 'Stéthoscope Pinard en aluminium anodisé', price: 4500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Cornet d\'auscultation foetale directe traditionnelle permettant d\'écouter les bruits du cœur du fœtus à travers la paroi utérine.'
  },
  {
    id: 'mat-29',
    name: 'Thermomètre médical numérique électronique à embout flexible',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Thermomètre digital avec bip sonore et étui', price: 2000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Prise de température rapide en 10 à 30 secondes par voie axillaire, buccale ou rectale avec alerte fièvre et écran LCD étanche.'
  },
  {
    id: 'mat-30',
    name: 'Thermomètre frontal infrarouge médical sans contact',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Thermomètre pistolet IR sans contact', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Mesure instantanée en 1 seconde à distance de 3 à 5 cm sans contact cutané évitant tout risque de contamination infectieuse.'
  },
  {
    id: 'mat-31',
    name: 'Saturomètre (Oxymètre de pouls) - Modèle Doigtier Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Oxymètre de doigt avec écran LED', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 15,
    description: 'Dispositif non invasif mesurant la saturation artérielle en oxygène (SpO2) et la fréquence cardiaque avec onde de pouls pléthysmographique.'
  },
  {
    id: 'mat-32',
    name: 'Saturomètre (Oxymètre de pouls) - Modèle Professionnel avec Alarme',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Modèle Pro écran OLED 4 directions avec alarmes sonores', price: 35000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Oxymètre professionnel avec écran bicolore multidirectionnel, indice de perfusion (PI) et alarmes paramétrables de désaturation.'
  },
  {
    id: 'mat-33',
    name: 'Glucomètre lecteur de glycémie (Kit avec autopiqueur et lancettes)',
    category: 'Petits Matériels & Appareils',
    specialty: 'laboratoire',
    variants: [
      { label: 'Kit lecteur complet dans trousse de transport', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Appareil d\'auto-surveillance glycémique rapide avec écran rétroéclairé, mémoires de mesure et stylo autopiqueur réglable.'
  },
  {
    id: 'mat-34',
    name: 'Hémoglobinomètre lecteur portable Mission Plus Hb',
    category: 'Petits Matériels & Appareils',
    specialty: 'laboratoire',
    variants: [
      { label: 'Lecteur d\'hémoglobine portable avec accessoires', price: 85000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Analyseur POC portable délivrant le taux d\'hémoglobine et l\'hématocrite en moins de 15 secondes à partir d\'une micro-goutte de sang.'
  },
  {
    id: 'mat-35',
    name: 'Pèse-personne mécanique avec cadran - Modèle Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Balance mécanique robuste portée 150 kg', price: 25000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pèse-personne à ressort mécanique traditionnel avec large cadran horloge et plateau antidérapant sans pile.'
  },
  {
    id: 'mat-36',
    name: 'Pèse-personne électronique médical haute précision - Modèle Professionnel',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Balance digitale professionnelle portée 200 kg', price: 60000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Plateforme de pesée électronique à capteurs de jauge de contrainte avec fonction de stabilisation automatique et calcul de l\'IMC.'
  },
  {
    id: 'mat-37',
    name: 'Pèse-personne médical colonne avec toise télescopique - Modèle Pro',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Pèse-personne à colonne avec toise intégrée', price: 75000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Balance médicale sur colonne stable équipée d\'une toise télescopique pour mesure simultanée du poids et de la taille en consultation.'
  },
  {
    id: 'mat-38',
    name: 'Pèse-bébé mécanique avec nacelle métallique ou plastique',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Pèse-bébé mécanique à curseur ou cadran 20 kg', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Balance pédiatrique robuste avec nacelle ergonomique et système mécanique de pesée par contrepoids pour maternité et PMI.'
  },
  {
    id: 'mat-39',
    name: 'Pèse-bébé électronique digital avec écran LCD et fonction Tare',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Balance pédiatrique digitale de précision', price: 55000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Pèse-bébé électronique haute sensibilité au gramme près avec stabilisation automatique du poids lors des mouvements du nourrisson.'
  },
  {
    id: 'mat-40',
    name: 'Toise murale pour adulte déroulante (Graduation 2 mètres)',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Ruban toise mural enrouleur automatique 200 cm', price: 8000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 10,
    description: 'Toise à fixation murale compacte à ruban déroulant avec curseur de lecture optique directe pour cabinets médicaux.'
  },
  {
    id: 'mat-41',
    name: 'Toise horizontale en bois ou plastique pour nourrisson',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Pédiomètre de table horizontal 100 cm', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Planche de mesure pédiatrique avec appui-tête fixe et curseur pour pieds coulissant doux pour nouveau-nés et bébés jusqu\'à 2 ans.'
  },
  {
    id: 'mat-42',
    name: 'Doppler fœtal de poche avec sonde à ultrasons - Gamme Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Doppler fœtal portable Standard avec écouteurs', price: 15000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Appareil compact de détection acoustique des battements cardiaques fœtaux dès la 12ème semaine d\'aménorrhée.'
  },
  {
    id: 'mat-43',
    name: 'Doppler fœtal avec écran LCD rétroéclairé - Gamme Pro',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Doppler Pro écran numérique FHR + haut-parleur', price: 41500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 5,
    description: 'Doppler fœtal avec sonde 2 ou 3 MHz haute sensibilité, affichage numérique en temps réel du rythme cardiaque fœtal (RCF) et haut-parleur intégré.'
  },
  {
    id: 'mat-44',
    name: 'Doppler fœtal haute sensibilité sonde étanche - Gamme Hospitalière',
    category: 'Petits Matériels & Appareils',
    specialty: 'maternite',
    variants: [
      { label: 'Doppler clinique hospitalier avec sonde interchangeable étanche', price: 97000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 2,
    description: 'Équipement obstétrical haut de gamme avec traitement numérique avancé du signal, réduction active du bruit et batterie rechargeable.'
  },
  {
    id: 'mat-45',
    name: 'Micropipette automatique à volume variable - Gamme Standard',
    category: 'Petits Matériels & Appareils',
    specialty: 'laboratoire',
    variants: [
      { label: 'Micropipette 0.5-10 µl Standard', price: 75000 },
      { label: 'Micropipette 10-100 µl Standard', price: 75000 },
      { label: 'Micropipette 100-1000 µl Standard', price: 75000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Pipeteur manuel monocanal à affichage digital du volume et piston à course fluide avec éjecteur d\'embouts séparé.'
  },
  {
    id: 'mat-46',
    name: 'Micropipette automatique autoclavable haute précision - Gamme Précision Pro',
    category: 'Petits Matériels & Appareils',
    specialty: 'laboratoire',
    variants: [
      { label: 'Micropipette Pro entièrement autoclavable (au choix 10-100 ou 100-1000 µl)', price: 95000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Micropipette de laboratoire de recherche entièrement stérilisable en autoclave à 121°C garantissant une reproductibilité sans dérive thermique.'
  },
  {
    id: 'mat-47',
    name: 'Garrot médical élastique avec clip automatique rapide (Adulte / Enfant)',
    category: 'Petits Matériels & Appareils',
    specialty: 'perfusion',
    variants: [
      { label: 'Garrot élastique à clip de décompression', price: 1500 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 20,
    description: 'Bande élastique sans latex avec boucle de serrage ergonomique à ouverture rapide à un seul doigt sans pincement cutané.'
  },
  {
    id: 'mat-48',
    name: 'Négatoscope simple plage LED ultra-plat pour radiographies',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Négatoscope 1 plage LED ultra-mince', price: 45000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 3,
    description: 'Écran lumineux à LED haute luminance homogène pour lecture et interprétation des clichés radiologiques conventionnels.'
  },
  {
    id: 'mat-49',
    name: 'Négatoscope double plage LED ultra-plat pour radiographies',
    category: 'Petits Matériels & Appareils',
    specialty: 'urgence',
    variants: [
      { label: 'Négatoscope 2 plages LED avec allumage séparé', price: 75000 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 2,
    description: 'Grand négatoscope médical 2 plages avec pinces automatiques à bille et variateur d\'intensité lumineuse pour salles d\'imagerie et blocs.'
  },

  // =========================================================================
  // 6. ÉQUIPEMENTS SUR DEVIS (20 RÉFÉRENCES)
  // =========================================================================
  // 6.1 Imagerie
  {
    id: 'eq-img-01',
    name: 'Électrocardiographe (ECG) 3 / 6 / 12 pistes numérique avec écran LCD',
    category: 'Équipements sur Devis',
    subcategory: 'Imagerie',
    specialty: 'urgence',
    variants: [
      { label: 'Appareil ECG complet avec accessoires (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Électrocardiographe hospitalier multipiste avec interprétation automatique intégrée, imprimante thermique et export USB/Ethernet.'
  },
  {
    id: 'eq-img-02',
    name: 'Échographe Doppler couleur portable pluridisciplinaire',
    category: 'Équipements sur Devis',
    subcategory: 'Imagerie',
    specialty: 'urgence',
    variants: [
      { label: 'Système échographique portable avec sondes (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Système d\'échographie numérique Doppler pulsé et continu avec sondes convexe, linéaire et endocavitaire pour imagerie abdominale, vasculaire et gynéco-obstétricale.'
  },
  {
    id: 'eq-img-03',
    name: 'Système d\'Imagerie par Résonance Magnétique (IRM) hospitalier',
    category: 'Équipements sur Devis',
    subcategory: 'Imagerie',
    specialty: 'urgence',
    variants: [
      { label: 'Installation complète IRM (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Plateforme IRM corps entier haut champ avec console opérateur, antennes dédiées et suite logicielle avancée de neuro-imagerie et ostéo-articulaire.'
  },
  {
    id: 'eq-img-04',
    name: 'Table de Radiographie numérique conventionnelle avec capteur plan',
    category: 'Équipements sur Devis',
    subcategory: 'Imagerie',
    specialty: 'urgence',
    variants: [
      { label: 'Salle de radiologie numérique complète (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Générateur haute fréquence, table de radiographie avec potter bucky et capteur plan numérique direct pour examens squelettiques et pulmonaires.'
  },
  {
    id: 'eq-img-05',
    name: 'Arceau chirurgical C-ARM amplificateur de brillance pour bloc opératoire',
    category: 'Équipements sur Devis',
    subcategory: 'Imagerie',
    specialty: 'chirurgie',
    variants: [
      { label: 'Système arceau C-ARM mobile avec moniteur double (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Arceau radiologique mobile à fluoroscopie continue et pulsée pour guidage peropératoire en traumatologie, orthopédie et chirurgie vasculaire.'
  },

  // 6.2 Laboratoire d'Analyses
  {
    id: 'eq-lab-01',
    name: 'Analyseur automatique d\'hématologie NFS (3 ou 5 populations leucocytaires)',
    category: 'Équipements sur Devis',
    subcategory: 'Laboratoire d\'Analyses',
    specialty: 'laboratoire',
    variants: [
      { label: 'Automate hématologie avec passeur (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Compteur de cellules hématologique automatisé à cadence de 60 tests/heure avec écran tactile et gestion informatisée des résultats.'
  },
  {
    id: 'eq-lab-02',
    name: 'Stérilisateur autoclave hospitalier haute capacité (50L à 150L)',
    category: 'Équipements sur Devis',
    subcategory: 'Laboratoire d\'Analyses',
    specialty: 'chirurgie',
    variants: [
      { label: 'Autoclave vertical / horizontal haute capacité (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Générateur de vapeur saturée pour stérilisation centralisée hospitalière avec cycles programmables, séchage sous vide et enregistreur de paramètres.'
  },
  {
    id: 'eq-lab-03',
    name: 'Microscope optique trinoculaire de laboratoire avec caméra numérique HD',
    category: 'Équipements sur Devis',
    subcategory: 'Laboratoire d\'Analyses',
    specialty: 'laboratoire',
    variants: [
      { label: 'Microscope trinoculaire avec optiques plan-achromatiques (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Microscope professionnel à éclairage LED Köhler, objectifs 4x, 10x, 40x et 100x à immersion avec sortie caméra pour enseignement et télé-expertise.'
  },
  {
    id: 'eq-lab-04',
    name: 'Centrifugeuse clinique de laboratoire pour tubes de sang et poches',
    category: 'Équipements sur Devis',
    subcategory: 'Laboratoire d\'Analyses',
    specialty: 'laboratoire',
    variants: [
      { label: 'Centrifugeuse à vitesse variable avec rotor libre (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Centrifugeuse de paillasse silencieuse avec programmateur digital de vitesse (jusqu\'à 4000-5000 RPM) et sécurité de verrouillage du couvercle.'
  },
  {
    id: 'eq-lab-05',
    name: 'Bain-Marie thermostatique de laboratoire avec régulateur digital',
    category: 'Équipements sur Devis',
    subcategory: 'Laboratoire d\'Analyses',
    specialty: 'laboratoire',
    variants: [
      { label: 'Bain-Marie inox thermostaté 37°C/56°C (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Cuve en acier inoxydable à circulation d\'eau régulée au dixième de degré pour incubation de tests enzymatiques et sérologies.'
  },

  // 6.3 Hospitalisation et Soins
  {
    id: 'eq-hosp-01',
    name: 'Moniteur de surveillance multiparamétrique des signes vitaux (Scope patient)',
    category: 'Équipements sur Devis',
    subcategory: 'Hospitalisation et Soins',
    specialty: 'urgence',
    variants: [
      { label: 'Moniteur signes vitaux ECG, SpO2, PNI, Temp (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Moniteur patient 12 pouces avec alarmes visuelles et sonores, surveillance continue de l\'ECG, SpO2, pression non invasive et respiration.'
  },
  {
    id: 'eq-hosp-02',
    name: 'Brancard de transfert d\'urgence et réanimation à hauteur variable',
    category: 'Équipements sur Devis',
    subcategory: 'Hospitalisation et Soins',
    specialty: 'urgence',
    variants: [
      { label: 'Chariot brancard hydraulique avec barrières escamotables (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Brancard hospitalier sur roulettes à freinage centralisé, relève-buste assisté par vérin à gaz et support de tige à perfusion intégré.'
  },
  {
    id: 'eq-hosp-03',
    name: 'Chariot de soins et d\'urgence médicalisé avec tiroirs sécurisés',
    category: 'Équipements sur Devis',
    subcategory: 'Hospitalisation et Soins',
    specialty: 'urgence',
    variants: [
      { label: 'Chariot d\'urgence avec planche à masser et support défibrillateur (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Chariot modulaire en polymère antibactérien avec tiroirs compartimentés à fermeture par scellés d\'inviolabilité pour réanimation d\'urgence.'
  },
  {
    id: 'eq-hosp-04',
    name: 'Fauteuil roulant pliant standard pour transfert de patient',
    category: 'Équipements sur Devis',
    subcategory: 'Hospitalisation et Soins',
    specialty: 'urgence',
    variants: [
      { label: 'Fauteuil roulant pliant en acier chromé (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Fauteuil de transport médical avec repose-pieds escamotables et garniture lavable ignifugée pour admission et déplacement intrahospitalier.'
  },
  {
    id: 'eq-hosp-05',
    name: 'Ensemble Otoscope et Ophtalmoscope à fibre optique médicale',
    category: 'Équipements sur Devis',
    subcategory: 'Hospitalisation et Soins',
    specialty: 'urgence',
    variants: [
      { label: 'Kit diagnostic mural ou mallette rechargeable (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Ensemble de diagnostic ORL et ophtalmologique à éclairage LED à fibre optique avec régulation d\'intensité et lentilles dioptriques multiples.'
  },

  // 6.4 Bloc Opératoire
  {
    id: 'eq-bloc-01',
    name: 'Table d\'opération chirurgicale multifonctions électro-hydraulique',
    category: 'Équipements sur Devis',
    subcategory: 'Bloc Opératoire',
    specialty: 'chirurgie',
    variants: [
      { label: 'Table d\'opération universelle radiotransparente (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Table chirurgicale modulaire radiotransparente avec télécommande, positions Trendelenburg, proclive et pont rénal pour toutes spécialités.'
  },
  {
    id: 'eq-bloc-02',
    name: 'Lampe scialytique chirurgicale à LED satellite double coupole',
    category: 'Équipements sur Devis',
    subcategory: 'Bloc Opératoire',
    specialty: 'chirurgie',
    variants: [
      { label: 'Scialytique plafonnier LED double coupole sans ombre (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Éclairage opératoire sans ombre portée à haute intensité lumineuse (160 000 Lux), indice de rendu des couleurs optimal et poignée stérilisable.'
  },
  {
    id: 'eq-bloc-03',
    name: 'Aspirateur chirurgical de mucosités sur roulettes grand bocal (2x2L ou 2x4L)',
    category: 'Équipements sur Devis',
    subcategory: 'Bloc Opératoire',
    specialty: 'chirurgie',
    variants: [
      { label: 'Aspirateur de bloc opératoire avec double bocal autoclavable (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Aspirateur chirurgical électrique à débit d\'aspiration continu élevé avec filtre antibactérien hydrophobe et pédale de commande au pied.'
  },
  {
    id: 'eq-bloc-04',
    name: 'Boîte complète de chirurgie générale et césarienne inox haute qualité',
    category: 'Équipements sur Devis',
    subcategory: 'Bloc Opératoire',
    specialty: 'chirurgie',
    variants: [
      { label: 'Set complet grande chirurgie et césarienne (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Composition chirurgicale complète en boîte inox comprenant écarteurs de Balfour, pinces de Doyen, clamps vasculaires et porte-aiguilles lourds.'
  },
  {
    id: 'eq-bloc-05',
    name: 'Station / Appareil d\'anesthésie réanimation avec ventilateur intégré',
    category: 'Équipements sur Devis',
    subcategory: 'Bloc Opératoire',
    specialty: 'chirurgie',
    variants: [
      { label: 'Poste d\'anesthésie complet avec vaporisateurs et monitorage (Sur devis)', price: 0 }
    ],
    status: 'disponible',
    quantityAvailable: 0,
    stockQuantity: 0,
    alertThreshold: 1,
    description: 'Système complet d\'anesthésie par inhalation avec mélangeur de gaz O2/N2O/Air, ventilateur de réanimation volumétrique et circuits patient.'
  }
];

export const INITIAL_PACKS: Pack[] = [];
