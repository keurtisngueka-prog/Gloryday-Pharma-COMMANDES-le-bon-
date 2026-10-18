# Gloryday Pharma Enterprise : Refonte Intégrale Back-Office & Opérations

Ce plan détaille le déploiement unifié du centre d'administration et des opérations de **Gloryday Pharma Gabon**, couvrant l'audit de traçabilité, la gestion B2B des comptes clients, le stock réel avec lots et péremptions, les flux financiers (acompte/solde, rapprochement mobile money), le paramétrage sans code et le pilotage analytique.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Les deux arbitrages clés validés lors de la phase de cadrage régissent l'architecture de cette refonte :
> 1. **Architecture Unifiée** : Déploiement global au sein d'un centre d'administration modulaire intégré, offrant une navigation fluide par sous-modules tout en maintenant les accès par rôle (`Super-Admin`, `Commercial`, `Gestionnaire Catalogue`, `Logistique`).
> 2. **Politique des Plafonds & Stocks** : Application en **mode indicatif avec journalisation d'audit** (non bloquant). Les alertes de dépassement d'encours ou de stock faible s'affichent clairement pour alerter les équipes sans paralyser les livraisons d'urgence des cliniques et hôpitaux.

- **Décision Confirmée 1** : Centre de contrôle unifié avec onglets spécialisés (KPIs, Commandes & Finances, Stocks & Lots, Clients B2B, Packs & Offres, Paramètres Généraux, Audit Log, Sauvegardes).
- **Décision Confirmée 2** : Mode indicatif pour les seuils et plafonds de crédit avec inscription automatique de tout dépassement dans le journal d'audit immuable.

---

### 1. Overview & Core Concept

- **Ce que fait le système** : Transforme Gloryday Pharma en une plateforme de distribution pharmaceutique B2B de grade entreprise. Les opérateurs gèrent la traçabilité des dispositifs médicaux (lots, péremptions, mouvements d'entrée/sortie), la santé financière des comptes (crédit accordé, acomptes, double vérification Airtel/Moov), l'affectation des coursiers et l'audit continu de chaque action.
- **Utilisateurs cibles** : Direction pharmaceutique (`Super-Admin`), commerciaux terrain (`Commercial`), gestionnaires de stocks (`Gestionnaire Catalogue`) et répartiteurs logistiques (`Logistique`).
- **Valeur ajoutée** : Conformité réglementaire sur les dispositifs médicaux, élimination des fraudes sur les références Mobile Money, automatisation des relances et autonomie totale de gestion sans modification de code source.

---

### 2. User Experience & Visual Design

#### Navigation & Hiérarchie du Centre d'Administration
L'interface adopte une structure SaaS haute densité (densité de données optimisée, typographie claire, chiffres tabulaires `tabular-nums`, zero-pill discipline) articulée autour d'un ruban d'onglets ergonomique :

1. **Tableau de Bord & Pilotage** : 6 cartes KPIs enrichies, graphique d'évolution sur 14 jours et 6 mois, répartition par statut, marge brute estimée, chiffre d'affaires par commercial, par zone géographique et par catégorie, analyse des produits dormants (>45 jours sans mouvement).
2. **Commandes & Rapprochement Financier** : Table haute densité avec recherche multi-critères (référence, établissement, commercial, zone, statut, mode de paiement), pagination, actions groupées, gestion des paiements échelonnés (acompte + solde), vérificateur anti-doublon des références Airtel/Moov Money, bordereau de livraison avec signature/photo et sélection rapide dans l'annuaire des coursiers.
3. **Stocks Réels, Lots & Approvisionnements** : Inventaire quantitatif avec décrémentation automatique, seuils d'alerte configurables, fiches de lots avec dates de péremption, enregistrement des mouvements (Entrée, Sortie, Perte/Casse, Inventaire), gestion des fournisseurs et bons de réapprovisionnement, historique des prix d'achat/vente et import/export CSV.
4. **Comptes Clients & Encours B2B** : Statuts des comptes (Actif, En attente de validation, Suspendu, Bloqué), plafond de crédit indicatif avec jauge d'encours, balance âgée des créances, historique d'achats complet, fusion des comptes doublons et relances directes.
5. **Gestion des Packs & Compositions** : Écran dédié pour concevoir, activer/désactiver, chiffrer et illustrer les packs de dotation clinique (ex: Pack Césarienne, Pack Réanimation).
6. **Journal d'Audit Immuable** : Flux chronologique inaltérable recensant chaque mutation (auteur, rôle, horodatage, adresse IP/appareil, action, valeur avant/après), avec filtres par catégorie d'action et recherche textuelle.
7. **Paramètres Sans Code** : Configuration en direct des zones de livraison et frais, remises par volume, codes promotionnels, numéros marchands Airtel/Moov, horaires d'ouverture, mentions légales et en-tête des devis/factures PDF.
8. **Sauvegarde, Restauration & Conformité** : Export instantané JSON/SQL complet, restauration par téléversement de fichier, suppression/anonymisation des données clients (droit à l'oubli).

---

### 3. Key Product Decisions & Trade-Offs

- **Journal d'Audit Inaltérable** : Stockage local et synchronisé avec structure sécurisée (ID unique, hash d'horodatage, empreinte d'appareil). Les entrées d'audit ne disposent d'aucun mécanisme de suppression ou modification depuis l'interface utilisateur.
- **Rapprochement Airtel / Moov avec Détection de Doublons** : Contrôle automatique de l'unicité de la référence de transaction saisie par les clients pour prévenir les tentatives de réutilisation d'un même reçu de paiement.
- **Gestion des Lots & Péremptions Indicatives** : Chaque référence produit dispose d'une collection de lots (`lotNumber`, `expiryDate`, `quantityAvailable`). En commande, le lot le plus proche de la péremption (FEFO - First Expired, First Out) est suggéré automatiquement.
- **Annuaire des Coursiers Centralisé** : Remplace la saisie manuelle répétitive par une liste de coursiers référencés (nom, téléphone, véhicule, matricule) avec assignation en 1 clic.

---

### 4. Technical Architecture & System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GLORYDAY ENTERPRISE CORE                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     ▼                                 ▼                                 ▼
┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
│     MODULE COMMERCIAL     │ │   GESTION DES STOCKS      │ │    FINANCES & AUDIT       │
│ ───────────────────────── │ │ ───────────────────────── │ │ ───────────────────────── │
│ • Fiches Clients B2B      │ │ • Stocks Quantitatifs     │ │ • Acomptes & Soldes       │
│ • Plafonds & Encours      │ │ • Lots & Péremptions      │ │ • Anti-doublons Airtel/Moov│
│ • Devis & Packs Dédiés    │ │ • Mouvements & Pertes     │ │ • Factures & Avoirs       │
│ • Relances Ciblées        │ │ • Réapprovisionnements    │ │ • Journal d'Audit Immuable│
│ • Fusion de Doublons      │ │ • Import / Export CSV     │ │ • Sauvegarde / Import DB  │
└─────────────┬─────────────┘ └─────────────┬─────────────┘ └─────────────┬─────────────┘
              │                             │                             │
              └─────────────────────────────┼─────────────────────────────┘
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           CENTRE DE CONTRÔLE ADMIN                                  │
│  [Vue KPIs]  [Commandes & Rapprochement]  [Stocks & Lots]  [Clients]  [Audit] ...   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

#### Modèles de Données Clés
- **AuditEntry** : `id`, `timestamp`, `userId`, `userName`, `userRole`, `actionType`, `targetEntity`, `targetId`, `deviceInfo`, `details`, `previousState`, `newState`.
- **StockBatch** : `id`, `productId`, `lotNumber`, `expiryDate`, `quantity`, `purchasePrice`, `supplierName`, `receivedDate`.
- **StockMovement** : `id`, `productId`, `lotNumber`, `type` ('entree' | 'sortie_commande' | 'perte_casse' | 'inventaire'), `quantity`, `reason`, `date`, `performedBy`.
- **Courier** : `id`, `name`, `phone`, `vehicleType`, `matricule`, `activeOrdersCount`, `status`.
- **PaymentInstallment** : `id`, `type` ('acompte' | 'solde'), `amount`, `paymentMethod`, `transactionRef`, `status`, `paidAt`, `validatedBy`.
- **InvoiceRecord** : `id`, `orderId`, `type` ('facture' | 'avoir'), `number`, `issueDate`, `tvaRate`, `totalTTC`, `balanceDue`.
- **SystemSettings** : `deliveryZones`, `volumeDiscounts`, `promoCodes`, `operationalHours`, `merchantNumbers`, `pdfHeaderInfo`.

---

### 5. Phases d'Exécution & Vérification

1. **Enrichissement des Types & Utilitaires Métier** :
   - Mise à jour de `src/types.ts` avec les interfaces d'audit, lots, mouvements de stock, paiements échelonnés, coursiers, factures/avoirs et paramètres.
   - Création de `src/utils/auditLogger.ts` pour la journalisation automatique de toutes les mutations.
   - Création de `src/utils/systemSettingsStorage.ts` pour la persistance locale des paramètres modifiables sans code.

2. **Refonte & Expansion des Composants d'Administration** :
   - **Journal d'Audit** : Création de `src/components/AuditLogModule.tsx` avec filtrage par type d'action, utilisateur, date et recherche.
   - **Gestion B2B Clients** : Extension de la vue clients avec suspension/blocage, plafonds indicatifs, balance âgée et fusion.
   - **Stock & Lots Réels** : Création de `src/components/StockLotsModule.tsx` gérant quantités réelles, alertes de seuils, lots FEFO, mouvements et import/export CSV.
   - **Commandes & Finances** : Intégration des acomptes/soldes, validation renforcée Airtel/Moov avec détection de doublons, assignation coursier via annuaire, et émission d'avoirs.
   - **Gestionnaire de Packs** : Intégration directe de la gestion complète des packs dans le portail d'administration.
   - **Paramétrage Sans Code** : Interface complète pour ajuster zones, remises, codes promo et coordonnées marchandes.
   - **Pilotage & Rapports** : Affichage des graphiques et métriques avancées (marges, commerciaux, zones, produits dormants).

3. **Sauvegardes & Synchronisation Globale** :
   - Export et import complet (restauration d'état depuis un fichier JSON).
   - Validation via `compile_applet` et vérification de non-régression sur le panier et l'espace client.
