# Plan — Corrections navigation, Cellars, Footer, Favoris, Paramètres mobile

## 1. Navigation mobile unifiee

### 1.1 Menu hamburger complet (Header.tsx)

Ajouter dans le Sheet mobile les liens manquants : **Feed**, **Favoris**, **Notifications** (si connecte), et un toggle **dark/light mode**. Ajouter un separateur visuel entre les sections.

### 1.2 Notifications accessibles sur mobile (Header.tsx)

Retirer le `hidden md:block` du `NotificationCenter` pour qu'il soit visible dans le Header mobile, OU ajouter un lien Notifications dans le hamburger + dans le MobileBottomNav.

**Choix recommande** : Garder le `NotificationCenter` (cloche avec badge) visible sur mobile dans le Header (retirer `hidden md:block`). Le hamburger est un complement, pas le seul acces.

### 1.3 Theme sombre accessible sur mobile (Header.tsx)

Ajouter le toggle Sun/Moon dans le menu hamburger mobile (en bas de la liste des liens).

### 1.4 Deconnexion avec confirmation dans les parametre au lieu de la bar de navigation

Remplacer le clic direct `handleSignOut` par un `AlertDialog` demandant confirmation : "Voulez-vous vraiment vous deconnecter ?"

### 1.5 aria-label sur MobileBottomNav (MobileBottomNav.tsx)

Ajouter `aria-label={label}` sur chaque `<Link>` dans le BottomNav.

---

## 2. Footer (Footer.tsx)

- Corriger "chalereux" → "chaleureux" (ligne 16)
- Supprimer le lien "Evenements" duplique dans la colonne "Communaute" (ligne 73-76)
- Corriger "Evenements" → "Événements" (ligne 53, manque l'accent)
- Corriger "Games" → "Jeux" (ligne 43, coherence francaise)

---

## 3. Cellars — Pagination + Debounce (Cellars.tsx)

### 3.1 Debounce sur la recherche

Ajouter un state `debouncedSearchName` et `debouncedSearchAddress` avec un `useEffect` + `setTimeout` de 400ms. Les requetes Supabase utiliseront les valeurs debounced au lieu des valeurs brutes.

### 3.2 Pagination "Charger plus"

- Ajouter un state `page` (commence a 1) et une constante `PAGE_SIZE = 12`.
- Modifier `fetchAllCellars`, `fetchNearbyCellars`, `fetchCommunityCellars` pour utiliser `.range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1)` au lieu de `.limit(10)`.
- Ajouter un state `hasMoreCellars` / `hasMoreCommunity` (true si le nombre de resultats == PAGE_SIZE).
- Afficher un bouton "Charger plus" sous chaque grille quand il reste des resultats. Au clic, incrementer la page et **append** les nouveaux resultats aux existants.
- Reset de la page a 1 quand les filtres changent.

---

## 4. Favoris — Message avant redirection (Favorites.tsx)

Le code a deja un fallback UI avec "Connexion requise" (lignes 76-88), mais le `Navigate` a la ligne 17 redirige **avant** que ce fallback ne s'affiche. 

**Fix** : Supprimer le `<Navigate to="/auth" replace />` (ligne 17-18) pour laisser le composant afficher le message "Connexion requise" avec le bouton "Se connecter" au lieu de rediriger silencieusement.

---

## 5. Parametres — Onglets lisibles sur mobile (UserProfile.tsx)

Remplacer `grid-cols-5` par un layout responsive :

- Mobile : `grid-cols-2` avec les onglets sur 3 lignes (le 5e centre en bas)
- Desktop : `grid-cols-5` comme actuellement

Concretement : `className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5"` et reduire le texte des onglets sur mobile avec des labels plus courts ou des icones.

Alternative plus propre : utiliser un `ScrollArea` horizontal pour les onglets avec `flex` + `overflow-x-auto` + `whitespace-nowrap` au lieu d'une grille. Ca garde tout sur une seule ligne scrollable.

**Choix recommande** : ScrollArea horizontal — plus naturel sur mobile et ne casse pas le layout.

---

## Fichiers modifies


| Fichier                              | Changements                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/components/Header.tsx`          | Hamburger complet, notifications mobile, toggle theme mobile, confirmation deconnexion |
| `src/components/MobileBottomNav.tsx` | aria-labels                                                                            |
| `src/components/Footer.tsx`          | Faute orthographe, lien duplique, accents manquants                                    |
| `src/pages/Cellars.tsx`              | Debounce recherche, pagination "Charger plus"                                          |
| `src/pages/Favorites.tsx`            | Supprimer Navigate, garder le message "Connexion requise"                              |
| `src/pages/UserProfile.tsx`          | Onglets parametres scrollables sur mobile                                              |
