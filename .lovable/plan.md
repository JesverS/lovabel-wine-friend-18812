

# Plan — Filtrer les événements passés + Debounce sur Events

## Contexte

Tu as raison sur les deux points :
- **Email/téléphone/adresse** : la vue `user_profiles_public` masque déjà les champs selon les flags `allow_*`. Pas de problème.
- **DeleteAccountDialog** : déjà intégré dans `PrivacySettings.tsx`. C'est fonctionnel.

Voici les deux corrections restantes pour Events.

## 1. Filtrer les événements passés (Events.tsx)

Actuellement la requête sur `event_public_list` ne filtre pas par date. Les événements dont `start_date` (ou `end_date` si renseignée) est dans le passé apparaissent en premier (tri ASC).

**Fix** : Ajouter un filtre `.gte("start_date", new Date().toISOString())` par défaut dans `fetchPublicEvents` — quand aucun filtre de date n'est sélectionné. Cela n'affichera que les événements à venir. Quand l'utilisateur choisit une date spécifique via le calendrier, le filtre existant par date prend le relais normalement.

Alternative plus souple : filtrer sur `end_date >= now() OR (end_date IS NULL AND start_date >= now())` pour garder les événements multi-jours en cours.

## 2. Debounce sur la recherche (Events.tsx)

Chaque caractère tapé dans `searchName` et `searchCity` déclenche immédiatement `fetchPublicEvents` via le `useEffect` ligne 67-74.

**Fix** : Ajouter des states `debouncedSearchName` et `debouncedSearchCity` avec un `useEffect` + `setTimeout` de 400ms (même pattern que celui appliqué sur Cellars.tsx). Le `useEffect` principal utilisera les valeurs debounced.

## Fichier modifié

| Fichier | Changement |
|---------|-----------|
| `src/pages/Events.tsx` | Filtre événements passés + debounce 400ms sur searchName/searchCity |

