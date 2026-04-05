
Plan — corriger la vraie erreur de création + débloquer “Mes dégustations”

## Diagnostic confirmé
- Le screenshot montre un bug backend, pas un bug mobile : PostgREST ne sait pas quelle fonction `public.find_or_create_wine` appeler.
- Il y a bien 2 versions actives de `find_or_create_wine` en base :
  - une version legacy à 10 paramètres
  - une version canonique à 12 paramètres (`p_is_playable`, `p_cepages`)
- `CreateWineForPostDialog.tsx` appelle la RPC avec seulement les paramètres communs, donc l’appel est ambigu.
- `SpontaneousTastingDialog` a un autre problème : il utilise `WineAutocomplete`, mais il n’existe aucun chemin “créer cette bouteille” si la recherche n’aboutit pas.

## Ce que je vais implémenter
1. Ajouter une migration SQL, sans nouvelle table, pour supprimer l’ancienne surcharge :
   `public.find_or_create_wine(text, uuid, integer, integer, real, text, text, numeric, bigint, integer)`.
2. Conserver une seule version canonique de `find_or_create_wine`, avec valeurs par défaut pour `p_is_playable` et `p_cepages`.
3. Recharger le schéma PostgREST dans la migration pour supprimer immédiatement l’ambiguïté RPC.
4. Aligner les appels frontend qui créent un vin pour viser explicitement la signature canonique :
   - `p_is_playable: false`
   - `p_cepages: null`
   pour les flows hors jeu.
5. Ajouter la création depuis `SpontaneousTastingDialog` en réutilisant `CreateWineForPostDialog`.
6. Étendre `WineAutocomplete` avec `onCreateWine(searchQuery)` et afficher “Je ne trouve pas ma bouteille” dès qu’une recherche est saisie, afin de ne jamais bloquer l’utilisateur.

## Fichiers concernés
- `supabase/migrations/<timestamp>_remove_legacy_find_or_create_wine.sql`
- `src/components/CreateWineForPostDialog.tsx`
- `src/components/AddWineDialog.tsx`
- `src/components/AddWineToDomainDialog.tsx`
- `src/components/CreateWineInDomainDialog.tsx`
- `src/components/wine/WineAutocomplete.tsx`
- `src/components/SpontaneousTastingDialog.tsx`

## Détail technique
```text
Avant
CreateWineForPostDialog
  -> rpc find_or_create_wine(10 args)
  -> 2 fonctions matchent
  -> "Could not choose the best candidate function"

Après
CreateWineForPostDialog / cave / domaine
  -> rpc alignée sur la signature canonique
  -> 1 seule fonction en base
  -> création validée

Mes dégustations
  -> WineAutocomplete
  -> "Je ne trouve pas ma bouteille"
  -> CreateWineForPostDialog(initialWineName=searchQuery)
  -> onWineCreated(newWine)
  -> setSelectedWine(newWine)
```

## Ce que je ne vais pas faire
- Pas de nouvelle table.
- Pas de refonte de recherche.
- Pas de changement RLS `wine` ou `storage` pour ce bug précis : l’erreur actuelle arrive avant l’INSERT, donc la cause principale est bien l’ambiguïté de fonction RPC.

## Vérifications prévues
- Depuis Post : créer une bouteille et vérifier que l’erreur “best candidate function” a disparu.
- Vérifier les autres flows qui utilisent la même RPC (cave, domaine).
- Depuis “Mes dégustations” : rechercher un vin absent, lancer la création, auto-sélectionner le vin créé, puis enregistrer la dégustation.
