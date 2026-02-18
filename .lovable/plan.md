

# Plan d'implementation - Corrections UX critiques et importantes

## 1. Error Boundary global (Probleme 1)

Creer un composant `ErrorBoundary` en class component React (seule facon de capturer les erreurs de rendu). Il affichera une page de fallback avec le logo, un message d'erreur et un bouton "Recharger la page".

**Fichiers :**
- Creer `src/components/ErrorBoundary.tsx`
- Modifier `src/App.tsx` : envelopper le contenu dans `<ErrorBoundary>`

---

## 2. Labels d'onglets profil visiteur (Probleme 3)

Remplacer tous les "Mes caves", "Mes domaines", "Mes evenements", "Mes degustations", "Mes favoris" par des labels conditionnels selon `isOwnProfile` :

| Actuel | Propre profil | Visite |
|--------|--------------|--------|
| Mes caves | Mes caves | Caves |
| Mes domaines | Mes domaines | Domaines |
| Mes evenements | Mes evenements | Evenements |
| Mes degustations | Mes degustations | Degustations |
| Mes favoris | Mes favoris | Favoris |

Cela concerne les TabsTrigger desktop (ligne 519-524), le bouton hamburger mobile (lignes 417-421), et les labels du Drawer mobile (lignes 456-509).

**Fichier :** `src/pages/UserProfile.tsx`

---

## 3. Onglet Domaines visible pour visiteurs (Probleme 4)

Actuellement le contenu de l'onglet "Domaines" est bloque par `isOwnProfile`. Le rendre accessible selon `canViewContent`, de la meme maniere que les degustations et favoris. Le composant `UserDomains` devra accepter un `userId` optionnel pour afficher les domaines d'un autre utilisateur (en masquant les actions de creation/candidature).

**Fichiers :**
- `src/pages/UserProfile.tsx` : remplacer la condition `isOwnProfile` par `isOwnProfile || canViewContent`
- `src/components/UserDomains.tsx` : ajouter prop `userId` optionnelle, masquer les boutons de creation si ce n'est pas son propre profil

---

## 4. Lien Feed dans le header desktop (Probleme 5)

Ajouter un lien "Feed" dans la navigation desktop du Header, entre "Game" et la barre de recherche.

**Fichier :** `src/components/Header.tsx`

---

## 5. Skeleton loader pour le profil utilisateur (Probleme 6)

Remplacer le texte "Chargement..." par un squelette qui reproduit la structure de la page profil : avatar rond, lignes de texte pour le nom et la description, puis un bloc pour les onglets.

**Fichier :** `src/pages/UserProfile.tsx`

---

## 6. Page Auth : lien de retour a l'accueil (Probleme 12)

Ajouter un lien cliquable sur le titre "Wine Note" en haut de la page `/auth` qui redirige vers `/`. Utiliser le composant `Link` existant.

**Fichier :** `src/pages/Auth.tsx`

---

## Points non traites dans ce plan

| Point | Raison |
|-------|--------|
| React Query sur toutes les pages (2) | Refactoring massif, a traiter par lot dans un plan dedie |
| Rate limiting edge functions (8) | Infrastructure backend, plan dedie recommande |
| Dark mode (9) | Necessite un ThemeProvider + audit visuel complet |
| Internationalisation (11) | Chantier structurel majeur |

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/components/ErrorBoundary.tsx` | Nouveau composant ErrorBoundary |
| `src/App.tsx` | Integrer ErrorBoundary autour du contenu |
| `src/pages/UserProfile.tsx` | Labels conditionnels, domaines visibles, skeleton loader |
| `src/components/UserDomains.tsx` | Prop userId, masquer actions non-proprietaire |
| `src/components/Header.tsx` | Ajouter lien Feed |
| `src/pages/Auth.tsx` | Lien retour accueil |

