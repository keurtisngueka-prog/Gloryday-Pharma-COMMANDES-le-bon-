# Révision Globale : Authentification Réelle, Statut de Session Contextuel, Maintien Super-Admin & Cloisonnement des Paniers

Ce plan d'implémentation révisé prend en compte l'ensemble des anomalies remontées pour garantir une étanchéité totale, une identification vérifiée et une expérience professionnelle sans aucun faux état.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Les 4 correctifs fondamentaux validés pour cette révision :
> 1. **Vérification Réelle des Mots de Passe & Téléphones** : Remplacement du mécanisme de secours qui connectait n'importe quelle saisie sous l'identité « Polyclinique El Rapha ». La connexion n'aboutit que si les identifiants correspondent à un compte enregistré (ou aux identifiants Super-Admin définis). Une erreur explicite est affichée en cas de saisie invalide.
> 2. **Bandeau Supérieur & Entête Contextuels (« Le truc en haut »)** :
>    - **Mode Invité** : Affiche clairement `Mode Visiteur Invité` sans aucun nom d'établissement ou de docteur fictif.
>    - **Mode Client** : Affiche le nom réel de l'établissement qui s'est connecté (`currentUser.facilityName`).
>    - **Mode Super-Admin** : Affiche `Direction Générale Gloryday [Super-Admin] · Accès Privilégié`.
> 3. **Navigation du Logo GLORYDAY en Mode Super-Admin** : Le clic sur le logo de la marque ne rétrograde plus l'administrateur vers une vue client : il maintient le statut d'administrateur et oriente vers le Tableau de Bord Super-Admin (`admin`).
> 4. **Isolation Stricte des Paniers** : Cloisonnement strict des clés de stockage (`gloryday_cart_user_{id}` vs `gloryday_cart_guest`), chargement exclusif du panier du compte lors de la connexion, et réinitialisation pour le visiteur suivant à la déconnexion.

---

### 1. Overview & Core Concept

- **What It Does** :
  - Assure une gestion authentique des sessions (clients, invités, super-admin).
  - Empêche les connexions fantômes avec de faux mots de passe.
  - Dynamise le bandeau supérieur pour qu'il reflète exactement la session en cours.
  - Conserve la casquette administrateur sur toutes les actions de navigation, y compris sur le logo.
  - Cloisonne les paniers de commande pour une indépendance totale entre structures de santé.
- **Target Audience** :
  - **Super-Administrateurs** : Navigation étanche, maintien permanent de l'espace d'administration.
  - **Établissements Clients** : Connexion sécurisée sur leur propre fiche d'établissement, panier dédié.
  - **Visiteurs Invités** : Découverte du catalogue en mode invité propre sans données résiduelles.

---

### 2. User Experience & Visual Design

#### A. Bandeau Supérieur Contextuel (`Navbar.tsx`)
- **En mode Invité** :
  - Texte : `Gloryday Pharma Gabon · Fournisseur certifié d'équipements & consommables hospitaliers`
  - Zone session : `Mode Visiteur Invité` avec lien rapide `[Se connecter / Créer un compte]`.
  - Aucune référence à un compte de démonstration résiduel.
- **En mode Client Connecté** :
  - Zone session : `Connecté : [Nom de l'établissement] · [Nom du contact]`.
  - Bouton Déconnexion accessible.
- **En mode Super-Admin** :
  - Zone session : Badge sombre `Direction Générale Gloryday [Super-Admin]`.
  - Bouton rapide d'accès direct au panneau Super-Admin.

#### B. Comportement du Logo GLORYDAY (`Navbar.tsx`)
- Lorsque l'utilisateur est connecté en tant que **Super-Admin** :
  - Le clic sur le logo redirige vers `admin` (Tableau de Bord Super-Admin) au lieu de basculer sur le catalogue public standard.
  - Un ruban ou bouton discret permet de prévisualiser le catalogue en mode administrateur si souhaité sans jamais perdre sa session.
- Lorsque l'utilisateur est en mode **Client ou Invité** :
  - Le clic sur le logo redirige vers `catalog`.

#### C. Validation Réelle de la Connexion (`AuthModal.tsx` & `api.ts`)
- Le formulaire vérifie désormais les identifiants saisis dans le registre local d'utilisateurs (`gloryday_registered_users`) :
  - **Comptes valides de démo** :
    - Clinique Sainte-Marie : `+24177001122` / `client123`
    - Pharmacie du Bord de Mer : `+24166334455` / `pharma123`
    - Super-Admin : `admin` ou `+24177003004` / `admin` (ou `gloryday2026`)
  - **Nouveaux inscrits** : Tout compte créé via l'onglet « Créer un compte » est persisté et immédiatement connectable avec son mot de passe choisi.
- **En cas d'erreur de mot de passe** : Message d'erreur rouge clair dans le modal : « Identifiants incorrects. Veuillez vérifier votre numéro ou mot de passe ». Aucune connexion n'est autorisée par défaut.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1 : Registre Local d'Utilisateurs Fiable (Client-Side Database)**
  - *Approche* : Stocker les utilisateurs enregistrés dans `localStorage` sous `gloryday_registered_users` avec initialisation de comptes pilotes réels, plutôt que de dépendre d'un appel réseau défaillant avec fallback aveugle.
  - *Pourquoi* : Dans un environnement SPA sans backend SQL persistant, cela garantit une vérification stricte des mots de passe, évite les connexions accidentelles avec n'importe quelle frappe, et permet aux nouveaux utilisateurs de créer de vrais comptes distincts.

- **Decision 2 : Redirection du Logo selon le Rôle Actif**
  - *Approche* : Si `currentUser?.role === 'Super-Admin'`, le logo renvoie vers `admin`. Sinon, il renvoie vers `catalog`.
  - *Pourquoi* : Pour un administrateur, l'espace naturel d'accueil est son tableau de bord de pilotage. Cela supprime l'impression de « redevenir client ».

- **Decision 3 : Cloisonnement Total des Paniers**
  - *Approche* : Clés dynamiques `gloryday_cart_user_${id}` et `gloryday_cart_guest`. Réinitialisation à la déconnexion.
  - *Pourquoi* : Évite toute fuite ou confusion de commandes entre blocs opératoires ou cliniques concurrentes.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│               FLUX D'AUTHENTIFICATION & SESSIONS GLORYDAY             │
│                                                                        │
│   Utilisateur saisit Téléphone / Identifiant + Mot de passe            │
│                                   │                                    │
│                                   ▼                                    │
│       ┌────────────────────────────────────────────────────────┐       │
│       │ Validation stricte dans gloryday_registered_users       │       │
│       │ (ou clé Super-Admin admin/admin)                       │       │
│       └───────────────────────────┬────────────────────────────┘       │
│                                   │                                    │
│             ┌─────────────────────┴─────────────────────┐              │
│             ▼ VALIDE                                    ▼ INVALIDE     │
│   ┌───────────────────────────┐               ┌───────────────────┐    │
│   │ 1. Établissement du Token │               │ Afficher Message  │    │
│   │ 2. Mise à jour Navbar     │               │ d'erreur rouge    │    │
│   │    - Super-Admin / Client │               │ Connexion refusée │    │
│   │ 3. Chargement Panier Propre│              └───────────────────┘    │
│   │    gloryday_cart_user_{id}│                                        │
│   │ 4. Si Admin -> Route #admin│                                       │
│   └───────────────────────────┘                                        │
└────────────────────────────────────────────────────────────────────────┘
```

#### Modifications Concrètes Prévues :
1. **`src/api.ts`** :
   - Mise en place d'un registre d'authentification robuste avec initialisation des comptes de démo et persistance des inscrits.
   - Refus strict si le mot de passe ne correspond pas au compte.
   - Correction de `getCurrentUser()` pour ne renvoyer une session que si le token est authentique.
2. **`src/components/Navbar.tsx`** :
   - Redirection du logo vers `admin` si `role === 'Super-Admin'`.
   - Affichage dynamique du bandeau supérieur : `Mode Visiteur Invité` quand déconnecté (suppression définitive du Dr. Mengue en dur).
3. **`src/App.tsx` & `src/components/CartView.tsx`** :
   - Cloisonnement des paniers par compte utilisateur.
   - Réinitialisation propre à la déconnexion.
   - Bannière contextuelle d'attribution de commande.
