
# Plan SEO Phase 3 : Indexation Complète

## Objectif
Ajouter les balises SEO manquantes sur **toutes les pages** du site pour une couverture 100%.

## Pages a modifier

### Pages publiques sans Helmet (priorite haute)

| Page | Action |
|------|--------|
| `Search.tsx` | Ajouter Helmet avec titre/description |
| `NotFound.tsx` | Ajouter Helmet + `<meta name="robots" content="noindex">` |
| `Notifications.tsx` | Ajouter Helmet (page privee mais SEO-ready) |

### Pages dynamiques sans canonical (priorite moyenne)

| Page | Action |
|------|--------|
| `CellarDetails.tsx` | Ajouter `<link rel="canonical">` dynamique |
| `LessonDetails.tsx` | Ajouter `<link rel="canonical">` dynamique |
| `Favorites.tsx` | Ajouter `<link rel="canonical">` |

### Pages privees/temporaires (priorite basse)

| Page | Action |
|------|--------|
| `Auth.tsx` | Ajouter Helmet basique + noindex (page de connexion) |
| `GamePlay.tsx` | Ajouter Helmet basique + noindex (jeu en cours) |
| `SharedPost.tsx` | Ajouter Helmet dynamique pour partage social |
| `CellarInvitation.tsx` | Ajouter Helmet + noindex |
| `EventInvitation.tsx` | Ajouter Helmet + noindex |

### Mise a jour du sitemap

Ajouter les pages manquantes dans `public/sitemap.xml` :
- `/search` (page de recherche publique)
- `/favorites` (si publique)

---

## Details des modifications

### 1. Search.tsx - Page de recherche IA

```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>Recherche IA Sommelier | Trouvez le Vin Parfait - Wine Note</title>
  <meta name="description" content="Notre IA sommelier vous aide a trouver le vin parfait selon vos gouts. Recherchez par hashtag ou demandez des recommandations personnalisees." />
  <link rel="canonical" href="https://winenote.me/search" />
  <meta property="og:title" content="Recherche IA Sommelier - Wine Note" />
  <meta property="og:description" content="Trouvez le vin parfait avec notre assistant IA sommelier." />
  <meta property="og:url" content="https://winenote.me/search" />
</Helmet>
```

### 2. NotFound.tsx - Page 404

```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>Page introuvable - Wine Note</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="Cette page n'existe pas ou a ete deplacee." />
</Helmet>
```

### 3. Notifications.tsx - Centre de notifications

```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>Notifications - Wine Note</title>
  <meta name="description" content="Consultez vos notifications Wine Note : nouveaux abonnes, evenements, invitations et commentaires." />
  <meta name="robots" content="noindex" />
</Helmet>
```

### 4. Auth.tsx - Page de connexion

```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>Connexion | Wine Note</title>
  <meta name="description" content="Connectez-vous ou creez votre compte Wine Note pour acceder a vos caves, evenements et cours d'oenologie." />
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

### 5. GamePlay.tsx - Jeu en cours

```tsx
import { Helmet } from "react-helmet-async";

<Helmet>
  <title>Partie en cours | Jeu d'Ambiance - Wine Note</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

### 6. SharedPost.tsx - Post partage (dynamique)

```tsx
import { Helmet } from "react-helmet-async";

// Dans le return, apres avoir recupere les donnees:
<Helmet>
  <title>{post?.author?.full_name || 'Utilisateur'} partage une degustation | Wine Note</title>
  <meta name="description" content={post?.content?.slice(0, 155) || "Decouvrez cette degustation partagee sur Wine Note."} />
  {post?.image_url && <meta property="og:image" content={post.image_url} />}
  <meta property="og:type" content="article" />
</Helmet>
```

### 7. CellarInvitation.tsx et EventInvitation.tsx

```tsx
<Helmet>
  <title>Invitation a rejoindre une cave | Wine Note</title>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

### 8. Canonicals manquants

**CellarDetails.tsx :**
```tsx
<link rel="canonical" href={`https://winenote.me/cellar/${cellar.slug}`} />
<meta property="og:url" content={`https://winenote.me/cellar/${cellar.slug}`} />
```

**LessonDetails.tsx :**
```tsx
<link rel="canonical" href={`https://winenote.me/course/${courseId}/lesson/${lessonId}`} />
```

**Favorites.tsx :**
```tsx
<link rel="canonical" href="https://winenote.me/favorites" />
```

### 9. Mise a jour sitemap.xml

```xml
<url>
  <loc>https://winenote.me/search</loc>
  <changefreq>weekly</changefreq>
  <priority>0.7</priority>
</url>
```

---

## Resume des fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/Search.tsx` | + Helmet complet |
| `src/pages/NotFound.tsx` | + Helmet avec noindex |
| `src/pages/Notifications.tsx` | + Helmet (noindex) |
| `src/pages/Auth.tsx` | + Helmet (noindex) |
| `src/pages/GamePlay.tsx` | + Helmet (noindex) |
| `src/pages/SharedPost.tsx` | + Helmet dynamique |
| `src/pages/CellarInvitation.tsx` | + Helmet (noindex) |
| `src/pages/EventInvitation.tsx` | + Helmet (noindex) |
| `src/pages/CellarDetails.tsx` | + canonical dynamique |
| `src/pages/LessonDetails.tsx` | + canonical dynamique |
| `src/pages/Favorites.tsx` | + canonical |
| `public/sitemap.xml` | + /search |

---

## Impact attendu

| Metrique | Avant | Apres |
|----------|-------|-------|
| Pages avec Helmet | ~18 | 29 (100%) |
| Pages avec canonical | ~15 | 22 |
| Pages noindex (privees) | 0 | 8 |
| Pages dans sitemap | 12 | 13 |

Cette phase complete l'indexation SEO technique de toutes les pages du site.
