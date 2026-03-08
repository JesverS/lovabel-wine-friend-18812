

# Plan de correction — 9 bugs

## Bug 1 — AlertDialog avant suppression d'un event post
**`EventPostCard.tsx`** : Ajouter un state `showDeleteDialog`, remplacer le clic direct sur Trash2 par l'ouverture d'un `AlertDialog` de confirmation ("Supprimer ce post ?", "Cette action est irreversible"), qui appelle `handleDeletePost` sur confirmation.

## Bug 2 — getAccessTypeBadge() appele 3 fois
**`EventDetails.tsx`** : Stocker le resultat dans une variable `const accessBadge = getAccessTypeBadge()` avant le JSX, puis utiliser `accessBadge?.className`, `accessBadge?.icon`, `accessBadge?.label`.

## Bug 3 — Couleurs non dark-mode sur lien prive
**`EventDetails.tsx`** : Remplacer `bg-amber-50 border-amber-200` par `bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800`, `text-amber-900` par `text-amber-900 dark:text-amber-100`, `text-amber-700` par `text-amber-700 dark:text-amber-300`, `text-amber-600` par `text-amber-600 dark:text-amber-400`, `bg-white` par `bg-white dark:bg-background`.

## Bug 4 — Boutons like/comment silencieux si non connecte
**`EventPostCard.tsx`** : Dans `handleToggleLike` et `handlePostComment`, si `!user`, appeler `navigate('/auth')` au lieu de `return`. Ajouter aussi un toast "Connectez-vous pour interagir".

## Bug 7 — Filtres non appliques sur onglets inscrits/organise
**`Events.tsx`** : Dans `getFilteredUserEvents()`, appliquer les filtres `searchName`, `searchCity` et `searchDate` sur les resultats filtres par role. Filtrer cote client avec `.filter()` sur `name.toLowerCase().includes()`, `city?.toLowerCase().includes()` et comparaison de dates.

## Bug 9 — Description dupliquee dans CellarDetails
**`CellarDetails.tsx`** : Supprimer le bloc `{cellar.description && ...}` du header (lignes 291-293). La description reste uniquement dans l'onglet "A propos".

## Bug 10 — Onglet "Gestion" separe pour la cave
**`CellarDetails.tsx`** : Ajouter un onglet "Gestion" (visible uniquement si `userRole` existe) contenant `CellarMembers`, la zone "Quitter la cave" et la zone "Danger / Supprimer". L'onglet "A propos" ne garde que description + adresse.

## Bug 11 — Caves communautaires publiques
**`Cellars.tsx`** : Ajouter une section "Caves communautaires" sous la liste des cavistes. Nouveau fetch `fetchCommunityCellars` qui requete `is_public = true` ET `is_seller = false`, avec les memes filtres nom/adresse. Afficher dans une grille separee avec un titre "Caves communautaires".

## Bug 12 — Image event post non croppee
**`CreateEventPost.tsx`** : Integrer `ImageCropDialog` (aspect 16/9, cropShape rect). Au lieu de stocker le fichier brut, ouvrir le dialog de crop quand un fichier est selectionne, puis stocker le blob croppe comme `imageFile`. Meme pattern que `CreatePost`.

---

## Resume des fichiers

| Fichier | Bugs corriges |
|---------|---------------|
| `EventPostCard.tsx` | 1, 4 |
| `EventDetails.tsx` | 2, 3 |
| `Events.tsx` | 7 |
| `CellarDetails.tsx` | 9, 10 |
| `Cellars.tsx` | 11 |
| `CreateEventPost.tsx` | 12 |

