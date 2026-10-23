# Activer les notifications push Gloryday Pharma

Les campagnes restent visibles dans la cloche de l’application. Les notifications push sont envoyées aux clients qui les activent sur leur appareil; l’application ne demande jamais l’autorisation automatiquement.

## 1. Appliquer la migration Supabase

Dans le SQL Editor du projet Supabase, exécuter le fichier `supabase/migrations/20261023000004_push_subscriptions.sql`. La table conserve uniquement les abonnements des appareils, avec accès réservé au serveur.

## 2. Générer les clés VAPID

Depuis le dépôt, lancer `npx web-push generate-vapid-keys --json`. Conserver la clé privée uniquement dans les variables privées de Vercel. Ne pas la placer dans `APP_PUBLIC_*`, dans le code, dans un ZIP ou dans GitHub.

## 3. Ajouter les variables du projet Vercel

Dans **Settings → Environment Variables**, ajouter les variables suivantes pour **Production** et **Preview** si les aperçus doivent aussi envoyer des notifications :

- `VAPID_PUBLIC_KEY` : la clé publique générée. Elle est intégrée au navigateur au moment de la compilation.
- `VAPID_PRIVATE_KEY` : la clé privée générée, gardée secrète.
- `VAPID_SUBJECT` : une adresse de contact valide, par exemple `mailto:contact@votre-domaine.ga`.

Garder également `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` dans les variables serveur privées existantes. Ne jamais créer une variable `VITE_SUPABASE_SERVICE_ROLE_KEY`.

Après avoir enregistré les variables, lancer un nouveau déploiement Vercel pour compiler la clé publique dans l’application.

## 4. Activer sur chaque appareil client

Le client se connecte au site en HTTPS, ouvre la cloche **Notifications**, puis clique **Activer les notifications push** et accepte la demande du navigateur. Chaque navigateur ou appareil doit être activé séparément. Les campagnes, les nouvelles commandes et leurs changements de statut ou de paiement utilisent alors cet abonnement.
