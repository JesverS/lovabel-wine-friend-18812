

# Plan : Corriger la Creation de Domaine dans les Formulaires de Vin

## Probleme Identifie

Le composant `CreateDomainDialog` est utilise dans 4 endroits differents de l'application, mais sa logique est inadaptee dans 3 cas sur 4.

### Ce que fait `CreateDomainDialog` actuellement (le probleme) :
1. Demande un **role** (Proprietaire / Administrateur / Employe)
2. Cree une **demande d'adhesion** (`user_domain_application`) apres la creation du domaine
3. Affiche le bouton "Ajouter **mon** domaine" (implique la possession)
4. Propose un formulaire lourd : logo, description, role...

C'est completement inadapte quand on veut simplement **enregistrer un domaine** pour l'associer a une bouteille. Ce n'est pas parce qu'on ajoute un vin de "Chateau Margaux" qu'on travaille pour ce domaine.

### Ce que fait `CreateDomainForGameDialog` (le bon modele) :
1. Formulaire leger : **nom + region** uniquement
2. Cree le domaine directement en base
3. Retourne le domaine cree via callback
4. Pas de role, pas de demande d'adhesion

---

## Cartographie des Usages

| Fichier | Composant utilise | Contexte | Correct ? |
|---------|-------------------|----------|-----------|
| `UserDomains.tsx` | `CreateDomainDialog` | L'utilisateur gere **ses** domaines | OUI (role logique) |
| `CreateWineForPostDialog.tsx` | `CreateDomainDialog` | Creation de vin pour un post | NON |
| `AddWineDialog.tsx` (Cave) | `CreateDomainDialog` | Creation de vin pour une cave | NON |
| `AddDomainToEventDialog.tsx` | `CreateDomainDialog` | Ajout de domaine a un evenement | NON |
| `CreateWineForGameDialog.tsx` | `CreateDomainForGameDialog` | Creation de vin pour le jeu | OUI (modele correct) |

---

## Solution

### Etape 1 : Creer un composant generique `CreateDomainSimpleDialog`

Un nouveau composant reutilisable base sur la logique de `CreateDomainForGameDialog`, avec une interface flexible pour etre utilise partout :

- Champs : **Nom du domaine** (obligatoire) + **Region** (optionnelle, parmi les regions en base)
- Region "Autre" avec champ libre si necessaire
- Callback `onDomainCreated(domain)` qui retourne l'objet domaine cree
- Props `open` / `onOpenChange` pour etre controle de l'exterieur
- Optionnellement, prop `initialName` pour pre-remplir le nom depuis la recherche

### Etape 2 : Remplacer les usages problematiques

**Fichier `CreateWineForPostDialog.tsx` :**
- Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog`
- Le callback `onDomainCreated` selectionne directement le domaine cree (auto-selection)

**Fichier `AddWineDialog.tsx` (Cave) :**
- Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog`
- Meme logique : apres creation, auto-selectionner le domaine

**Fichier `AddDomainToEventDialog.tsx` :**
- Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog`
- Apres creation du domaine, relancer la recherche pour le retrouver

### Etape 3 : Supprimer `CreateDomainForGameDialog`

Ce composant devient redondant puisque `CreateDomainSimpleDialog` fait exactement la meme chose. Le fichier `CreateWineForGameDialog.tsx` sera mis a jour pour utiliser le nouveau composant generique.

### Etape 4 : Garder `CreateDomainDialog` uniquement pour `UserDomains`

Le composant `CreateDomainDialog` avec sa logique de role et de demande d'adhesion reste pertinent **uniquement** dans la page "Mes domaines" (`UserDomains.tsx`). Aucune modification ici.

---

## Fichiers a Creer / Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/CreateDomainSimpleDialog.tsx` | CREER | Nouveau composant leger (nom + region) |
| `src/components/CreateWineForPostDialog.tsx` | MODIFIER | Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog` + auto-selection |
| `src/components/AddWineDialog.tsx` | MODIFIER | Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog` + auto-selection |
| `src/components/AddDomainToEventDialog.tsx` | MODIFIER | Remplacer `CreateDomainDialog` par `CreateDomainSimpleDialog` |
| `src/components/game/CreateWineForGameDialog.tsx` | MODIFIER | Remplacer `CreateDomainForGameDialog` par `CreateDomainSimpleDialog` |
| `src/components/game/CreateDomainForGameDialog.tsx` | SUPPRIMER | Remplace par le composant generique |

---

## Detail du Nouveau Composant

```text
+------------------------------------------+
|  Creer un nouveau domaine                 |
|  Ajoutez les informations du domaine      |
|                                           |
|  Nom du domaine *                         |
|  [____________________________]           |
|                                           |
|  Region viticole                          |
|  [v Selectionnez une region     ]         |
|                                           |
|  (si "Autre" selectionne)                 |
|  Nom de la region *                       |
|  [____________________________]           |
|                                           |
|  [Annuler]        [Creer le domaine]      |
+------------------------------------------+
```

### Props du composant :

```text
CreateDomainSimpleDialog
  - open: boolean
  - onOpenChange: (open: boolean) => void
  - onDomainCreated: (domain: { id, name, region, custom_region, logo_url }) => void
  - initialName?: string  (pre-remplit le nom depuis la recherche)
```

---

## Section Technique

### Comportement apres creation dans chaque contexte

**Post / Cave :** Le domaine est immediatement selectionne dans le formulaire de creation de vin. L'utilisateur continue de remplir les champs du vin sans interruption.

**Evenement :** Apres creation du domaine, la recherche est relancee automatiquement pour le retrouver dans la liste, ou bien le domaine est directement selectionne.

**Jeu :** Le domaine est selectionne et l'utilisateur passe directement a l'etape 2 (creation de la bouteille).

### Ce qui ne change pas

- `CreateDomainDialog` reste inchange et continue d'etre utilise dans `UserDomains.tsx` pour la gestion des domaines de l'utilisateur (avec role et demande d'adhesion)
- Aucune modification de base de donnees necessaire
- Aucune modification d'Edge Function necessaire

