import { buildNeighborhoodDeliveryAddress, getNeighborhoodAdministrativeArea } from './librevilleZones.js';

export interface GabonLocality {
  name: string;
  province: string;
  neighborhoods?: string[];
}

// The list starts with the provincial capitals and adds the main communes and
// departmental towns used in the national administrative directory.
export const GABON_LOCALITIES: GabonLocality[] = [
  { name: 'Libreville', province: 'Estuaire' },
  { name: 'Akanda', province: 'Estuaire' },
  { name: 'Owendo', province: 'Estuaire' },
  { name: 'Ntoum', province: 'Estuaire', neighborhoods: ['Ntoum Centre', 'Okolassi', 'Nkok', 'Essassa', 'Bikélé', 'Autre quartier'] },
  { name: 'Kango', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Cocobeach', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ndzomoé', province: 'Estuaire', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Franceville', province: 'Haut-Ogooué', neighborhoods: ['Ngoungoulou', 'Lékèye', 'Bapili', 'Ngobounda', 'Yockot', 'Grand-Village', 'Corniche I', 'Corniche II', 'Djaka', 'Ongali', 'Engala', 'Ombele Mvouna', 'Angoubou', 'Allélé', 'Ondzeyi', 'Ondzieni', 'Epimbi', 'Dialogue', 'Ayassi', 'Ongouegne', 'La Paix', 'Montagne-Sainte', 'Ondimba', 'Ondouama', 'Mangoungou', 'Menaye', 'Carrière', 'Matébélé I', 'Matébélé II', 'Bakou', 'Pickas', 'Mimboumba', 'Kessala', 'Léconi', 'Akou', 'Mbaya', 'Djoueri', 'Makana', 'Mingara', 'Maboukou', 'Maba', 'Yéné', 'Djakana', 'Autre quartier'] },
  { name: 'Moanda', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mounana', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Léconi', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Okondja', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Akiéni', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Bongoville', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Bakoumba', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ngouoni', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Onga', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Aboumi', province: 'Haut-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Lambaréné', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Dakar', 'Atongowanga', 'Lalala', 'Faisceau Hertzien', 'Château', 'Grand-Village 1', 'Grand-Village 2', 'Point-V', 'Adouma', 'Moussamoukougou', 'Abongo', 'Sainte-Thérèse', 'Atsié', 'Agnidzouma', 'Isaac', 'Magnang', 'Petit-Paris 1', 'Petit-Paris 2', 'Petit-Paris 3', 'Malébé', 'Météré', 'Mitoumili', 'Mbilandzambi', 'Autre quartier'] },
  { name: 'Ndjolé', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Makouké', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Bifoun', province: 'Moyen-Ogooué', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Mouila', province: 'Ngounié', neighborhoods: ['Tsouka', 'Divindet', 'Dourouni 1', 'Dourouni 2', 'Minembe', 'Motoboko', 'Moukoundza', 'Mandjiassango', 'Diouronda', 'Moukoumouna', 'Bouala', 'Ngoyina', 'Moutzanoupinza', 'Dikongo', 'Didjanou', 'Baleka', 'Bavanga', 'Pambou', 'Mangui', 'Autre quartier'] },
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
  { name: 'Makokou', province: 'Ogooué-Ivindo', neighborhoods: ['Mbolo-Edock', 'Mbolo 3', 'Mbolo 2', 'Mbolo 1', 'Ebandangoye 2', 'Ebandangoye 1', 'Zoatab 2', 'Epassendjé 1', 'Epassendjé 2', 'Pont Liboumba', 'Bienvenue', 'Mbeza', 'Iyoko Ngota', 'Edoung Avion', 'Central 2', 'Nzing-Meyong', 'Central 1', 'Essik', 'Allarmintang', 'Nzeng-Ayong', 'Ekowong', 'Haoussa', 'Andock', 'Zouma', 'Ngouabi', 'Mbouala', 'Envouang', 'Loa-Loa', 'Mayiga', 'Autre quartier'] },
  { name: 'Mékambo', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Booué', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Ovan', province: 'Ogooué-Ivindo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Koulamoutou', province: 'Ogooué-Lolo', neighborhoods: ['Mayang', 'Bataillon', 'Soka', 'Poungou-poungou', 'Moussesse', 'Pembembe', 'Koungou', 'Moukouagna', 'Dakar', 'Bakélé', 'Mikoumou', 'Libongui', 'Litsébé', 'Jardin-four', 'Grand-village', 'Mibaka', 'Bikouala', 'Mayéla', 'Makadium', 'Mabimbi', 'Konadembé', 'Bambomo', 'Bouvendo', 'Mikalo', 'Mandji', 'Nzéla', 'Babambo', 'Autre quartier'] },
  { name: 'Lastoursville', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Pana', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Iboundji', province: 'Ogooué-Lolo', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Port-Gentil', province: 'Ogooué-Maritime', neighborhoods: ['Centre-ville', 'Château', 'Balise', 'Grand-Village', 'Matiti', 'Sindara', 'Salsa', 'Rombintchozo', 'Orovati', 'Azokri', 'Lalala', 'Quaben', 'Autre quartier'] },
  { name: 'Gamba', province: 'Ogooué-Maritime', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Omboué', province: 'Ogooué-Maritime', neighborhoods: ['Centre-ville', 'Autre quartier'] },
  { name: 'Oyem', province: 'Woleu-Ntem', neighborhoods: ['Akoakam', 'Angone', 'Centre-ville', 'Autre quartier'] },
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
