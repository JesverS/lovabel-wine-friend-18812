

# Plan de correction des bugs

## 1. N+1 queries dans `fetchTastingsByEvent` et `fetchTastingsByCellar`

**Fichier:** `UserTastings.tsx` lignes 530-558 et 607-635

Les deux fonctions font un `Promise.all(data.map(async ...))` avec une requete wine + domain par tasting. Le fix suit le pattern deja utilise dans `fetchTastingsByDomain` (lignes 307-313) :

- Collecter les `wine_id` uniques depuis `data`
- Batch fetch tous les wines en une requete `.in('id', wineIds)`
- Collecter les `domain_id` uniques depuis les wines
- Batch fetch tous les domains en une requete `.in('id', domainIds)`
- Construire des Maps pour lookup O(1)
- Assembler les resultats sans requetes individuelles

## 2. Infinite scroll casse (egalite stricte)

**Fichier:** `UserTastings.tsx` ligne 678

```js
// Avant
scrollHeight - scrollTop === clientHeight
// Apres
scrollHeight - scrollTop <= clientHeight + 1
```

## 3. Event listener map jamais nettoye

**Fichier:** `TastingsMap.tsx` lignes 342-351

Extraire le handler dans une variable, et le retirer dans le cleanup :

```js
const storyClickHandler = (e) => { ... };
map.current.getContainer().addEventListener("click", storyClickHandler);
// Dans le return cleanup:
return () => {
  container.removeEventListener("click", storyClickHandler);
  map.current?.remove();
};
```

## 4. FAB chevauche la bottom nav mobile (bug 2.1)

**Fichier:** `UserTastings.tsx` ligne 1093

Changer `bottom-6` en `bottom-24` pour que le bouton "+" passe au-dessus de la MobileBottomNav (64px = h-16) sur mobile, et garder `md:bottom-6` pour desktop :

```
className="fixed bottom-24 md:bottom-6 right-6 ..."
```

## 5. Div vide `pb-16` inutile sur desktop (bug 2.2)

**Fichier:** `App.tsx` ligne 106

Ce `<div className="pb-16 md:pb-0" />` est un spacer pour la MobileBottomNav. Il fonctionne mais c'est un div vide. Le garder tel quel car il sert de padding pour le contenu sous la bottom nav mobile. Pas de bug reel, mais on peut le conditionner pour ne s'afficher que sur mobile via `className="h-16 md:h-0"` (hauteur fixe au lieu de padding sur un div vide, plus semantique).

## 6. Pas de limite sur `.in()` avec beaucoup d'IDs (bug 3.1)

**Fichiers:** `UserTastings.tsx`

Ajouter un helper `batchIn` qui decoupe un tableau d'IDs en chunks de 500 et fait plusieurs requetes si necessaire :

```ts
async function batchFetch(table, column, ids, select) {
  const CHUNK = 500;
  const results = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data } = await supabase.from(table).select(select).in(column, ids.slice(i, i + CHUNK));
    if (data) results.push(...data);
  }
  return results;
}
```

Appliquer ce helper aux appels `.in()` dans `fetchTastingsByEvent`, `fetchTastingsByCellar`, `fetchTastingsByDomain`, et `fetchTastingsByDate`.

## 7. Gestion d'erreurs manquante dans les fetches (bug 3.2)

**Fichier:** `UserTastings.tsx`

Envelopper `fetchDomains`, `fetchEvents`, `fetchCellars`, `fetchTastingsByEvent`, `fetchTastingsByCellar` dans des try/catch avec un toast d'erreur, comme c'est deja fait dans d'autres composants du projet. Utiliser `getErrorMessage` de `errorHandler.ts`.

## 8. N+1 dans `EventAccessRequestsManagement` (bug 3.2 bonus)

**Fichier:** `EventAccessRequestsManagement.tsx` lignes 49-62

Meme pattern : collecter les `user_id` uniques, batch fetch les profils en une seule requete `.in('id', userIds)`.

## Resume des fichiers modifies

| Fichier | Changements |
|---------|-------------|
| `UserTastings.tsx` | Batch queries event/cellar, infinite scroll fix, FAB position, try/catch, batchIn helper |
| `TastingsMap.tsx` | Cleanup event listener |
| `App.tsx` | Spacer div semantique |
| `EventAccessRequestsManagement.tsx` | Batch fetch profils |

