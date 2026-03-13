# Plan d'implementation - 4 corrections

## 1. Remplacer "Selection de la semaine" par "Derniers vins decouverts"

**Principe** : Requeter `wine` triees par `created_at DESC`, avec jointure sur `domain` (nom, region). Afficher un carrousel horizontal de mini-cards (image etiquette + nom + domaine + annee). Pas de note affichee, juste la bouteille.

**Fichiers** :

- **Nouveau `src/hooks/useRecentWines.ts**` : Hook avec `useQuery` 
- **Rewrite `src/components/FeaturedWines.tsx**` : Renommer en `RecentWines.tsx` (ou garder le fichier). Titre "Dernieres decouvertes". Afficher un scroll horizontal (`flex overflow-x-auto snap-x`) de cards compactes : image etiquette (ou placeholder verre), nom du vin, domaine, annee. Clic → navigation vers `/wine/:id`. 
- **Update `src/pages/Index.tsx**` : Remplacer `<FeaturedWines />` par `<RecentWines />`.

## 2. Corriger le double affichage SocialFeed sur /feed

**Probleme** : `SocialFeed` wrappe tout dans `<section className="py-24 bg-muted/30">` avec son propre titre h2. Sur `/feed`, ca cree un double titre et un padding excessif.

**Solution** : Ajouter une prop `variant?: 'homepage' | 'standalone'` a `SocialFeed`. En mode `standalone` : pas de `<section>` wrapper, pas de titre h2, pas de padding `py-24`, pas de `bg-muted/30`. Juste le contenu (posts + infinite scroll). Par defaut `homepage`.

**Fichiers** :

- `**src/components/SocialFeed.tsx**` : Ajouter la prop. En mode `standalone`, rendre uniquement la liste de posts sans section/titre/padding. Le message "non connecte" n'est pas necessaire non plus en standalone (c'est gere par Feed.tsx).
- `**src/pages/Feed.tsx**` : Passer `<SocialFeed variant="standalone" />`.

## 3. Espace mort mobile (h-16)

**Probleme** : Le `<div className="h-16 md:h-0" />` dans App.tsx s'empile avec le Footer.

**Solution** : Supprimer ce div. A la place, ajouter `pb-16 md:pb-0` sur le `<Footer />` ou directement dans le composant Footer en ajoutant un padding bottom conditionnel. Plus propre : ajouter `className="pb-16 md:pb-0"` au footer element dans `Footer.tsx`.

**Fichiers** :

- `**src/App.tsx**` : Supprimer `<div className="h-16 md:h-0" />`.
- `**src/components/Footer.tsx**` : Ajouter `pb-16 md:pb-0` au `<footer>` root element.

## 4. og:image manquant

**Solution** : L'image OG est deja definie dans `index.html` (`https://storage.googleapis.com/...`). Le probleme est que les pages avec `<Helmet>` overrident les meta sans re-specifier og:image.

**Fichiers** : Ajouter `<meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/1EK7H96ITKXD3CrC1aSkRhKBhvC2/social-images/social-1765190887528-icon.png" />` dans les `<Helmet>` de : `Index.tsx`, `Feed.tsx`, `About.tsx`, `Events.tsx`, `Learning.tsx`, `Blog.tsx`, `Contact.tsx`. Les pages dynamiques (event, wine, user) garderont le fallback de index.html.

---

**Resume des fichiers modifies** :


| Fichier                            | Action                                    |
| ---------------------------------- | ----------------------------------------- |
| `src/hooks/useRecentWines.ts`      | Nouveau hook                              |
| `src/components/FeaturedWines.tsx` | Rewrite complet → carrousel derniers vins |
| `src/pages/Index.tsx`              | Import update                             |
| `src/components/SocialFeed.tsx`    | Ajouter prop variant                      |
| `src/pages/Feed.tsx`               | Passer variant="standalone"               |
| `src/App.tsx`                      | Supprimer div h-16                        |
| `src/components/Footer.tsx`        | Ajouter pb-16 mobile                      |
| 7 pages                            | Ajouter og:image dans Helmet              |
