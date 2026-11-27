import { buildNeighborhoodDeliveryAddress, getNeighborhoodAdministrativeArea } from './librevilleZones.js';

export interface GabonLocality {
  name: string;
  province: string;
  neighborhoods?: string[];
}

// Neighborhood lists for larger communes are compiled from Gabonese Ministry
// of Interior (2023) and Official Journal electoral constituency documents
// (2025). Smaller communes keep an "Autre quartier" option because a complete
// public neighborhood directory was not available for every locality.
export const GABON_LOCALITIES: GabonLocality[] = [
  { name: 'Libreville', province: 'Estuaire' },
  { name: 'Akanda', province: 'Estuaire' },
  { name: 'Owendo', province: 'Estuaire' },
  { name: 'Ntoum', province: 'Estuaire', neighborhoods: ['Okolassi', 'Mekonanam', 'Dzobermitang', 'Ntoum Centre', 'Nkan’n', 'Andock-Assi', 'Alarmitang', 'Rails', 'Matoto', 'Gnambour', 'Tchad', 'SONADECI', 'Assora', 'Dame-Oyem', 'Mveng-Ayong', 'Meyang', 'Mebba', 'Akamaguê', 'Nkok', 'Zone économique spéciale de Nkok', 'Essassa', 'Nzogmitang', 'Bissobinam', 'Nkoltang', 'Ayémé', 'Ayémé-Plaine', 'Ayémé-Maritime', 'Autre quartier'] },
  { name: 'Kango', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Cocobeach', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ndzomoé', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Franceville', province: 'Haut-Ogooué', neighborhoods: ['Ngoungoulou', 'Lékèye', 'Bapili', 'Ngobounda', 'Yockot', 'Grand-Village', 'Corniche I', 'Corniche II', 'Djaka', 'Ongali', 'Engala', 'Ombele Mvouna', 'Angoubou', 'Allélé', 'Ondzeyi', 'Ondzieni', 'Epimbi', 'Dialogue', 'Ayassi', 'Ongouegne', 'La Paix', 'Montagne-Sainte', 'Ondimba', 'Ondouama', 'Mangoungou', 'Menaye', 'Carrière', 'Matébélé I', 'Matébélé II', 'Bakou', 'Pickas', 'Mimboumba', 'Kessala', 'Léconi', 'Akou', 'Mbaya', 'Djoueri', 'Makana', 'Mingara', 'Maboukou', 'Maba', 'Yéné', 'Djakana', 'Autre quartier'] },
  { name: 'Moanda', province: 'Haut-Ogooué', neighborhoods: ['Mont-Moanda', 'Alliance', 'Miosso Téléphérique I', 'Miosso Téléphérique II', 'Moukagnissi', 'Douanes', 'Montagne-Sainte', 'Belle Vue I', 'Belle Vue II', 'Belle Vue III', 'Moanda Tséghé', 'Moukaba', 'Cité OCTRA', 'Moanda Plaine', 'Lékolo', 'Léyima', 'Onkoula', 'Centre Commercial', 'Cités COMILOG', 'Autre quartier'] },
  { name: 'Mounana', province: 'Haut-Ogooué', neighborhoods: ['Massango 1', 'Cité Cadre', 'Cité Ambie', 'Centre-ville', 'Ngangolo', 'Onkoua', 'Village Mounana', 'Autre quartier'] },
  { name: 'Léconi', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Okondja', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Akiéni', province: 'Haut-Ogooué', neighborhoods: ['Obégué', 'Otou 2', 'Entsaga', 'Akaga', 'Kakoumbou', 'Evoula', 'Ndoua', 'Oyabi', 'Lenka', 'Obouo', 'Autre quartier'] },
  { name: 'Bongoville', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Bakoumba', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ngouoni', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Onga', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Aboumi', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Lambaréné', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Dakar', 'Atongowanga', 'Lalala', 'Faisceau Hertzien', 'Château', 'Grand-Village 1', 'Grand-Village 2', 'Point-V', 'Adouma', 'Moussamoukougou', 'Abongo', 'Sainte-Thérèse', 'Atsié', 'Agnidzouma', 'Isaac', 'Magnang', 'Petit-Paris 1', 'Petit-Paris 2', 'Petit-Paris 3', 'Malébé', 'Météré', 'Mitoumili', 'Mbilandzambi', 'Autre quartier'] },
  { name: 'Ndjolé', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Makouké', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Bifoun', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mouila', province: 'Ngounié', neighborhoods: ['Tsouka', 'Divindet', 'Dourouni 1', 'Dourouni 2', 'Minembe', 'Motoboko', 'Moukoundza', 'Mandjiassango', 'Diouronda', 'Moukoumouna-Bouala', 'Ngoyina', 'Moutsanou-Pinza', 'Dikongo', 'Didjanou', 'Baleka', 'Bavanga', 'Pambou', 'Mangui', 'Autre quartier'] },
  { name: 'Fougamou', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ndendé', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Lébamba', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Malinga', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Guiétsou', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mbigou', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mimongo', province: 'Ngounié', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Tchibanga', province: 'Nyanga', neighborhoods: ['Ibanga', 'Bibora', 'Ndabilila', 'Mindzanzala', 'Pola', 'Ingara', 'Batsiengui', 'Moukenga', 'Château', 'Mavoundi', 'Autre quartier'] },
  { name: 'Mayumba', province: 'Nyanga', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Moabi', province: 'Nyanga', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ndindi', province: 'Nyanga', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mabanda', province: 'Nyanga', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Makokou', province: 'Ogooué-Ivindo', neighborhoods: ['Mbolo-Edock', 'Mbolo 3', 'Mbolo 2', 'Mbolo 1', 'Zoatab 2', 'Epassendjé 1', 'Pont Liboumba', 'Bienvenue', 'Ebandangoye 1', 'Ebandangoye 2', 'Epassendjé 2', 'Mbeza', 'Iyoko Ngota', 'Central 2', 'Nzing-Meyong', 'Central 1', 'Essik', 'Allarmintang', 'Nzeng-Ayong', 'Ekowong', 'Haoussa', 'Andock', 'Zouma', 'Ngouabi', 'Mbouala', 'Envouang', 'Loa-Loa', 'Mayiga', 'Edoung Avion', 'Autre quartier'] },
  { name: 'Mékambo', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Djibo', 'Mbelakembé', 'Corniche 1', 'Corniche 2', 'Mayéka', 'Edock', 'Vie chère', 'Vie dure', 'Paris Bouyon', 'Mbembézalé', 'Batouala', 'Autre quartier'] },
  { name: 'Booué', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ovan', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Koulamoutou', province: 'Ogooué-Lolo', neighborhoods: ['Mayang', 'Bataillon', 'Soka', 'Poungou-poungou', 'Moussesse', 'Pembembe', 'Koungou', 'Moukouagna', 'Dakar', 'Bakélé', 'Mikoumou', 'Libongui', 'Litsébé', 'Jardin-four', 'Grand-village', 'Mibaka', 'Bikouala', 'Mayéla', 'Makadium', 'Mabimbi', 'Konadembé', 'Bambomo', 'Bouvendo', 'Mikalo', 'Mandji', 'Nzéla', 'Babambo', 'Autre quartier'] },
  { name: 'Lastoursville', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Pana', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Iboundji', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Port-Gentil', province: 'Ogooué-Maritime', neighborhoods: ['Douanes', 'SBOM', 'CFG', 'OPRAG', 'Zone industrielle du Port', 'Club Hippique', 'SOGARA', 'Derrière-Abela', 'Abela', 'Derrière le Lycée d’État', 'Carrefour Léon-Mba', 'Route ancienne base Dragages', 'Nouvelle Balise 1', 'Carrefour Ngadi', 'Carrefour Miniprix', 'Océan 1', 'Bac Aviation 1', 'Aéroport', 'Asecna', 'Route du Cap Lopez', 'Commissariat central', 'Carrefour Tobia', 'Grand Village 1', 'Carrefour Château-d’eau', 'École Abbé-Yoya', 'Plaine 1', 'Cité SEEG', 'Nouvelle Balise 2', 'Balise 1', 'Balise 2', 'Balise 3', 'Océan 2', 'Bac Aviation 2', 'Carrefour Azokri', 'Boule-Noire', 'Salsa 1', 'Matiti 1', 'Rombintchozo', 'Orovati', 'Sindara', 'Prison Centrale', 'Cimetière Lazaret', 'Carrefour SEEG', 'Grand Village 2', 'Cité Shell', 'Océan 3', 'Mosquée 1', 'Mosquée 2', 'Hassan', 'Transfo', 'Printemps', '3 Métisses', 'Pas à pas', 'Omboué central', 'Exodus', '25 logements', 'Banco', 'Île Mandji', 'Base logistique Elf-Gabon', 'Matanda', 'Iguiri', 'Agripog 2', 'Ntchengué', 'Camp Namina', 'Roger Buttin', 'Cité Akosso', 'Boule-Noire 2', 'Matiti 2', 'Matiti 3', 'Plaine 2', 'Autre quartier'] },
  { name: 'Gamba', province: 'Ogooué-Maritime', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Omboué', province: 'Ogooué-Maritime', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Oyem', province: 'Woleu-Ntem', neighborhoods: ['Akok-Barrage-Ndzomassi', 'Akoakam 1', 'Akoakam 2', 'Akoakam Haoussa', 'Angone 1', 'Angone 2', 'Andome', 'Endome', 'Elone-Abenelang', 'Mekom Nkodje', 'Methui', 'Mont-Miyélé', 'Minka Nfoua', 'Bouloungou', 'Autre quartier'] },
  { name: 'Bitam', province: 'Woleu-Ntem', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mitzic', province: 'Woleu-Ntem', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Minvoul', province: 'Woleu-Ntem', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Médouneu', province: 'Woleu-Ntem', neighborhoods: ['Centre-ville', 'Autre quartier'] },
];

export const GABON_LOCALITY_NAMES = GABON_LOCALITIES.map((locality) => locality.name);

export function getGabonLocality(name: string): GabonLocality | undefined {
  return GABON_LOCALITIES.find((locality) => locality.name.toLocaleLowerCase('fr') === name.trim().toLocaleLowerCase('fr'));
}

export function isGrandLibrevilleLocality(name: string): boolean {
  return ['Libreville', 'Akanda', 'Owendo'].includes(name);
}

export function getNeighborhoodLocality(neighborhoodId: string): string {
  const administrativeArea = getNeighborhoodAdministrativeArea(neighborhoodId).toLocaleLowerCase('fr');
  if (administrativeArea.includes('akanda')) return 'Akanda';
  if (administrativeArea.includes('owendo')) return 'Owendo';
  return 'Libreville';
}

export function buildGabonDeliveryAddress(city: string, neighborhoodName: string, instructions = '', neighborhoodId?: string): string {
  if (neighborhoodId) return buildNeighborhoodDeliveryAddress(neighborhoodId, instructions);
  const parts = [neighborhoodName.trim(), city.trim(), instructions.trim() ? `Repère : ${instructions.trim()}` : '', 'Gabon'].filter(Boolean);
  return parts.join(' · ');
}
