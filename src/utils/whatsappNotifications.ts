import { Order, DeliveryStage } from '../types';
import { computeDeliveryTimeWindow } from '../data/librevilleZones';

export interface WhatsAppNotificationPayload {
  stageKey: string;
  stageTitle: string;
  recipientRole: 'client' | 'coursier' | 'logistique';
  recipientName: string;
  recipientPhone: string;
  messageText: string;
  directUrl: string;
}

export function formatGabonPhone(phone: string): string {
  if (!phone) return '24177003004';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('241')) return clean;
  if (clean.length === 8 || clean.length === 9) return `241${clean.slice(-8)}`;
  return clean || '24177003004';
}

export function generateWhatsAppMessageForStage(
  order: Order,
  stage: DeliveryStage | 'confirmed' | 'created'
): WhatsAppNotificationPayload {
  const facility = order.customer.facilityName || 'Établissement de santé';
  const contact = order.customer.contactName || facility;
  const rawClientPhone = order.customer.phone || '';
  const clientPhoneFormatted = formatGabonPhone(rawClientPhone);
  const ref = order.reference || 'CMD-2026';
  const neighborhood = order.deliveryZone || order.customer.city || 'Libreville';
  const estimatedTime = order.deliveryEstimated || 'Dans 45 à 60 minutes';
  const timeWindow = computeDeliveryTimeWindow(order.customer.neighborhoodId).timeWindow;
  const courierName = order.courier?.name || 'Alexandre Moundounga (Livreur Médical Gloryday)';
  const courierPhone = order.courier?.phone || '+241 77 003 004';
  const totalFmt = order.estimatedTotal?.toLocaleString('fr-FR') || '0';
  const itemsCount = order.items?.length || 0;

  switch (stage) {
    case 'created':
    case 'confirmed': {
      const text = 
`🏥 *GLORYDAY PHARMA GABON* · *Confirmation de Commande*
----------------------------------------
Bonjour *${contact}* (*${facility}*),

Votre commande médicale n° *${ref}* a bien été confirmée par notre direction logistique.

📋 *Récapitulatif :*
• Articles : ${itemsCount} référence(s)
• Montant : *${totalFmt} FCFA*
• Mode de paiement : ${order.isPaid ? '✅ Déjà réglé' : 'À réception'}
• Destination : *${neighborhood}* (${order.customer.deliveryAddress})
⏱️ *Créneau d'arrivée prévu :* *${timeWindow}* (${estimatedTime})

📦 Vos dispositifs et consommables sont actuellement préparés en zone stérile à notre entrepôt central. Vous recevrez un avis dès la prise en charge par le coursier.

Merci de votre confiance !
📞 Urgences Logistique : +241 77 003 004
🌐 Suivi : Gloryday Pharma Gabon`;

      return {
        stageKey: 'confirmed',
        stageTitle: 'Commande Confirmée & Enregistrée',
        recipientRole: 'client',
        recipientName: contact,
        recipientPhone: rawClientPhone,
        messageText: text,
        directUrl: `https://wa.me/${clientPhoneFormatted}?text=${encodeURIComponent(text)}`
      };
    }

    case 'preparation': {
      const text = 
`📦 *GLORYDAY PHARMA GABON* · *Colisage & Préparation en cours*
----------------------------------------
Bonjour *${contact}* (*${facility}*),

Votre commande n° *${ref}* est en cours d'emballage et de scellé médical à notre Dépôt Central de Libreville.

📍 *Zone de livraison :* *${neighborhood}*
⏱️ *Créneau d'arrivée prévu :* *${timeWindow}* (${estimatedTime})

Le colis médical est vérifié selon les normes hospitalières et sera remis au coursier dédié dans quelques minutes.

Gloryday Pharma Gabon · Fournisseur Hospitalier Certifié`;

      return {
        stageKey: 'preparation',
        stageTitle: 'Colisage & Préparation Dépôt',
        recipientRole: 'client',
        recipientName: contact,
        recipientPhone: rawClientPhone,
        messageText: text,
        directUrl: `https://wa.me/${clientPhoneFormatted}?text=${encodeURIComponent(text)}`
      };
    }

    case 'picked_up': {
      const text = 
`🏍️ *GLORYDAY PHARMA GABON* · *Prise en charge par le Coursier*
----------------------------------------
Bonjour *${contact}* (*${facility}*),

Votre commande n° *${ref}* a été remise à notre coursier médicalisé.

👤 *Livreur assigné :* *${courierName}*
📞 *Contact direct livreur :* *${courierPhone}*
📍 *Destination :* ${order.customer.deliveryAddress} (*${neighborhood}*)
⏱️ *Créneau d'arrivée estimé :* *${timeWindow}*

Le coursier dispose du caisson isotherme / scellé médical d'origine. Merci de préparer l'accueil pour la réception.

Gloryday Pharma Gabon · Service Expéditions`;

      return {
        stageKey: 'picked_up',
        stageTitle: 'Prise en charge Coursier',
        recipientRole: 'client',
        recipientName: contact,
        recipientPhone: rawClientPhone,
        messageText: text,
        directUrl: `https://wa.me/${clientPhoneFormatted}?text=${encodeURIComponent(text)}`
      };
    }

    case 'in_transit': {
      const text = 
`🚚 *GLORYDAY PHARMA GABON* · *Arrivée Imminente à votre Établissement*
----------------------------------------
Bonjour *${contact}* (*${facility}*),

Notre coursier *${courierName}* est actuellement en approche immédiate de votre structure à *${neighborhood}*.

📍 *Adresse :* ${order.customer.deliveryAddress}
📦 *Commande :* *${ref}* (${itemsCount} article(s))
📞 *Numéro du coursier :* ${courierPhone}

Merci de vous assurer de la disponibilité de la personne en charge de la réception médicale et de l'émargement du bordereau.

À tout de suite !
Gloryday Pharma Gabon`;

      return {
        stageKey: 'in_transit',
        stageTitle: 'En Approche Imminente',
        recipientRole: 'client',
        recipientName: contact,
        recipientPhone: rawClientPhone,
        messageText: text,
        directUrl: `https://wa.me/${clientPhoneFormatted}?text=${encodeURIComponent(text)}`
      };
    }

    case 'delivered': {
      const text = 
`✅ *GLORYDAY PHARMA GABON* · *Livraison Effectuée avec Succès*
----------------------------------------
Bonjour *${contact}* (*${facility}*),

Nous confirmons que votre commande médicale n° *${ref}* a bien été livrée et réceptionnée à *${facility}* (${neighborhood}).

📄 *Bordereau & Facture :*
Les documents certifiés ont été remis avec le colis et restent consultables sur votre espace client Gloryday.

Nous vous remercions pour votre confiance continue au service de la santé au Gabon !

Des questions ou un réassort urgent ?
📞 Service Client : +241 77 003 004
🌐 Gloryday Pharma Gabon`;

      return {
        stageKey: 'delivered',
        stageTitle: 'Livraison Complétée & Émargée',
        recipientRole: 'client',
        recipientName: contact,
        recipientPhone: rawClientPhone,
        messageText: text,
        directUrl: `https://wa.me/${clientPhoneFormatted}?text=${encodeURIComponent(text)}`
      };
    }
  }
}

export function generateCourierMissionWhatsApp(order: Order): WhatsAppNotificationPayload {
  const courierPhone = order.courier?.phone || '+241 77 003 004';
  const courierPhoneFormatted = formatGabonPhone(courierPhone);
  const ref = order.reference || 'CMD-2026';
  const facility = order.customer.facilityName;
  const contact = order.customer.contactName || facility;
  const phone = order.customer.phone;
  const address = order.customer.deliveryAddress;
  const neighborhood = order.deliveryZone || 'Libreville';
  const estimatedTime = order.deliveryEstimated || 'Dès que possible';
  const notes = order.customer.notes ? `\n⚠️ *Instructions particulières :* ${order.customer.notes}` : '';

  const text = 
`📋 *ORDRE DE MISSION COURSIER MÉDICAL* · *GLORYDAY PHARMA*
----------------------------------------
Bonjour Alexandre, nouvelle mission de livraison prioritaire :

📦 *Commande :* *${ref}*
🏥 *Destinataire :* *${facility}*
📍 *Quartier :* *${neighborhood}*
🗺️ *Adresse & Repère :* ${address}${notes}
👤 *Contact Réception :* ${contact} (📞 *${phone}*)
⏱️ *Délai cible :* *${estimatedTime}*
💰 *Encaissement :* ${order.isPaid ? 'Rien à encaisser (Déjà payé)' : `À encaisser en espèces : *${order.estimatedTotal.toLocaleString('fr-FR')} FCFA*`}

Scellé médical obligatoire au départ du dépôt. Bonne route et prudence !`;

  return {
    stageKey: 'courier_mission',
    stageTitle: 'Ordre de Mission Coursier',
    recipientRole: 'coursier',
    recipientName: order.courier?.name || 'Alexandre Moundounga',
    recipientPhone: courierPhone,
    messageText: text,
    directUrl: `https://wa.me/${courierPhoneFormatted}?text=${encodeURIComponent(text)}`
  };
}
