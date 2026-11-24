# Créer les comptes des employés

Le Super-Admin gère les accès depuis **Comptes employés & rôles** dans l’espace d’administration.

## Créer un compte

1. Ouvrir **Comptes employés & rôles**.
2. Saisir le nom de la personne et son identifiant de connexion, par exemple `aline.commercial`.
3. Choisir son rôle : Admin simple, Commercial, Gestionnaire Catalogue, Logistique ou Secrétaire.
4. Choisir un mot de passe de 8 à 85 caractères et le saisir deux fois.
5. Cliquer sur **Créer le compte**, puis transmettre l’identifiant et le mot de passe à l’employé de façon privée.

L’employé se connecte ensuite dans l’espace équipe avec cet identifiant et ce mot de passe. Son rôle est attribué par le Super-Admin et ne peut pas être choisi depuis le formulaire de connexion.

Le rôle **Secrétaire** donne accès au répertoire client et à la création de proformas. Il permet de suivre les commandes créées par ce compte, sans ouvrir le carnet de commandes complet. La facturation et la gestion du stock ne sont pas activées par défaut.

## Modifier ou désactiver un compte

Le bouton **Modifier** permet de changer le nom, l’identifiant, le rôle ou le mot de passe. Pour garder le mot de passe actuel, laisser les deux champs de mot de passe vides. Le bouton **Désactiver** coupe l’accès sans effacer les anciennes actions de cette personne; son compte pourra être réactivé plus tard.

Les comptes qui portent la mention **Réglages serveur** proviennent de l’ancienne configuration `STAFF_ACCOUNTS_JSON`. Ils restent utilisables, mais se modifient dans les réglages privés du serveur.

## Première activation dans Supabase

La table privée dédiée aux employés doit être créée une seule fois avec le fichier `supabase/migrations/20261021000001_staff_accounts.sql`. Si la page affiche que la table manque, utiliser **Copier le SQL de mise à jour**, coller le SQL dans l’éditeur SQL du projet Supabase et l’exécuter, puis redémarrer le serveur.

Si la base refuse la création d’un compte Secrétaire à cause de la valeur du rôle, vérifier que la migration `supabase/migrations/20261109000001_secretary_staff_role.sql` a bien été appliquée au projet Supabase.

Les mots de passe ne sont jamais renvoyés à l’écran après leur enregistrement. La base conserve uniquement leur empreinte hachée.
