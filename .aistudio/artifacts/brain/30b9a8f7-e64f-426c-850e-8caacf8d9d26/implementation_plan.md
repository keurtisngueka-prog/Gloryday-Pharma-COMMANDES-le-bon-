# Gloryday Pharma Gabon : Notifications WhatsApp par Étape de Livraison & Délais Dynamiques par Quartier de Libreville

Ce plan détaille la mise en œuvre de deux fonctionnalités opérationnelles majeures validées pour optimiser les commandes médicales au Gabon : l'automatisation des notifications WhatsApp à chaque étape de préparation/livraison, ainsi que le calcul dynamique des délais et conditions de livraison selon les quartiers de Libreville. Il répond également avec clarté à la question de la concurrence multi-utilisateurs simultanée.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Réponse officielle à la question sur les connexions simultanées (20+ clients en même temps) :**
> - **Aucun impact négatif ni conflit de panier** : Chaque client se connecte depuis son propre navigateur / smartphone dans un bac à sable local totalement indépendant. Deux ou vingt clients connectés en même temps ont chacun leur propre panier isolé et étanche.
> - **Gestion des commandes simultanées** : Chaque commande est horodatée et reçoit une référence unique et incrémentale (ex: `CMD-2026-0042`). Les commandes arrivent dans la file logistique sans risque de télescopage ni d'écrasement.

> [!NOTE]
> **Décisions confirmées par vos réponses :**
> 1. **Notifications WhatsApp Automatiques à Chaque Étape** : Déclenchement en un clic de messages formatés sur mesure pour le client à chaque jalon (Validation de commande, Préparation en cours, Remise au coursier avec nom et numéro, et Livraison effectuée).
> 2. **Délais de Livraison Précis par Quartier de Libreville** : Sélecteur intelligent des zones et quartiers de Libreville (Akanda, Batterie IV, Louis, Centre-Ville, Oloumi, Nzeng-Ayong, Charbonnages, Owendo, etc.) avec calcul en temps réel du délai d'acheminement estimé et récapitulatif sur le bon de commande.

---

### 1. Overview & Core Concept

- **What It Does** :
  - Permet aux cliniques et pharmacies de sélectionner leur quartier précis à Libreville lors du passage de commande, affichant immédiatement le délai de livraison estimé (ex. *30 à 45 min pour Batterie IV / Centre-Ville*, *45 à 60 min pour Akanda*, *60 à 90 min pour Owendo*).
  - Fournit au Super-Admin et à l'équipe logistique un module de notification WhatsApp automatisé : dès qu'une commande change de statut ou passe un jalon de livraison, un message WhatsApp pré-rempli et certifié Gloryday Pharma est prêt à être expédié au client ou au coursier.
  - Offre un suivi en direct interactif pour les clients avec le délai estimé adapté à leur localisation.
- **Target Audience** :
  - **Établissements de santé (Cliniques, Pharmacies, Hôpitaux)** : Transparence totale sur l'heure d'arrivée des dispositifs médicaux critiques.
  - **Équipe Logistique & Super-Admin Gloryday** : Communication WhatsApp fluide, sans ressaisie manuelle ni oubli d'information.
  - **Coursiers médicaux** : Attribution claire du quartier et contact direct avec le responsable de réception.

---

### 2. User Experience & Visual Design

#### A. Sélection du Quartier & Délai Estimé dans le Panier (`CartView.tsx`)
- **Sélecteur de Quartier Intuitif** :
  - Remplacement du simple champ texte d'adresse par un sélecteur groupé des quartiers majeurs de Libreville & Périphérie :
    - *Zone 1 (Centre & Affaires)* : Centre-Ville, Batterie IV, Louis, Glass, Oloumi, Mont-Bouët, Boulevard Triomphal (~30 à 45 min).
    - *Zone 2 (Nord / Estuaire)* : Akanda, Angondjé, Avorbam, La Sablière, Cap Estérias (~45 à 60 min).
    - *Zone 3 (Est Urbain & Vallons)* : Nzeng-Ayong, Charbonnages, Plein-Ciel, Sotéga, Kinguélé, PK5 à PK12 (~45 à 75 min).
    - *Zone 4 (Sud Maritime / Industriel)* : Owendo, Port d'Owendo, Alénakiri, Sni (~60 à 90 min).
    - *Option Quartier Personnalisé* : Possibilité de préciser des repères locaux gabonais (ex. *« Face Clinique Chambrier, à côté de la pharmacie »*).
- **Badge Dynamique d'Acheminement** :
  - Affichage en temps réel dans le panier d'un indicateur visuel moderne :
    `[Camion Express] Délai estimé vers Batterie IV : ~35 - 45 min · Départ Entrepôt Central`.

#### B. Générateur de Notifications WhatsApp Automatiques (`AdminDashboard.tsx` & `DeliveryTrackingModal.tsx`)
- **Bouton d'Action Rapide « WhatsApp Client »** présent sur chaque commande dans le tableau de bord Super-Admin et dans le modal de suivi.
- **Génération Contextuelle selon l'Étape** :
  - *Étape 1 : Commande Confirmée* :
    > « Bonjour [Nom Établissement], votre commande Gloryday Pharma n° *CMD-2026-XXXX* de [Montant] FCFA est bien confirmée. Préparation immédiate pour livraison à [Quartier]. Délai estimé : [Délai]. »
  - *Étape 2 : Prise en charge par le Coursier* :
    > « Votre commande n° *CMD-2026-XXXX* a été confiée à notre coursier médical [Nom Coursier] ([Téléphone]). Elle est en route vers [Quartier]. »
  - *Étape 3 : Arrivée Imminente / Acheminement* :
    > « Notre coursier approche de votre établissement à [Quartier]. Merci de préparer la réception et le contrôle du scellé médical. »
  - *Étape 4 : Livraison Effectuée* :
    > « Commande n° *CMD-2026-XXXX* livrée avec succès à [Nom Établissement]. Facture & bordereau disponibles sur votre espace Gloryday. Merci de votre confiance ! »
- **Bouton WhatsApp 1-Clic** ouvrant l'application WhatsApp ou WhatsApp Web directement avec le numéro du client et le texte pré-rempli.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 : Zones de Libreville Prédéfinies avec Précision Libre**
  - *Approche* : Liste déroulante des grands quartiers avec repères + champ de complément d'adresse libre.
  - *Pourquoi* : À Libreville, les adresses postales n'existent pas toujours formellement ; les livreurs naviguent par quartiers et repères visuels (carrefours, pharmacies, écoles). Ce système combine la précision d'estimation et la réalité du terrain.

- **Decision 2 : Déclenchement WhatsApp Hybride (Web/Mobile Intent)**
  - *Approche* : Liens profonds `https://wa.me/241XXXXXXXX?text=...` testés pour fonctionner aussi bien sur smartphone (ouverture de WhatsApp) que sur ordinateur (WhatsApp Web / Desktop).
  - *Pourquoi* : 100% fiable, ne nécessite pas d'abonnement coûteux à l'API Meta Cloud ni de serveur intermédiaire complexe, tout en offrant une réactivité instantanée pour l'équipe sur le terrain.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ARCHITECTURE LOGISTIQUE & WHATSAPP                   │
│                                                                        │
│   Client choisit Quartier dans Libreville                              │
│   (Batterie IV / Akanda / Owendo / Nzeng-Ayong...)                     │
│                           │                                            │
│                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │ Matrice des Délais & Zones (zonesLibreville.ts)            │       │
│   │ -> Calcul du Délai Estimé + Priorité d'urgence             │       │
│   └───────────────────────┬────────────────────────────────────┘       │
│                           │                                            │
│                           ▼                                            │
│   ┌────────────────────────────────────────────────────────────┐       │
│   │ Commande Enregistrée avec zone & deliveryEstimated         │       │
│   └───────────────────────┬────────────────────────────────────┘       │
│                           │                                            │
│              ┌────────────┴────────────┐                               │
│              ▼                         ▼                               │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │ Changement d'Étape  │   │ Déclenchement Notification WhatsApp  │   │
│   │ Logistique          │──>│ Template dynamique + Numéro Client   │   │
│   │ (Admin / Coursier)  │   │ Envoi 1-clic direct                  │   │
│   └─────────────────────┘   └──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Fichiers & Composants Impactés lors de la réalisation :
1. **`src/data/librevilleZones.ts`** :
   - Référentiel des quartiers de Libreville avec délais moyens, distances relatives et conseils d'acheminement.
2. **`src/components/CartView.tsx` & `src/components/OrderPreviewModal.tsx`** :
   - Intégration du sélecteur de quartiers et affichage en temps réel du délai estimé.
3. **`src/components/DeliveryTrackingModal.tsx` & `src/components/AdminDashboard.tsx`** :
   - Ajout des boutons de notification WhatsApp contextuels pour chaque jalon de livraison.
4. **`src/types.ts`** :
   - Enrichissement du modèle avec les informations de quartier et de statut de notification.
