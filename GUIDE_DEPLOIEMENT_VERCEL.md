# Déploiement Gloryday Pharma sur Vercel

## Architecture

Vercel héberge l’interface et l’API Express dans le même projet. Le dossier `dist` contient le site; `api/[...path].ts` transmet les routes `/api/*` au serveur. Supabase conserve les comptes, commandes, catalogue, notifications et sessions.

Ce guide prépare le déploiement, mais ne publie pas le projet et ne modifie pas votre base Supabase. L’application n’est prête à recevoir des données réelles qu’après les étapes ci-dessous et les vérifications de production.

## 1. Préparer Supabase

Dans le SQL Editor du projet Supabase de production, appliquer les migrations dans cet ordre :

1. `supabase/migrations/20261019000001_initial_schema.sql`
2. `supabase/migrations/20261019000002_rls_policies.sql`
3. `supabase/migrations/20261019000003_seed_admin_and_catalog.sql`
4. `supabase/migrations/20261020000002_supabase_app_persistence.sql`
5. `supabase/migrations/20261021000001_staff_accounts.sql`
6. `supabase/migrations/20261021000002_delivery_location_points.sql`
7. `supabase/migrations/20261021000003_admin_simple_role.sql`
8. `supabase/migrations/20261021000004_app_sessions.sql`
9. `supabase/migrations/20261022000001_staff_permissions_and_runtime_settings.sql`
10. `supabase/migrations/20261022000002_seed_full_catalog.sql`

La migration `20261022000002_seed_full_catalog.sql` ajoute les références du catalogue initial absentes de la base, sans modifier les produits déjà présents. Elle est à exécuter une fois sur une base existante qui ne contient pas encore tout le catalogue.

Sur une base déjà utilisée, n’exécutez que les migrations qui lui manquent : ne rejouez pas les migrations de création ou de données. Vérifiez que l’URL et la clé privée du projet de production sont celles que vous voulez raccorder.

## 2. Importer le dépôt dans Vercel

Dans Vercel, créez un projet depuis le dépôt Git. La configuration de ce dépôt lance `npm ci`, puis `npm run build` et publie `dist`. Les fonctions `/api/*` sont déployées dans le même projet.

Dans **Project Settings → Environment Variables**, ajoutez les variables privées suivantes pour **Production** (et séparément pour Preview si vous la configurez) :

| Variable | Valeur |
| --- | --- |
| `SUPABASE_URL` | URL HTTPS du projet Supabase correspondant à cet environnement |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète serveur de ce même projet Supabase |
| `ADMIN_USERNAME` | Identifiant du Super-Admin, par exemple `admin` |
| `ADMIN_PASSWORD` | Mot de passe unique de 8 à 85 caractères |

`SUPABASE_SERVICE_ROLE_KEY` est utilisée uniquement par la fonction serveur Vercel. Ne la préfixez jamais par `VITE_` et ne l’inscrivez jamais dans le code du navigateur. `SUPABASE_PROJECT_REF` est facultative; `DATA_DIR` et `PORT` ne doivent pas être configurées en production.

Après avoir enregistré les variables, lancer un nouveau déploiement. Vercel fournit une adresse `*.vercel.app`; un domaine personnalisé peut être relié dans les réglages du projet.

## 3. Vérifications à faire avant l’ouverture

- Ouvrir l’adresse Vercel et tester l’inscription et la connexion avec un compte de test.
- Tester le tableau de bord Super-Admin et le rôle Admin simple avec des comptes distincts.
- Passer une commande de test et vérifier les notifications du client, Super-Admin, Admin simple, Commercial, Gestionnaire Catalogue et Logistique.
- Vérifier que les sessions restent valides entre plusieurs appels et que la déconnexion les révoque.
- Contrôler les stocks, prix, frais de livraison et statuts de paiement avec des données de test.
- Dans le projet Supabase, mettre l’adresse Vercel réelle comme **Site URL** et ajouter les adresses de retour autorisées si un flux OAuth est activé. Google reste désactivé dans l’application jusqu’à configuration et vérification OAuth.
- Vérifier le GPS sur un téléphone réel, en HTTPS, avec autorisation de géolocalisation et connexion Internet.
- Vérifier que l’usage des tuiles OpenStreetMap correspond au trafic prévu et respecte sa politique; choisir un fournisseur de tuiles avec une offre adaptée si l’activité augmente.

Les sessions client/employé expirent après huit heures. Le jeton du navigateur est un cookie `HttpOnly`; seul son empreinte est enregistrée dans `app_sessions`.

## Organisation des commandes et des livreurs

- Une commande de livraison est affectée à un seul livreur. Le même livreur peut recevoir plusieurs commandes, en les affectant individuellement depuis la logistique.
- Le tableau logistique affiche maintenant le nombre de livraisons actives, les commandes sans livreur et le nombre de commandes actives par livreur. Aucun plafond de charge n'est configuré : l'équipe vérifie la charge avant chaque affectation.
- Chaque commande possède son propre trajet et son propre lien GPS temporaire. Le site ne regroupe pas encore plusieurs adresses en une tournée ni ne répartit automatiquement les commandes.
- À la création d'une commande, le client et les rôles internes prévus (Super-Admin, Admin simple, Commercial, Gestionnaire Catalogue, Logistique) reçoivent une notification dans le site. L'actualisation se fait environ toutes les 20 secondes.
- Le livreur n'a pas encore de compte dans l'application : il ne reçoit pas de notification push ou SMS à l'affectation. La logistique peut l'appeler, lui écrire sur WhatsApp ou lui transmettre son lien GPS. Le client connecté reçoit dans l'application les changements d'affectation et d'étape.

## Suivi GPS du livreur

1. Après l’affectation du coursier et sa prise en charge, ouvrir le suivi dans l’espace Logistique ou Super-Admin.
2. Créer le lien GPS et le transmettre au coursier. Le lien expire après 24 heures.
3. Le coursier ouvre le lien sur son téléphone, appuie sur **Démarrer le partage GPS** et autorise la géolocalisation.
4. La position, le trajet, la destination quand ses coordonnées sont précises et l’heure de mise à jour apparaissent dans la commande. L’envoi se fait environ toutes les 15 secondes.

Le coursier doit garder la page ouverte. Le suivi est révoqué quand la commande est livrée ou annulée; la logistique peut aussi révoquer le lien.

## Limites et éléments qui restent à configurer

- Le déploiement réel n’a pas été lancé depuis ce dossier; il faut rattacher le dépôt à votre compte Vercel et renseigner vos clés privées.
- Supabase doit recevoir les migrations ci-dessus. Une migration SQL préparée dans le dépôt n’est pas automatiquement appliquée par Vercel.
- L’inscription par téléphone ne vérifie pas encore le numéro par SMS/OTP.
- Les annonces et notifications sont internes à l’application; elles n’envoient pas automatiquement de SMS, de notification push ou de WhatsApp.
- Le paiement Mobile Money reste soumis à une vérification manuelle par un Super-Admin; aucune confirmation opérateur n’est intégrée.
- Le livreur ne possède pas encore un rôle/compte indépendant : l’équipe Logistique reçoit la notification de commande.
- Les changements métier sont préparés à partir d’un état chargé en mémoire puis persistés dans Supabase. Avant un usage simultané à grande échelle, il faut renforcer les écritures concurrentes avec des opérations transactionnelles en base pour empêcher deux mises à jour simultanées de s’écraser.
