# Plan d'Améliorations Pratiques & Opérationnelles - Gloryday Pharma

Ce plan propose 4 améliorations directement axées sur le confort de commande des soignants et la facilitation des achats en établissement médical.

---

## 1. Les 4 Améliorations Proposées pour les Utilisateurs

### 1. Filtres Avancés par Spécialité Médicale & Service Hospitalier
- **Besoin** : Un infirmier ou une sage-femme cherche du matériel selon son service plutôt que de faire défiler tout le catalogue.
- **Fonctionnalité** : Ajout d'une barre de filtrage par spécialités médicales concrètes :
  - *Bloc Opératoire & Chirurgie*
  - *Perfusion, Injection & Prélèvement*
  - *Plaies, Pansements & Immobilisation*
  - *Maternité, Gynécologie & Pédiatrie*
  - *Hygiène Hospitalière & Équipements de Protection*
- **Impact** : Accès au produit recherché en moins de 3 secondes.

### 2. Système de Remises Dégressives sur Volume (Tarifs Cliniques & Gros Conditionnements)
- **Besoin** : Les cliniques et pharmacies achètent en quantité et souhaitent visualiser immédiatement leurs économies d'échelle.
- **Fonctionnalité** :
  - Paliers automatiques visibles sur chaque produit et dans le panier (ex. Dès 5 boîtes : `-5%`, dès 10 boîtes : `-10%`, carton complet : `-15%`).
  - Affichage instantané du montant économisé en FCFA.
- **Impact** : Incitation au volume et transparence totale des tarifs de gros.

### 3. Fiche Produit Modale Détaillée (Spécifications Techniques & Calibres)
- **Besoin** : Vérifier les calibres exacts (ex. jauges Gauge 18G, 20G, 21G, 22G, longueur en mm, matériau sans latex, date de péremption) avant de commander.
- **Fonctionnalité** :
  - Clic sur un produit ouvrant une fiche technique détaillée.
  - Sélecteur visuel de variantes et conditionnements (boîte de 50, 100, carton de 500).
  - Conseils d'utilisation et spécifications de stérilité.
- **Impact** : Zéro erreur de commande sur les tailles et modèles de matériel médical.

### 4. Bon de Validation Interne A4 (Pour Visa Hiérarchique / Comptabilité Clinique)
- **Besoin** : Dans beaucoup de cliniques gabonaises, le responsable de bloc ou pharmacien doit faire signer le bon d'achat par la direction administrative ou financière avant l'envoi officiel.
- **Fonctionnalité** :
  - Bouton « Générer Bon de Demande d'Achat Interne » (PDF formaté avec cases « Visa Demandeur », « Visa Direction », « Visa Comptabilité »).
  - Possibilité de sauvegarder et d'imprimer directement pour signature physique avant transmission finale.
- **Impact** : Parfaite intégration dans les procédures de validation interne des cliniques.

---

## 2. Parcours Utilisateur & Interface

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CATALOGUE GLORYDAY PHARMA                       │
├────────────────────────────────────────────────────────────────────────┤
│  [Bloc Chirurgical] [Perfusion/Injection] [Plaies/Soins] [Maternité]   │
├──────────────────────────────────┬─────────────────────────────────────┤
│  FICHE PRODUIT DÉTAILLÉE         │  PANIER AVEC REMISES VOLUME         │
│  - Photos & zoom                 │  - Palier 5x (-5%), 10x (-10%)      │
│  - Spécifications calibres (G)   │  - Économie totale affichée en FCFA │
│  - Conseils de stockage          │  - Bouton "Bon de Visa Interne"     │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 3. Architecture & Implémentation

- **Composants** :
  - `SpecialtyFilterBar` dans le catalogue
  - `ProductDetailModal` avec zoom et caractéristiques techniques
  - `VolumeDiscountBadge` et calcul de palier dans `CartView`
  - `InternalPurchaseOrderPdf` étendant `pdfGenerator.ts` avec bloc signatures et visas
- **Performance & PWA** : 100% réactif sur smartphone et tablette en salle de soins, fonctionnement hors-ligne préservé.
