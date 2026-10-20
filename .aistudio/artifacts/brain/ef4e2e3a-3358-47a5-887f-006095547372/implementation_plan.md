# Plan de Mise en Production & Sécurisation Avant Déploiement

Ce plan détaille les opérations de verrouillage sécuritaire, de nettoyage des données de démonstration et d'activation du serveur backend centralisé afin que l'application **Gloryday Pharma Gabon** soit prête pour un déploiement immédiat en production.

---

## 1. Synthèse des Corrections de Production Validées

1. **Verrouillage des accès Administrateur & Clients (`AuthModal.tsx` & `api.ts`)** :
   - Suppression intégrale de l'encadré affichant les identifiants administrateur en clair dans la fenêtre de connexion.
   - Suppression des boutons de connexion rapide de démonstration (*Clinique Sainte-Marie*, *Pharmacie du Bord de Mer*) sur l'écran de connexion client.
   - Remplacement de l'adresse Google codée en dur (`chidisstore3@gmail.com`) par une saisie d'adresse Google propre à chaque praticien.
   - Mise en place d'un mot de passe administrateur robuste (`Gloryday@2026!`) modifiable à tout moment depuis l'onglet **Paramètres Système** du portail Direction.

2. **Purge des Données Fictives (État Vierge de Production)** :
   - Suppression des commandes fictives pré-chargées (`GP-2026-0089`, `GP-2026-0042`) pour qu'aucun établissement client ne voie de commandes étrangères.
   - Suppression des entrées fictives dans le **Journal d'Audit** (`DEFAULT_SEED_LOGS`) pour ne tracer que les opérations réelles.
   - Remplacement des chiffres d'affaires fictifs par un calcul dynamique en temps réel basé exclusivement sur les vraies commandes passées.

3. **Activation du Serveur Backend Centralisé (`server.ts`)** :
   - Mise en place d'un serveur **Express + Vite** sur le port `3000` avec stockage persistant côté serveur (`data/store.json`).
   - Centralisation en temps réel :
     - Des commandes clients, statuts, étapes de livraison (`DeliveryStage`) et historiques d'envois WhatsApp.
     - Du catalogue officiel de produits et des bascules de stock (`Disponible` / `En rupture`).
     - Des comptes établissements inscrits (téléphone ou Google) et des devis commerciaux.
     - Des KPIs financiers et logistiques du portail Direction (`/api/admin/stats`).

---

## 2. Architecture Cible de Production

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Clients (Cliniques, Hôpitaux, Pharmacies)            │
│   • Catalogue & Panier  • Connexion Google / Tél  • Suivi Direct Live    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ Requêtes REST (/api/*)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  Serveur Backend Express (server.ts - Port 3000)         │
│   • /api/products & /api/packs (Catalogue & Ruptures synchronisées)      │
│   • /api/orders (Commandes, Mobile Money, Étapes Livraison, WhatsApp)    │
│   • /api/auth/* (Authentification Client, Google & Admin sécurisé)       │
│   • /api/admin/stats (KPIs calculés sur les ventes réelles)              │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│             Portail Direction & Logistique (AdminDashboard)              │
│   • KPIs Réels  • Expéditions & WhatsApp Auto  • Réassort  • Audit       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Fichiers Créés & Modifiés

- **`server.ts` (Nouveau)** : Serveur Express complet gérant toutes les routes `/api/*`, la persistance des données de production dans `data/store.json`, le middleware Vite en développement et le service des fichiers statiques `dist/` en production.
- **`package.json`** : Configuration des scripts `"dev": "tsx server.ts"` et `"start": "tsx server.ts"` pour le déploiement full-stack.
- **`src/components/AuthModal.tsx`** :
  - Retrait de tous les indices de mots de passe et boutons de démonstration.
  - Saisie propre de l'email Google professionnel lors de la connexion Google en 1-clic.
- **`src/components/SystemSettingsModule.tsx` & `src/utils/systemSettingsStorage.ts`** :
  - Ajout d'une section sécurisée permettant au Super-Admin de modifier son mot de passe administrateur de production.
- **`src/api.ts` & `src/utils/auditLogger.ts`** :
  - Connexion directe aux routes `/api/auth/*`, `/api/orders/*`, `/api/products/*` et `/api/admin/stats`.
  - Suppression des commandes, clients et journaux d'audit fictifs.
  - Ajout d'une purge automatique des anciennes clés de démonstration du navigateur lors de la mise en production.

---

## 4. Plan de Vérification Avant Déploiement

1. **Contrôle de sécurité** : Vérifier qu'aucun mot de passe ni compte de démonstration n'apparaît dans `AuthModal`.
2. **Contrôle de l'état initial** : Vérifier que les compteurs de commandes et le journal d'audit démarrent à `0` (hors catalogue de produits officiel).
3. **Synchronisation Backend** : Vérifier que la création d'une commande ou le passage d'un produit en rupture est immédiatement enregistré par `/api/*`.
4. **Validation Build & TypeScript** : Exécuter `lint_applet`, `compile_applet` et redémarrer le serveur full-stack sans erreur.
