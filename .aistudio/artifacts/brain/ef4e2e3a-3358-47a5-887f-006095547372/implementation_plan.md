# Restauration des Améliorations Catalogue, Identité Visuelle (Logo) & Sécurité Administrateur

Ce plan détaille le rétablissement des contrôles de sélection directe sur chaque carte produit du catalogue (choix du conditionnement, compteur de quantité `- / +` et case à cocher de sélection multiple), l'intégration du logo officiel complet Gloryday Pharma (barre de navigation, menu latéral et bons de commande PDF), ainsi que la gestion personnalisée du mot de passe Administrateur.

## User Review & Critical Decisions

> [!IMPORTANT]
> Les choix suivants ont été confirmés et guideront la mise à jour :

- **Contrôles directs sur chaque carte produit** : Intégration directe du sélecteur de conditionnement (variante), du compteur de quantité (`-` / `+`) et d'une case à cocher permettant de sélectionner plusieurs articles à la volée avec barre d'ajout groupé au panier.
- **Identité Visuelle & Logo Complet** : Restauration du logo officiel Gloryday Pharma (emblème médical vectoriel haute définition avec bouclier, croix médicale et typographie institutionnelle) dans la barre supérieure, le tiroir de navigation latéral, la fenêtre de connexion et l'en-tête des bons de commande PDF.
- **Mot de passe Administrateur personnalisé** : Accès rapide au changement de mot de passe Administrateur dès l'ouverture du Portail Direction et depuis la modale d'authentification (avec synchronisation serveur et cloud), tout en permettant de définir immédiatement votre mot de passe secret personnalisé.

---

## 1. Overview & Core Concept

- **Ce que fait cette mise à jour** : Elle redonne aux pharmaciens, médecins et responsables d'achats hospitaliers une expérience de commande ultra-rapide directement depuis la grille du catalogue, sans obliger à ouvrir une fenêtre de détail pour choisir un conditionnement ou ajuster la quantité, tout en réaffirmant l'identité visuelle officielle de **Gloryday Pharma Gabon**.
- **Public cible** : Établissements de santé (cliniques, hôpitaux, pharmacies, laboratoires) et Direction Générale Gloryday Pharma.
- **Valeur ajoutée principale** : Gain de temps majeur lors de la constitution de paniers multi-références et cohérence visuelle sur tous les supports (écran et documents PDF officiels).

---

## 2. User Experience & Visual Design

### Parcours Utilisateurs Clés
1. **Sélection directe sur les cartes du catalogue** :
   - Sur chaque carte d'article, l'acheteur peut :
     - **Choisir le conditionnement** (ex. *Boîte de 100*, *Carton de 10*, *Unité*) via un sélecteur compact directement visible sur la carte, qui met à jour le prix affiché en temps réel.
     - **Ajuster la quantité (`-` / `+`)** directement sur la carte avant ou après l'ajout au panier, avec synchronisation immédiate si l'article est déjà au panier.
     - **Cocher la case de sélection rapide** située en haut de la carte pour sélectionner plusieurs produits simultanément et les ajouter en un clic via une barre d'action flottante de sélection groupée.
2. **Logo Officiel Gloryday Pharma partout** :
   - Affichage de l'emblème complet Gloryday Pharma (bouclier médical bleu cobalt `#0d44e8`, croix centrale blanche et lettrage **GLORYDAY PHARMA GABON**) dans l'en-tête principal, le menu latéral, l'écran de connexion et le bandeau supérieur des bons de commande PDF générés.
3. **Configuration personnalisée du mot de passe Administrateur** :
   - Dans le Portail Direction (et via un raccourci dédié dans l'en-tête d'administration), une carte **« Mot de passe Administrateur Personnalisé »** permet de saisir et enregistrer en un clic votre nouveau mot de passe secret (remplaçant `Gloryday@2026!`), avec confirmation visuelle et sauvegarde persistante côté serveur et cloud.

### Identité Visuelle & Thème
- **Direction Esthétique** : E-commerce médical B2B de haute précision, lisible et structuré.
- **Palette & Contraste (Règle 60-30-10)** :
  - *60 % Surface Dominante* : Blanc pur (`#ffffff`) et gris clinique très doux (`#f8fafc`).
  - *30 % Structure & Typographie* : Graphite profond (`#161618`) et ardoise (`#64748b`) avec bordures fines (`1px solid #e2e8f0`).
  - *10 % Accent d'Action* : Bleu médical Gloryday (`#0d44e8`) pour les boutons d'ajout, les états sélectionnés et le logo, et vert émeraude (`#059669`) pour les confirmations d'ajout au panier.
- **Typographie & Hiérarchie** : Police géométrique `Plus Jakarta Sans` pour les titres et l'interface, associée à des chiffres tabulaires (`tabular-nums`) pour l'alignement strict des prix FCFA et des quantités.

---

## 3. Key Product Decisions & Trade-Offs

- **Décision 1 : Contrôles d'achat embarqués sur la carte vs ouverture de modale**
  - *Approche retenue* : Intégrer le sélecteur de conditionnement, le compteur `- / +` et la case à cocher directement sur la carte produit, tout en conservant l'ouverture de la fiche détaillée au clic sur l'image ou le titre.
  - *Pourquoi* : Les acheteurs professionnels commandent souvent 10 à 30 références connues ; éviter les ouvertures/fermetures de modales réduit de 70 % le nombre de clics nécessaires.
- **Décision 2 : Emblème vectoriel unifié pour le Web et le générateur PDF**
  - *Approche retenue* : Utiliser un composant de marque unifié pour l'interface React et dessiner l'emblème officiel directement en vectoriel haute résolution dans le générateur PDF (`jsPDF`).
  - *Pourquoi* : Garantit une netteté parfaite à l'écran comme à l'impression A4, sans risque d'image cassée hors-ligne.
- **Décision 3 : Personnalisation directe du mot de passe Administrateur**
  - *Approche retenue* : Permettre la définition immédiate d'un nouveau mot de passe personnalisé avec affichage/masquage sécurisé et synchronisation instantanée avec le serveur et la base de données.
  - *Pourquoi* : Vous garde le contrôle total de votre secret d'administration à tout moment sans exposer d'indice public aux visiteurs.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Hiérarchie des Composants

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Application Principale                            │
│  ┌─────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ En-tête & Menu Latéral  │  │ Générateur de Bons de Commande PDF    │  │
│  │  └─ Logo Complet SVG    │  │  └─ Emblème Vectoriel Gloryday Pharma │  │
│  └─────────────────────────┘  └───────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Grille du Catalogue & Sélection Rapide                             │  │
│  │  ├─ Barre Flottante Multi-Sélection (Ajout groupé / Tout décocher) │  │
│  │  └─ Carte Produit Enrichie                                         │  │
│  │      ├─ Case à cocher de sélection multiple                        │  │
│  │      ├─ Sélecteur direct de conditionnement (Variantes & Prix)     │  │
│  │      └─ Compteur de quantité (- / +) & Bouton d'ajout direct       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Portail Direction & Sécurité Administrateur                        │  │
│  │  └─ Module de Changement Rapide du Mot de Passe Administrateur     │  │
│  │      └─ Synchronisation API Serveur (/api/auth/admin-password)     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Modèle d'État & Interactions
- **Sélection multiple catalogue (`selectedProductIds`)** :
  - Chaque carte produit reçoit son état de sélection (`isSelected`, `onToggleSelect`) ainsi que la variante et la quantité courantes.
  - Lorsque un ou plusieurs produits sont cochés, une barre d'action dédiée permet d'ajouter toute la sélection au panier en une seule opération avec les quantités et conditionnements choisis sur chaque carte.
- **Synchronisation directe avec le panier** :
  - Le compteur `- / +` sur la carte permet de choisir la quantité à ajouter (ex. `1`, `5`, `10`) ou d'incrémenter/décrémenter directement la quantité présente dans le panier.
- **Mise à jour du mot de passe Administrateur** :
  - L'interface d'administration permet de saisir le nouveau mot de passe personnalisé sans friction, met à jour l'état serveur persistant et affiche un retour de confirmation immédiat.
