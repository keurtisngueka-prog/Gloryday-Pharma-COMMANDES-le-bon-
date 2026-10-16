import { Product } from '../types';
import { MEDICAL_SPECIALTIES } from '../data/initialProducts';

export function getProductSpecialty(product: Product): string {
  if (product.specialty) {
    return product.specialty;
  }

  const name = (product.name || '').toLowerCase();
  const sub = (product.subcategory || '').toLowerCase();
  const cat = (product.category || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const text = `${name} ${sub} ${cat} ${desc}`;

  if (text.includes('chirurg') || text.includes('bistouri') || text.includes('lame') || text.includes('suture') || text.includes('champ opératoire') || text.includes('trocart') || text.includes('cautère')) {
    return 'chirurgie';
  }
  if (text.includes('seringue') || text.includes('catheter') || text.includes('cathéter') || text.includes('cathlon') || text.includes('aiguille') || text.includes('perfuseur') || text.includes('robinet 3') || text.includes('perfusion') || text.includes('intraveineuse')) {
    return 'perfusion';
  }
  if (text.includes('pansement') || text.includes('compresse') || text.includes('bande') || text.includes('gaze') || text.includes('sparadrap') || text.includes('coton') || text.includes('tulle') || text.includes('escarre')) {
    return 'pansements';
  }
  if (text.includes('maternité') || text.includes('foetal') || text.includes('cordon') || text.includes('ombilical') || text.includes('pédiatrique') || text.includes('bébé') || text.includes('couveuse') || text.includes('gynéco') || text.includes('speculum')) {
    return 'maternite';
  }
  if (text.includes('urgence') || text.includes('réanimation') || text.includes('oxygèn') || text.includes('masque haute') || text.includes('insufflateur') || text.includes('ambu') || text.includes('aspirateur de mucosités') || text.includes('brancard') || text.includes('défibrillateur')) {
    return 'urgence';
  }
  if (text.includes('gant') || text.includes('masque') || text.includes('charlotte') || text.includes('blouse') || text.includes('désinfectant') || text.includes('alcool') || text.includes('savon') || text.includes('stérilisation') || text.includes('antiseptique') || text.includes('eau oxygénée')) {
    return 'hygiene';
  }
  if (text.includes('tdr') || text.includes('test') || text.includes('réactif') || text.includes('tube') || text.includes('laboratoire') || text.includes('bandelette') || text.includes('pipette') || text.includes('paludisme') || text.includes('vih') || text.includes('microscope')) {
    return 'laboratoire';
  }

  return 'perfusion';
}

export function getSpecialtyLabel(specialtyId: string): string {
  const found = MEDICAL_SPECIALTIES.find(s => s.id === specialtyId);
  return found ? found.label : 'Général';
}
