# Espace Client & Comptes de Structure Multi-Utilisateurs

Refonte de l'espace client Gloryday Pharma pour intégrer l'organisation en structures de santé (cliniques, polycliniques, hôpitaux, labos, pharmacies), la gestion des postes (chargé de commandes, docteur, directeur) et le tableau de bord consolidé de direction avec plafonnement modulable du nombre de comptes.

### User Review & Critical Decisions

> [!IMPORTANT]
> Les arbitrages fonctionnels suivants ont été validés lors de la phase de cadrage et guident l'architecture du module :

- **Plafond modulable de comptes par structure (Confirmé)** : Quota de base fixé à 3 comptes pour les structures de proximité (cabinets médicaux, pharmacies, laboratoires, cliniques) et modulable à 5-10 comptes pour les grands hôpitaux et polycliniques, avec contrôle strict pour éviter tout débordement.
- **Rattachement hybride à l'inscription (Confirmé)** : L'utilisateur peut soit sélectionner une structure existante dans une liste déroulante dynamique pour s'y rattacher (recherche prédictive), soit déclarer une nouvelle structure si elle n'existe pas encore.
- **Périmètre d'action du Directeur validé (Confirmé)** : Consultation exhaustive des achats et statistiques de tous les collaborateurs de l'établissement ET capacité directe de passer des commandes et réassorts pour le compte de la structure.
- **Sécurité et validation administrative** : Un client déclarant le poste de « Directeur » reste au statut standard jusqu'à validation explicite par un administrateur Gloryday via le panneau Super-Admin.

---

### 1. Overview & Core Concept

- **Problème résolu** : Actuellement, un compte client correspond à un utilisateur isolé sans vision d'équipe ni hiérarchie. Dans les structures de santé gabonaises, le personnel soignant ou les acheteurs passent des commandes sur le terrain, tandis que la direction médicale ou financière a besoin d'arbitrer les budgets et de suivre les dépenses globales sans avoir à partager un identifiant unique.
- **Utilisateurs cibles** :
  - **Collaborateur (Docteur / Chargé de commandes)** : passe ses commandes en autonomie, suit ses propres livraisons et ses dépenses périodiques.
  - **Directeur de structure** : supervise l'ensemble des achats réalisés par tous les comptes rattachés à sa clinique/hôpital, analyse les dépenses globales et commande directement.
  - **Administrateur Gloryday (Super-Admin)** : valide les demandes d'accès direction, gère les quotas de comptes et s'assure de l'authenticité des établissements rattachés.
- **Bénéfice clé** : Gouvernance d'achat hospitalière claire, fin du partage dangereux de mot de passe entre collègues et respect de la conformité comptable.

---

### 2. User Experience & Visual Design

#### A. Parcours Inscription & Connexion (`AuthModal`)
1. **Écran Inscription Dédié** :
   - Champs personnels : Nom complet du contact, numéro de téléphone portable gabonais (+241), mot de passe sécurisé.
   - Sélection du **Type de Structure** : Clinique, Polyclinique, Hôpital, Laboratoire, Pharmacie, Cabinet médical.
   - Rattachement d'établissement : Option *« Rejoindre un établissement existant »* (liste déroulante avec filtre instantané) ou *« Enregistrer un nouvel établissement »*.
   - Définition de la **Fonction / Poste** :
     - *Chargé de commandes* : accès immédiat au catalogue et à son panier personnel.
     - *Docteur* : accès immédiat aux commandes de son service.
     - *Directeur* : bannière d'information indiquant : *« Votre compte est créé. L'accès direction consolidé sera activé après vérification par l'équipe Gloryday »*.
   - Vérification du quota : si la structure a déjà atteint son nombre maximal de comptes (ex: 3 pour une clinique), l'inscription bloque poliment avec un message invitant à contacter l'administrateur de l'établissement.

#### B. Tableau de Bord Client Individuel (`ClientDashboard`)
Chaque collaborateur ou docteur connecté dispose d'une vue strictement personnelle :
- **KPIs personnels** : Total des achats validés, commandes en cours de livraison, articles commandés.
- **Filtre de période pour les dépenses** : Sélecteur segmenté (*Aujourd'hui* / *Cette semaine* / *Ce mois-ci* / *Tout l'historique*) avec affichage du montant en FCFA formaté en chiffres tabulaires (`tabular-nums font-mono`).
- **Section « Produits les plus commandés »** : Liste ordonnée par volume avec bouton de réapprovisionnement en 1 clic vers le panier.
- **Historique des commandes personnelles** : Tableau avec référence, date, statut de livraison, montant et téléchargement du PDF officiel.

#### C. Tableau de Bord Direction Consolidé (`StructureDashboard`)
Accessible uniquement aux comptes ayant le statut `directeur_valide` :
- **Bannière d'en-tête Institutionnelle** : Nom de la structure, badge officiel de validation, adresse, type d'établissement et jauge des comptes actifs (ex: *« 3/3 comptes enregistrés »*).
- **Toggle de vue** : Commutateur fluide entre *« Vue Personnelle (Mes achats) »* et *« Vue Consolidée (Toute la structure) »*.
- **Ventilation des dépenses par collaborateur** : Tableau synthétique montrant le montant engagé par chaque membre (ex: Dr. Ondo, M. Bongo Chargé des stocks) sur la période choisie.
- **Graphique et filtres temporels globaux** : Dépenses consolidées par jour, semaine et mois.
- **Action de commande directe** : Le directeur peut basculer sur le catalogue pour commander au nom de la structure.

#### D. Console Administrateur Gloryday (`AdminDashboard` > Onglet Structures)
- Liste des demandes d'accès Direction en attente : affichage du nom, téléphone, justificatif ou structure déclarée.
- Boutons d'action : **Valider l'accès Direction** (notification automatique envoyée au client) ou **Refuser / Requalifier en compte standard**.
- Gestionnaire de quotas par établissement : possibilité pour le Super-Admin d'augmenter le quota d'un grand hôpital (ex: de 3 à 5 ou 10 comptes).

---

### 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Modèle de données unifié `Structure` et liaison `User`**
  - *Choix retenu* : Création d'une entité explicite `HealthcareStructure` distincte de `User`, reliée par `structureId`.
  - *Pourquoi* : Permet d'isoler l'adresse, le quota de comptes, le type d'établissement et le directeur titulaire au niveau de l'établissement, indépendamment des départs ou arrivées de personnel.
  - *Alternative écartée* : Stocker uniquement une chaîne `facilityName` sur chaque utilisateur. Cela entraînait des fautes de frappe et empêchait l'agrégation statistique fiable.

- **Décision 2 : Sécurité « Zéro élévation automatique »**
  - *Choix retenu* : Deux champs distincts sur l'utilisateur : `jobTitle` (déclaration de l'utilisateur : 'directeur' | 'charge_commandes' | 'docteur') et `directorApprovalStatus` ('none' | 'pending' | 'approved' | 'rejected').
  - *Pourquoi* : Même si un pirate s'inscrit en cochant « Directeur », il ne voit aucune donnée globale tant que le flag `directorApprovalStatus === 'approved'` n'a pas été posé côté serveur / admin.

- **Décision 3 : Quotas dynamiques par type d'établissement**
  - *Choix retenu* : Règle métier automatique :
    - Cabinet médical / Pharmacie / Laboratoire / Clinique : limite par défaut de **3 comptes**.
    - Polyclinique : limite par défaut de **5 comptes**.
    - Hôpital / CHU : limite par défaut de **10 comptes** (avec possibilité de personnalisation par l'admin).
  - *Pourquoi* : Répond fidèlement au besoin de terrain tout en évitant les abus et la prolifération de comptes fantômes.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GLORYDAY PHARMA APP                             │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│     ESPACE COLLABORATEUR      │               │     ESPACE DIRECTION VALIDÉE  │
│  (Docteur / Chargé commandes) │               │   (Directeur de structure)    │
├───────────────────────────────┤               ├───────────────────────────────┤
│ • Commandes personnelles      │               │ • Vue consolidée structure    │
│ • Dépenses (J / S / M)        │               │ • Dépenses par collaborateur  │
│ • Top articles personnels     │               │ • Commande au nom structure   │
│ • Réassort rapide             │               │ • Suivi du quota de comptes   │
└──────────────┬────────────────┘               └──────────────┬────────────────┘
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                      STRUCTURES & USERS STORAGE LAYER                         │
├───────────────────────────────────────────────────────────────────────────────┤
│  HealthcareStructure {                                                        │
│    id: string; name: string; type: FacilityType; maxAccounts: number;         │
│    directorUserId?: string; activeAccountIds: string[];                       │
│  }                                                                            │
│                                                                               │
│  User {                                                                       │
│    id: string; phone: string; facilityName: string; structureId: string;      │
│    jobTitle: 'directeur' | 'charge_commandes' | 'docteur';                    │
│    directorApprovalStatus: 'none' | 'pending' | 'approved' | 'rejected';      │
│    role: 'client';                                                            │
│  }                                                                            │
│                                                                               │
│  Order {                                                                      │
│    id: string; reference: string; userId: string; structureId?: string;       │
│    authorName?: string; createdAt: string; estimatedTotal: number; ...        │
│  }                                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
                                       ▲
                                       │ Validation & Quotas
┌──────────────────────────────────────┴────────────────────────────────────────┐
│                        SUPER-ADMIN CONSOLE                                    │
│  • Validation des demandes Direction en attente                               │
│  • Ajustement des plafonds de comptes par hôpital / polyclinique              │
│  • Traçabilité d'audit immuable                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

#### Modèles de données complémentaires (`src/types.ts`)
- `JobTitle` : `'directeur' | 'charge_commandes' | 'docteur'`
- `DirectorApprovalStatus` : `'none' | 'pending' | 'approved' | 'rejected'`
- `HealthcareStructure` :
  - `id: string`
  - `name: string`
  - `type: FacilityType`
  - `maxAccounts: number`
  - `accountCount: number`
  - `directorUserId?: string`
  - `createdAt: string`
- Extension de `User` :
  - `structureId?: string`
  - `jobTitle?: JobTitle`
  - `directorApprovalStatus?: DirectorApprovalStatus`
- Extension de `Order` :
  - `structureId?: string`
  - `createdByName?: string`
  - `createdByJobTitle?: JobTitle`

#### Plan d'intégration pas-à-pas (lors de l'exécution)
1. **Étape 1 (Types & Stockage)** : Définition des types `HealthcareStructure`, `JobTitle` et fonctions d'accès dans `src/utils/structureStorage.ts` et `src/types.ts`.
2. **Étape 2 (Inscription enrichie)** : Mise à jour de `AuthModal.tsx` avec sélection/création d'établissement, choix du poste et contrôle du plafond de comptes.
3. **Étape 3 (Tableau de bord personnel avec filtres)** : Refonte de `ClientDashboard.tsx` pour intégrer le filtre des dépenses (jour, semaine, mois), l'affichage exclusif des données personnelles du collaborateur et les articles les plus fréquents.
4. **Étape 4 (Vue Direction consolidée)** : Intégration dans `ClientDashboard.tsx` de la vue d'équipe pour le directeur validé (total des achats de la structure, filtre temporel, dépenses par collaborateur).
5. **Étape 5 (Validation Admin)** : Ajout de la gestion des demandes de direction et des quotas de structure dans le panneau d'administration Gloryday.
6. **Étape 6 (Contrôle qualité)** : Compilation TypeScript, vérification linter et tests d'étanchéité des données.
