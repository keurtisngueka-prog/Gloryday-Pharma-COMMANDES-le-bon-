# Plan d'Implémentation : Intégration Complète des Nouveautés & Préservation des Acquis

Ce plan détaille l'intégration harmonieuse de l'ensemble des modules et améliorations détectés dans les mises à jour, tout en préservant scrupuleusement l'ensemble des fonctionnalités déjà opérationnelles (**remise à zéro du panier au clic logo**, **sauvegarde synchrone à la fermeture du navigateur**, **section 'Mes Statistiques & Fidélité' avec réassort en 1-clic**).

---

## 1. Vue d'Ensemble des Nouveautés à Intégrer

### A. Graphique d'Évolution des Ventes Mensuelles (`SalesMonthlyChart` avec Recharts)
- **Localisation** : `AdminDashboard.tsx`, onglet « Vue d'ensemble & KPIs ».
- **Fonctionnalités** :
  - Visualisation en aire interactive (`AreaChart`) de l'évolution du chiffre d'affaires sur les 6 derniers mois (en FCFA).
  - Bascule d'affichage entre **Chiffre d'Affaires** et **Volume de Commandes**.
  - Infobulle personnalisée (`CustomTooltip`) affichant le CA mensuel net, le nombre de commandes traitées et le panier moyen.
  - Cartouches récapitulatifs : Croissance sur 6 mois, meilleur mois réalisé, et volume cumulé.
  - Données calculées dynamiquement à partir des commandes réelles de l'application, avec complétion intelligente pour les mois antérieurs.

### B. Module de Paiement Mobile Gabon (`MobilePaymentModal`)
- **Localisation** : Déclenchable depuis le panier (`CartView.tsx`), le suivi de commande (`OrderConfirmationView.tsx`) et le panneau administrateur.
- **Fonctionnalités** :
  - Support natif des deux opérateurs de paiement mobile au Gabon :
    - **Airtel Money Gabon** (Code marchand, syntaxe USSD `*150#`, instructions étape par étape).
    - **Moov Money Gabon** (Code marchand, syntaxe USSD `*555#`, validation par code secret).
  - Saisie et vérification du numéro de transaction / référence SMS opérateur pour validation comptable immédiate.

### C. Suite de Scripts SQL & Sécurité RLS (`sql/`)
- Mise à disposition structurée des scripts PostgreSQL / Supabase dans le projet :
  - `sql/01_schema.sql` : Schéma complet DDL des tables (profiles, products, orders, commercial_quotes, notifications).
  - `sql/02_securite_rls.sql` : Politiques de Row Level Security (RLS) protégeant les données médicales et isolant les sessions clients du staff.
  - `sql/03_creer_admin.sql` : Provisionnement des rôles administrateurs, commerciaux et livreurs avec fonction `promouvoir_en_admin`.
  - `sql/04_migration_application.sql` : Migration des données de semence et catalogue 39 articles.

---

## 2. Préservation Intégrale des Fonctionnalités Existantes

- **Logo Reset** : Tout clic sur le logo GLORYDAY Pharma (Navbar & AppSidebar) réinitialise le panier à 0, vide le stockage local et redirige vers le catalogue avec notification toast.
- **Sauvegarde Synchrone** : Écouteurs `beforeunload`, `pagehide` et `visibilitychange` garantissant que le panier ne se perde jamais lors d'une fermeture brutale ou mise en veille mobile.
- **Mes Statistiques & Fidélité** : Maintien intégral dans `ClientDashboard.tsx` de la fréquence moyenne en jours, des badges de statut fidélité (Bronze, Argent, Or VIP) et du Top 5 des articles avec réapprovisionnement direct.

---

## 3. Étapes d'Exécution Prévues

1. **Dépendances** :
   - Installation du paquet `recharts` via `install_applet_package`.
2. **Création des Nouveaux Composants** :
   - Création de `src/components/SalesMonthlyChart.tsx`.
   - Création de `src/components/MobilePaymentModal.tsx`.
   - Création du dossier `sql/` avec les 4 scripts SQL (`01_schema.sql`, `02_securite_rls.sql`, `03_creer_admin.sql`, `04_migration_application.sql`).
3. **Connexion & Intégration dans l'App** :
   - Intégration de `SalesMonthlyChart` dans `AdminDashboard.tsx`.
   - Intégration du modal de paiement mobile dans `CartView.tsx` et `App.tsx`.
4. **Vérification** :
   - Validation via `lint_applet` et `compile_applet`.
