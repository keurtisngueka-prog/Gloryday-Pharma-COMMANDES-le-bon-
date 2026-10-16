import { Product, Pack } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  // 1. CONSOMMABLES MÉDICAUX
  {
    id: 'c-ser-01',
    name: 'Seringue 2 ml 3 pièces avec aiguille',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    isPromotion: true,
    originalPrice: 9375,
    discountPercentage: 20,
    variants: [
      { label: 'Boîte de 100 unités (21G)', price: 7500, originalPrice: 9375, discountPercentage: 20 },
      { label: 'Carton de 20 boîtes (2000 unités)', price: 140000, originalPrice: 175000, discountPercentage: 20 }
    ],
    status: 'disponible',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    description: 'Seringue stérile 3 pièces à usage unique avec aiguille 21G ou 23G, emballage blister individuel.'
  },
  {
    id: 'c-ser-02',
    name: 'Seringue 5 ml 3 pièces avec aiguille',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 100 unités (21G)', price: 7500 },
      { label: 'Carton de 18 boîtes (1800 unités)', price: 128000 }
    ],
    status: 'disponible',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80',
    description: 'Seringue stérile 5 ml 3 pièces avec aiguille sertie ou luer-slip, bague de sécurité.'
  },
  {
    id: 'c-ser-03',
    name: 'Seringue 10 ml 3 pièces',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 100 unités', price: 9500 },
      { label: 'Carton de 12 boîtes', price: 108000 }
    ],
    status: 'disponible',
    description: 'Seringue stérile 10 ml haute transparence, graduation nette et durable.'
  },
  {
    id: 'c-ser-04',
    name: 'Seringue 20 ml Luer Lock',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 50 unités', price: 8500 }
    ],
    status: 'disponible',
    description: 'Seringue stérile 20 ml embout luer lock pour injection ou prélèvement sécurisé.'
  },
  {
    id: 'c-ser-05',
    name: 'Seringue 50 ml gavage / irrigation',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 25 unités (embout conique)', price: 11000 },
      { label: 'Boîte de 25 unités (Luer Lock)', price: 12500 }
    ],
    status: 'disponible',
    description: 'Seringue grand volume pour alimentation entérale, lavage vésical ou pansements.'
  },
  {
    id: 'c-ser-06',
    name: 'Seringue à Insuline 1 ml avec aiguille 29G',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 100 unités (U-100)', price: 8900 }
    ],
    status: 'disponible',
    description: 'Seringue à insuline stérile 1 ml, graduation fine 100 UI, aiguille atraumatique.'
  },
  {
    id: 'c-ser-07',
    name: 'Aiguille hypodermique stérile',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: '18G (Rose) - Boîte de 100', price: 3500 },
      { label: '21G (Vert) - Boîte de 100', price: 3500 },
      { label: '23G (Bleu) - Boîte de 100', price: 3500 },
      { label: '25G (Orange) - Boîte de 100', price: 3500 }
    ],
    status: 'disponible',
    description: 'Aiguilles hypodermiques stériles à biseau triple affûtage, connecteur Luer standard.'
  },
  {
    id: 'c-ser-08',
    name: 'Cathéter court intraveineux (Cathlon)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    isPromotion: true,
    originalPrice: 14100,
    discountPercentage: 15,
    variants: [
      { label: '18G (Vert) - Boîte de 50', price: 12000, originalPrice: 14100, discountPercentage: 15 },
      { label: '20G (Rose) - Boîte de 50', price: 12000, originalPrice: 14100, discountPercentage: 15 },
      { label: '22G (Bleu) - Boîte de 50', price: 12000, originalPrice: 14100, discountPercentage: 15 },
      { label: '24G pédiatrique (Jaune) - Boîte de 50', price: 13500, originalPrice: 15800, discountPercentage: 15 }
    ],
    status: 'disponible',
    description: 'Cathéter IV avec site d injection et ailettes, canule en FEP ou PTFE lubrifié.'
  },
  {
    id: 'c-ser-09',
    name: 'Perfuseur stérile avec filtre et prise d air',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Sachet individuel (Boîte de 25)', price: 6500 },
      { label: 'Carton de 200 unités', price: 48000 }
    ],
    status: 'disponible',
    description: 'Tubulure de perfusion stérile 20 gouttes/ml avec chambre compte-gouttes souple et filtre.'
  },
  {
    id: 'c-ser-10',
    name: 'Transfuseur de sang stérile avec filtre 200µ',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 25 unités', price: 14500 }
    ],
    status: 'disponible',
    description: 'Dispositif de transfusion sanguine stérile avec filtre à micro-caillots conforme normes hématologiques.'
  },
  {
    id: 'c-ser-11',
    name: 'Robinet 3 voies Luer-Lock stérile',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 50 unités', price: 11500 }
    ],
    status: 'disponible',
    description: 'Robinet 3 voies résistant aux lipides et à haute pression, manipulation fluide à 360°.'
  },
  {
    id: 'c-ser-12',
    name: 'Prolongateur de perfusion Luer Lock 150 cm',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: 'Boîte de 25 unités', price: 8000 }
    ],
    status: 'disponible',
    description: 'Ligne d extension stérile en PVC médical souple haute résistance.'
  },
  {
    id: 'c-ser-13',
    name: 'Microperfuseur épicrânien (Epicrânienne / Butterfly)',
    category: 'Consommables médicaux',
    subcategory: 'Seringues et perfusion',
    variants: [
      { label: '21G - Boîte de 100', price: 9500 },
      { label: '23G - Boîte de 100', price: 9500 },
      { label: '25G - Boîte de 100', price: 9500 }
    ],
    status: 'disponible',
    description: 'Aiguille à ailettes souples avec tubulure 30 cm pour perfusion pédiatrique ou prélèvement délicat.'
  },
  // Gants
  {
    id: 'c-gan-01',
    name: 'Gants d examen en Latex non poudré',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    isPromotion: true,
    originalPrice: 6000,
    discountPercentage: 25,
    variants: [
      { label: 'Taille S - Boîte de 100', price: 4500, originalPrice: 6000, discountPercentage: 25 },
      { label: 'Taille M - Boîte de 100', price: 4500, originalPrice: 6000, discountPercentage: 25 },
      { label: 'Taille L - Boîte de 100', price: 4500, originalPrice: 6000, discountPercentage: 25 }
    ],
    status: 'disponible',
    description: 'Gants d examen ambidextres en latex naturel hypoallergénique, surface micro-texturée.'
  },
  {
    id: 'c-gan-02',
    name: 'Gants d examen en Latex poudré',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    variants: [
      { label: 'Taille S - Boîte de 100', price: 3800 },
      { label: 'Taille M - Boîte de 100', price: 3800 },
      { label: 'Taille L - Boîte de 100', price: 3800 }
    ],
    status: 'disponible',
    description: 'Gants en latex légèrement poudrés à l amidon de maïs bio pour un enfilage rapide.'
  },
  {
    id: 'c-gan-03',
    name: 'Gants d examen en Nitrile bleu (sans poudre)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    variants: [
      { label: 'Taille S - Boîte de 100', price: 5500 },
      { label: 'Taille M - Boîte de 100', price: 5500 },
      { label: 'Taille L - Boîte de 100', price: 5500 },
      { label: 'Taille XL - Boîte de 100', price: 5900 }
    ],
    status: 'disponible',
    description: 'Gants en nitrile haute résistance chimique et biologique, sans protéines de latex.'
  },
  {
    id: 'c-gan-04',
    name: 'Gants chirurgicaux stériles poudrés (la paire)',
    category: 'Consommables médicaux',
    subcategory: 'Gants',
    variants: [
      { label: 'Taille 6.5 - Boîte de 50 paires', price: 16000 },
      { label: 'Taille 7.0 - Boîte de 50 paires', price: 16000 },
      { label: 'Taille 7.5 - Boîte de 50 paires', price: 16000 },
      { label: 'Taille 8.0 - Boîte de 50 paires', price: 16000 }
    ],
    status: 'disponible',
    description: 'Gants chirurgicaux stériles emballés par paire sous pochette pelable avec repérage main gauche/droite.'
  },
  // 2. ÉQUIPEMENTS & MATÉRIEL MÉDICAL
  {
    id: 'eq-01',
    name: 'Oxymètre de pouls digital au doigt (Saturomètre)',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Modèle portable écran OLED avec piles', price: 18500 }
    ],
    status: 'disponible',
    description: 'Mesure précise de la SpO2 et du pouls, affichage pléthysmographique, alarme sonore.'
  },
  {
    id: 'eq-02',
    name: 'Tensiomètre manuel professionnel Manopoire',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Boîtier antichoc avec brassard adulte nylon', price: 22000 }
    ],
    status: 'disponible',
    description: 'Mano-poire grand cadran précis, poire ergonomique avec robinet de décompression micrométrique.'
  },
  {
    id: 'eq-03',
    name: 'Tensiomètre électronique médical pour bras',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Modèle clinique automatique mémoire 99 mesures', price: 32000 }
    ],
    status: 'disponible',
    description: 'Affichage grand écran LCD, détection d arythmie, classification tensionnelle OMS.'
  },
  {
    id: 'eq-04',
    name: 'Doppler fœtal de poche avec sonde 2 MHz',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Modèle compact avec écran rétroéclairé', price: 45000 }
    ],
    status: 'disponible',
    description: 'Détecteur de battements cardiaques fœtaux dès 10-12 semaines de grossesse, haut-parleur intégré.'
  },
  {
    id: 'eq-05',
    name: 'Thermomètre médical infrarouge sans contact',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Modèle frontal haute vitesse (1 seconde)', price: 15000 }
    ],
    status: 'disponible',
    description: 'Mesure corporelle à distance de 3 à 5 cm, alarme visuelle de fièvre multicolore.'
  },
  {
    id: 'eq-07',
    name: 'Stéthoscope de diagnostic à double pavillon inox',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Version Adulte acoustique haute performance', price: 16500 },
      { label: 'Version Pédiatrique & Néonatale', price: 19500 }
    ],
    status: 'disponible',
    description: 'Pavillon usiné en inox avec membrane flottante et bague anti-froid, lyre anatomique réglable.'
  },
  // Équipements Sur Devis
  {
    id: 'eq-dev-01',
    name: 'Concentrateur d oxygène médical hospitalier 10 L/min',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Débit 1 à 10 L/min continu - Pureté 93% ± 3%', price: 0 }
    ],
    status: 'disponible',
    description: 'Appareil médical stationnaire haute pureté avec double sortie, nébuliseur intégré et alarmes.'
  },
  {
    id: 'eq-dev-02',
    name: 'Échographe portable numérique couleur Doppler avec sondes',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Configuration complète avec sonde convexe + linéaire', price: 0 }
    ],
    status: 'disponible',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
    description: 'Système d imagerie échographique haute définition, écran 15 pouces LED, préréglages gynéco et cardio.'
  },
  {
    id: 'eq-dev-03',
    name: 'Moniteur multiparamétrique de surveillance patient',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Écran 12.1" tactile (ECG, SpO2, PNI, Température, Resp)', price: 0 }
    ],
    status: 'disponible',
    description: 'Moniteur patient pour soins intensifs et salle de réveil avec batterie rechargeable et alarmes.'
  },
  {
    id: 'eq-dev-04',
    name: 'Électrocardiographe (ECG) 12 pistes numérique',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Modèle avec interprétation automatique et mémoire SD', price: 0 }
    ],
    status: 'disponible',
    description: 'Appareil ECG 12 dérivations simultanées avec analyse de rythme et export des tracés.'
  },
  {
    id: 'eq-dev-05',
    name: 'Défibrillateur semi-automatique (DSA) complet',
    category: 'Équipements & Matériel médical',
    variants: [
      { label: 'Pack DSA complet avec invite vocale et kit de secours', price: 0 }
    ],
    status: 'disponible',
    description: 'Défibrillateur cardiaque automatisé avec autotests quotidiens et guidage vocal étape par étape.'
  },
  // 3. RÉACTIFS & LABORATOIRE
  {
    id: 'r-02',
    name: 'TDR Paludisme / Malaria Pf/Pv cassette rapide',
    category: 'Réactifs & Laboratoire',
    isPromotion: true,
    originalPrice: 14700,
    discountPercentage: 15,
    variants: [
      { label: 'Boîte de 25 tests avec lancettes et diluant', price: 12500, originalPrice: 14700, discountPercentage: 15 },
      { label: 'Carton de 40 boîtes (1000 tests)', price: 460000, originalPrice: 541000, discountPercentage: 15 }
    ],
    status: 'disponible',
    description: 'Test immunochromatographique rapide pour détection de Plasmodium falciparum et vivax (sensibilité > 99%).'
  },
  {
    id: 'r-03',
    name: 'Test rapide de dépistage VIH 1/2 cassette',
    category: 'Réactifs & Laboratoire',
    variants: [
      { label: 'Boîte de 30 cassettes avec tubes capillaires', price: 18000 }
    ],
    status: 'disponible',
    description: 'Test rapide d orientation diagnostique pour détection des anticorps anti-VIH-1 et VIH-2.'
  },
  {
    id: 'r-06',
    name: 'Test de grossesse urinaire rapide hCG',
    category: 'Réactifs & Laboratoire',
    variants: [
      { label: 'Format Bandelettes - Boîte de 50', price: 6500 },
      { label: 'Format Cassettes stériles - Boîte de 25', price: 7500 }
    ],
    status: 'disponible',
    description: 'Seuil de détection précoce 20 mUI/ml pour détection de l hormone gonadotrophine chorionique.'
  },
  {
    id: 'r-09',
    name: 'Bandelettes réactives urinaires 10 paramètres (10SG)',
    category: 'Réactifs & Laboratoire',
    variants: [
      { label: 'Flacon de 100 bandelettes', price: 9500 }
    ],
    status: 'disponible',
    description: 'Dépistage leucocytes, nitrites, protéines, pH, sang, cétones, bilirubine, glucose.'
  },
  // 4. HYGIÈNE & DÉSINFECTION
  {
    id: 'h-01',
    name: 'Solution hydroalcoolique pour désinfection mains',
    category: 'Hygiène & Désinfection',
    variants: [
      { label: 'Flacon 500 ml avec pompe distributrice', price: 3200 },
      { label: 'Bidon de recharge 5 Litres', price: 19000 }
    ],
    status: 'disponible',
    description: 'Formulation recommandée par l OMS pour la friction hygiénique et chirurgicale des mains.'
  },
  {
    id: 'h-02',
    name: 'Antiseptique Polyvidone Iodée 10% (Bétadine)',
    category: 'Hygiène & Désinfection',
    variants: [
      { label: 'Flacon de 500 ml dermique', price: 4200 },
      { label: 'Bidon de 5 Litres', price: 28000 }
    ],
    status: 'disponible',
    description: 'Antiseptique à large spectre bactéricide, fongicide et virucide pour préparation opératoire.'
  },
  {
    id: 'h-06',
    name: 'Boîte de sécurité pour déchets perforants (DASRI)',
    category: 'Hygiène & Désinfection',
    variants: [
      { label: 'Contenance 5 Litres en carton renforcé étanche', price: 1800 },
      { label: 'Carton de 25 collecteurs 5L', price: 38000 }
    ],
    status: 'disponible',
    description: 'Collecteur sécurisé pour aiguilles, lames de bistouri et cathéters avec fermeture définitive conforme OMS.'
  },
  // 5. PANSEMENTS & SOINS
  {
    id: 'p-01',
    name: 'Tulle gras stérile pour brûlures et plaies',
    category: 'Pansements & Soins',
    variants: [
      { label: '10 cm x 10 cm - Boîte de 10 pansements', price: 6800 },
      { label: '10 cm x 10 cm - Boîte de 30 pansements', price: 18500 }
    ],
    status: 'disponible',
    description: 'Pansement imprégné de vaseline neutre favorisant la cicatrisation sans adhérer au lit de la plaie.'
  },
  {
    id: 'p-03',
    name: 'Bande adhésive élastique de contention (Elastoplaste)',
    category: 'Pansements & Soins',
    variants: [
      { label: '6 cm x 2.5 m - Rouleau', price: 2800 },
      { label: '8 cm x 2.5 m - Rouleau', price: 3600 },
      { label: '10 cm x 2.5 m - Rouleau', price: 4400 }
    ],
    status: 'disponible',
    description: 'Bande élastique en pur coton avec masse adhésive hypoallergénique pour strapping et maintien.'
  },
  // 6. URGENCE & RÉANIMATION
  {
    id: 'u-01',
    name: 'Insufflateur manuel de réanimation silicone (Ambu)',
    category: 'Urgence & Réanimation',
    variants: [
      { label: 'Modèle Adulte avec masque, tubulure et réservoir', price: 28000 },
      { label: 'Modèle Pédiatrique avec masque enfant', price: 28000 }
    ],
    status: 'disponible',
    description: 'Réanimateur en silicone médical autoclavable 134°C avec valve de sécurité et réservoir d oxygène.'
  },
  {
    id: 'u-03',
    name: 'Collier cervical réglable multi-tailles',
    category: 'Urgence & Réanimation',
    variants: [
      { label: 'Modèle rigide monobloc adulte 4 crans', price: 8500 },
      { label: 'Modèle pédiatrique', price: 8500 }
    ],
    status: 'disponible',
    description: 'Immobilisation rachidienne d urgence avec large ouverture trachéale.'
  }
];

export const INITIAL_PACKS: Pack[] = [
  {
    id: 'pack-perfusion-express',
    title: 'Pack Perfusion & Urgence Hôpital',
    description: 'Kit complet de démarrage pour 50 perfusions : seringues, perfuseurs, cathéters et compresses.',
    price: 65000,
    items: [
      { productName: 'Seringue 5 ml 3 pièces avec aiguille', variant: 'Boîte de 100 unités (21G)', quantity: 2 },
      { productName: 'Cathéter court intraveineux (Cathlon)', variant: '20G (Rose) - Boîte de 50', quantity: 1 },
      { productName: 'Perfuseur stérile avec filtre et prise d air', variant: 'Boîte de 25', quantity: 2 },
      { productName: 'Bande adhésive élastique de contention (Elastoplaste)', variant: '8 cm x 2.5 m - Rouleau', quantity: 1 }
    ],
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    active: true
  },
  {
    id: 'pack-protection-bloc',
    title: 'Pack Protection & Bloc Opératoire',
    description: 'Équipements de protection individuelle pour l équipe chirurgicale et soins intensifs.',
    price: 48000,
    items: [
      { productName: 'Gants d examen en Latex non poudré', variant: 'Taille M - Boîte de 100', quantity: 2 },
      { productName: 'Gants chirurgicaux stériles poudrés (la paire)', variant: 'Taille 7.5 - Boîte de 50 paires', quantity: 1 },
      { productName: 'Solution hydroalcoolique pour désinfection mains', variant: 'Flacon 500 ml avec pompe distributrice', quantity: 2 }
    ],
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
    active: true
  },
  {
    id: 'pack-depistage-labo',
    title: 'Pack Dépistage & Laboratoire Flash',
    description: 'Kits rapides pour diagnostic immédiat au chevet du patient ou en laboratoire.',
    price: 72000,
    items: [
      { productName: 'TDR Paludisme / Malaria Pf/Pv cassette rapide', variant: 'Boîte de 25 tests avec lancettes et diluant', quantity: 2 },
      { productName: 'Test rapide de dépistage VIH 1/2 cassette', variant: 'Boîte de 30 cassettes avec tubes capillaires', quantity: 1 },
      { productName: 'Bandelettes réactives urinaires 10 paramètres (10SG)', variant: 'Flacon de 100 bandelettes', quantity: 1 }
    ],
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    active: true
  }
];

export const CATEGORIES = [
  'Tous les articles',
  'Consommables médicaux',
  'Équipements & Matériel médical',
  'Réactifs & Laboratoire',
  'Hygiène & Désinfection',
  'Pansements & Soins',
  'Urgence & Réanimation'
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
