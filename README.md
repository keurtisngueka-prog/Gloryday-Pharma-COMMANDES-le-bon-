# Gloryday Pharma — configuration sécurisée

## Aperçu local sur Windows

Après avoir extrait l’archive, double-cliquez sur `START_LOCAL_PREVIEW.cmd`. Le lanceur installe les dépendances si nécessaire, choisit automatiquement un port libre entre `4173` et `4199`, démarre le site avec un catalogue de démonstration et affiche l’adresse à ouvrir ainsi qu’un mot de passe admin temporaire. Appuyez sur `Ctrl+C` dans la fenêtre du serveur pour l’arrêter.

Cet aperçu utilise des données locales de démonstration et ne se connecte pas à Supabase. N’y saisissez aucune donnée réelle de client et ne déployez pas cette configuration de développement en production.

## Déploiement sur Vercel

Vercel héberge le site et l’API Express dans le même projet. Les routes `/api/*` sont exécutées comme fonction Vercel et les données persistantes restent dans Supabase. Suivre le [guide de déploiement Vercel](GUIDE_DEPLOIEMENT_VERCEL.md) pour les migrations et les variables privées.

Le serveur refuse de démarrer en production si Supabase n’est pas configuré. Les mots de passe employés sont hachés côté serveur. `/tmp` sert uniquement de cache temporaire sur Vercel.

## Communication avec les clients

Dans le compte Super-Admin, ouvrir **Clients & Contacts**, puis utiliser **Informer tous les clients** pour publier une annonce dans leur cloche de notifications. Le bouton **Message Direct** reste disponible pour écrire à un seul client; un message envoyé par le canal In-App ajoute aussi une notification à sa cloche. Ces annonces sont visibles dans l'application, mais ne sont pas des notifications push, des SMS ou des envois WhatsApp automatiques.

Lorsqu’un client passe commande, une notification dans l’application est créée pour le client et pour les rôles Super-Admin, Admin simple, Commercial, Gestionnaire Catalogue et Logistique. L’application vérifie les nouvelles notifications toutes les 20 secondes. Le livreur n’a pas de compte distinct : l’équipe Logistique reçoit l’alerte. Aucun SMS, push mobile ou message WhatsApp automatique n’est envoyé.

## Comptes et rôles

- Le Super-Admin crée les collaborateurs dans **Comptes employés & rôles**. Le rôle **Admin simple** donne accès au tableau de bord et aux opérations, sans réglages système, comptes employés ni export ou migration SQL. Les autres rôles sont `Commercial`, `Gestionnaire Catalogue` et `Logistique`. Les anciens comptes déclarés dans `STAFF_ACCOUNTS_JSON` restent visibles en lecture seule.
- Les clients s’inscrivent avec leur téléphone et un mot de passe. Les mots de passe sont dérivés avec un sel avant stockage. Les sessions sont conservées dans Supabase afin qu’elles fonctionnent avec les fonctions Vercel.
- Google est désactivé jusqu’à la mise en place d’un véritable flux OAuth vérifié.

Les routes privées vérifient la session, le rôle et, pour les commandes clients, l’identifiant du compte. Les prix, les frais de livraison et le statut payé sont calculés ou contrôlés sur le serveur. Une référence Mobile Money soumise par un client reste « en attente » jusqu’à vérification manuelle par un Super-Admin.

## Stock avant ouverture des commandes

Renseignez dans le catalogue le stock réellement compté pour chaque produit avant d’accepter des commandes. Un produit sans stock renseigné, ou avec un stock nul, est affiché comme indisponible et l’API refuse sa commande. Le serveur réserve les quantités quand une commande est créée et les restitue si elle est annulée avant le départ du colis. Les comptes des produits déjà présents dans la base doivent être vérifiés et renseignés dans l’administration.

Pour utiliser la nouvelle page des comptes employés, voir [le guide de gestion des employés](GUIDE_COMPTES_EMPLOYES.md).

## Services externes et stockage

- La clé serveur Supabase est obligatoire en production. Elle est enregistrée dans les variables privées Vercel et utilisée uniquement par la fonction serveur; le serveur échoue au démarrage si elle manque.
- La table `app_users` contient les comptes applicatifs et les empreintes de mots de passe. La migration la réserve au rôle serveur Supabase; ne donnez jamais cette clé à l’interface du navigateur.
- La table `app_staff_accounts` contient les comptes employés et leurs mots de passe hachés. Seul le serveur accède à cette table avec la clé privée Supabase.
- Les sessions expirent après huit heures. Seule l’empreinte SHA-256 du jeton est stockée dans la table `app_sessions`, protégée par RLS et réservée au rôle serveur.
- L’envoi automatique WhatsApp et la vérification automatique Airtel/Moov ne sont pas configurés. Les écrans n’annoncent plus ces actions comme automatiques.
- L’inscription par téléphone ne vérifie pas la possession du numéro par SMS. Configurez une vérification OTP avant d’utiliser le téléphone comme preuve d’identité d’un nouveau client.

Au premier démarrage sur un ancien `store.json`, le serveur re-hache les anciens mots de passe en clair, enlève l’ancien mot de passe administrateur par défaut et remet en attente les anciens paiements Mobile Money qui n’ont pas de preuve de validation serveur. Les anciennes commandes ne sont pas automatiquement attribuées à un client : l’ancienne API permettait de les créer sans session et leur propriétaire doit être vérifié avant toute réassociation. Les anciens cookies de démonstration et mots de passe enregistrés dans le navigateur sont supprimés.
