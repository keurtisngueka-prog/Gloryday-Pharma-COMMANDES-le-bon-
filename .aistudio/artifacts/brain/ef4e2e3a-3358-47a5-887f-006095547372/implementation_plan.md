# Plan d'Implémentation : Intégration des Modules d'Audit, Réassort Stocks & Paramètres Système dans le Tableau de Bord Administrateur

Ce plan formalise l'intégration transparente des modules d'audit des opérations, de réassort des stocks et de configuration des paramètres système au sein du portail d'administration modernisé, tout en conservant scrupuleusement l'ensemble des fonctionnalités développées conjointement (connexion Google 1-clic, automatisation WhatsApp sécurisée, gestionnaire de brouillons hors-ligne et paiements mobiles).

---

## 1. Synthèse du Projet & Intentions Validées

### A. Respect des choix utilisateurs
1. **Périmètre des modules à réintégrer** :
   - **Journal d'Audit Système (`AuditLogModule.tsx`)** : Traçabilité des actions critiques (connexions, modifications de statut de commandes, envois WhatsApp automatiques, mises à jour de stocks).
   - **Réassort & Disponibilité Stocks (`StockLotsModule.tsx`)** : Suivi des niveaux de stock avec gestion simplifiée (disponible / rupture sans complexité de lots imposée), alertes de seuil bas et réassort rapide.
   - **Paramètres Système & Standard WhatsApp (`SystemSettingsModule.tsx`)** : Configuration des numéros marchands Airtel Money (`077 00 30 04`) / Moov Money (`066 24 03 99`), standard d'assistance WhatsApp et modèles de messages automatiques.
2. **Organisation ergonomique** :
   - Intégration sous forme de **sous-onglets thématiques harmonieux** dans `AdminDashboard.tsx`, sans alourdir la vue d'ensemble principale.
3. **Conservation intégrale des acquis** :
   - Authentification Google 1-clic avec complétion clinique (`AuthModal.tsx`).
   - Tableau de bord client modernisé avec KPIs et suivi direct live (`ClientDashboard.tsx`).
   - Automatisation WhatsApp en arrière-plan à chaque étape de livraison (`DeliveryTrackingModal.tsx` & `api.ts`).
   - Gestionnaire de brouillons et commandes hors-ligne (`DraftsManagerModal.tsx`).

---

## 2. Architecture & Navigation dans le Portail Administrateur

### A. Schéma d'Architecture des Onglets
```
┌────────────────────────────────────────────────────────────────────────┐
│             Portail Direction & Logistique (AdminDashboard)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌──────────────┬────────────────┼──────────────┬──────────────┐
    ▼              ▼                ▼              ▼              ▼
[ Vue KPIs ]  [ Commandes ]    [ Stocks & ]   [ Journal ]   [ Paramètres ]
  Chiffres      Expéditions     Réassort       d'Audit       Système
  Affaires,     & WhatsApp      Alertes        Actions       Numéros
  Tendances     Automatique     Ruptures       Opérateurs    Paiement / WA
```

### B. Détail des Nouveaux Modules Intégrés

1. **Module Journal d'Audit & Sécurité (`src/components/AuditLogModule.tsx`)** :
   - Consultation chronologique de toutes les actions enregistrées dans l'application.
   - Filtres par type d'action : Commandes, Livraisons, Stocks, Authentifications, WhatsApp.
   - Recherche textuelle par référence, utilisateur ou date.
   - Bouton d'exportation du journal au format JSON / CSV.

2. **Module Réassort & Disponibilité Stocks (`src/components/StockLotsModule.tsx`)** :
   - Vue dédiée au pilotage des approvisionnements du dépôt central de Libreville.
   - Filtrage rapide des articles en rupture de stock nécessitant une commande fournisseur.
   - Calcul instantané des besoins de réapprovisionnement par catégorie.
   - Bascule immédiate entre état disponible et rupture avec historique des ajustements.

3. **Module Paramètres Système & Standard (`src/components/SystemSettingsModule.tsx`)** :
   - Gestion des coordonnées opérationnelles de Gloryday Pharma Gabon :
     - Numéro Airtel Money marchand : `077 00 30 04`
     - Numéro Moov Money marchand : `066 24 03 99`
     - Ligne d'urgence WhatsApp 24/7 : `+241 77 003 004`
   - Personnalisation des modèles de messages WhatsApp automatiques pour chaque étape de livraison.
   - Persistance des réglages dans le stockage local et synchronisation automatique.

---

## 3. Plan Technique & Flux de Données

### A. Fichiers & Composants Impactés
- `src/components/AuditLogModule.tsx` : Création du module d'audit haute lisibilité.
- `src/components/StockLotsModule.tsx` : Création du module de pilotage des réassorts et ruptures.
- `src/components/SystemSettingsModule.tsx` : Création du panneau de configuration des intégrations et paiements.
- `src/components/AdminDashboard.tsx` :
  - Ajout des nouveaux sous-onglets dans la barre de navigation : `audit`, `lots`, `settings`.
  - Conditionnement de l'accès selon les rôles (ex: `Super-Admin` pour audit et paramètres, `Gestionnaire Catalogue` pour réassort stocks).
- `src/utils/auditLogger.ts` : Helper léger pour centraliser l'horodatage des événements dans `localStorage`.
- `src/utils/systemSettingsStorage.ts` : Helper pour stocker et charger les paramètres globaux (Airtel/Moov/WhatsApp).

---

## 4. Points de Vérification & Tests

1. **Vérification de la conservation des fonctionnalités existantes** :
   - Connexion Google en 1-clic opérationnelle avec affichage du profil et complétion clinique.
   - Tableau de bord client moderne avec KPIs, suivi coursier direct et téléchargement PDF.
   - Sécurisation stricte de l'ordre de mission coursier (masqué pour les clients).
   - Brouillons hors-ligne toujours accessibles et synchronisables.
2. **Vérification des nouveaux modules dans le portail Admin** :
   - Accéder à l'onglet « Journal d'Audit » : vérifier la présence des logs récents et le filtrage.
   - Accéder à l'onglet « Réassort & Stocks » : vérifier la détection des ruptures et la mise à jour des disponibilités.
   - Accéder à l'onglet « Paramètres Système » : tester la modification et la sauvegarde des numéros marchands.
3. **Validation TypeScript & Build** :
   - Exécution de `lint_applet` et `compile_applet` sans aucune erreur ni régression.
