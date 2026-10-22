# Activer Gloryday Pharma avec Supabase

Le raccordement est préparé dans l’application. La migration SQL n’a pas encore été exécutée sur la base.

## 1. Ajouter les éléments nécessaires dans Supabase

1. Ouvrir le projet Supabase de destination.
2. Vérifier que le schéma existant contient déjà les tables de base `profiles`, `products`, `product_variants`, `packs`, `orders`, `order_items`, `quotes`, `direct_messages` et `notifications`.
3. Dans **SQL Editor**, exécuter une migration à la fois, dans cet ordre :
   - `supabase/migrations/20261020000002_supabase_app_persistence.sql`
   - `supabase/migrations/20261021000001_staff_accounts.sql`
   - `supabase/migrations/20261021000002_delivery_location_points.sql`
   - `supabase/migrations/20261021000003_admin_simple_role.sql`
   - `supabase/migrations/20261021000004_app_sessions.sql`

Ces migrations ajoutent les tables et fonctions nécessaires aux comptes, aux données de l’application, aux comptes employés, au suivi GPS et aux sessions. Elles ne créent pas le schéma métier de base et ne suppriment pas les tables ni les données déjà présentes. Si votre projet Supabase est vide ou n’a pas les tables listées ci-dessus, arrêtez-vous avant la première migration : le schéma de départ doit être préparé et vérifié séparément. Ne lancez pas les anciens scripts rangés dans `sql/legacy` ou `supabase/legacy-migrations` sur une base existante.

## 2. Relier le serveur à la base

Dans le gestionnaire de secrets de l’hébergeur qui fait tourner le site, ajouter les valeurs du fichier `.env.example`, notamment :

- `SUPABASE_URL` : l’adresse du projet Supabase de l’environnement visé (préproduction ou production). Ne réutilisez pas l’URL de production en préproduction.
- `SUPABASE_PROJECT_REF` : facultatif si `SUPABASE_URL` est défini. Si les deux sont renseignés, ils doivent correspondre au même projet.
- `SUPABASE_SERVICE_ROLE_KEY` : une clé secrète Supabase, réservée au serveur.
- `ADMIN_USERNAME` et `ADMIN_PASSWORD` : identifiants administrateur, avec un mot de passe unique de 8 à 85 caractères.
- `DATA_DIR` : un dossier privé et persistant fourni par l’hébergeur.

Ne pas mettre la clé secrète dans le navigateur, dans une variable `VITE_*`, dans le ZIP ou dans une conversation. Utiliser la clé secrète de serveur, jamais la clé publique `sb_publishable_...`.

Après avoir ajouté ces valeurs, reconstruire et redémarrer le serveur. L’application doit être hébergée sur un service Node.js, avec une seule instance active. Un hébergement statique seul ne suffit pas pour les commandes et les connexions.

Le serveur ne choisit plus de projet Supabase par défaut : si une clé est définie sans URL ni référence de projet, il s’arrête au démarrage au lieu d’envoyer les données vers une base implicite.

## État

Le ZIP contient le raccordement, la migration et l’audit. Tant que la migration n’a pas été lancée et que les secrets ne sont pas ajoutés au serveur, le site n’enregistre pas encore ses données dans Supabase.
