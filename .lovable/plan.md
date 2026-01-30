

# Plan : Optimisation SEO Avancée - Checklist 40 Points Hostinger

## Analyse de l'Etat Actuel vs Checklist Hostinger

### Ce qui est DEJA en place (25/40 points)

| # | Point Checklist | Statut |
|---|-----------------|--------|
| 1 | Hosting fiable | N/A (Lovable Cloud) |
| 2 | Site crawlable + sitemap | `robots.txt` + `sitemap.xml` statique |
| 3 | SSL/HTTPS | Actif par defaut |
| 4 | Structure permaliens | URLs SEO-friendly (`/event/slug`, `/user/slug`) |
| 7 | Breadcrumbs | Implementes sur 10+ pages |
| 10 | Theme SEO-friendly | React optimise + Tailwind |
| 15 | Contenu de qualite | Pages dynamiques riches |
| 16 | Structure headings | Hierarchie H1/H2/H3 coherente |
| 17 | Mot-cle dans URL + H1 | Pattern respecte |
| 18 | Meta title + description | `react-helmet-async` sur 32 pages |
| 19 | Donnees structurees | JSON-LD: Event, Product, Winery, Course |
| 20 | Compression images | `loading="lazy"` sur images |
| 21 | Alt text images | Partiellement implemente |
| 23 | Liens internes | Navigation coherente entre pages |
| 34 | Core Web Vitals | Vite + React = performances optimisees |
| 35 | noindex pages inutiles | NotFound.tsx avec noindex |
| 40 | Site responsive | Mobile-first avec Tailwind |

### Ce qui MANQUE ou a AMELIORER (15 points)

| # | Point Checklist | Priorite | Action Requise |
|---|-----------------|----------|----------------|
| 2b | Sitemap dynamique | HAUTE | Creer Edge Function pour generer sitemap dynamique |
| 5 | Soumission Google Search Console | HAUTE | Documenter pour l'utilisateur |
| 19b | Schema Article pour posts | HAUTE | Ajouter JSON-LD Article sur PostDetails |
| 19c | Schema Person pour profils | MOYENNE | Ajouter JSON-LD Person sur UserProfile |
| 21b | Alt text systematique | MOYENNE | Audit et completion des alt texts |
| 22 | Videos sur plateforme externe | BASSE | Deja YouTube embeds |
| 24 | Categories/tags contenu | MOYENNE | Ajouter filtres sur Events/Feed |
| 25 | Plan editorial | N/A | Strategie business |
| 26-30 | Backlinks/PR | N/A | Strategie marketing externe |
| 31 | Verification liens casses | BASSE | Outil externe (Google Search Console) |
| 32 | Verification indexation | HAUTE | Pre-rendering pour SPA |
| 33 | Cannibalisation keywords | BASSE | Audit SEO externe |
| 36 | Minification CSS/JS | AUTO | Vite build optimise |
| 38 | Monitoring keywords | N/A | SEMrush/Ahrefs |
| 39 | Contenu video | BASSE | Integration future |

---

## Plan d'Implementation (5 Etapes)

### Etape 1 : Sitemap Dynamique (Priorite HAUTE)

Creer une Edge Function qui genere un sitemap XML incluant :
- Pages statiques (accueil, learning, events, guides, about, contact, etc.)
- Evenements publics (`/event/{slug}`)
- Profils publics (`/user/{slug}`)
- Cours disponibles (`/course/{id}`)
- Vins (`/wine/{id}`)

```text
Structure du sitemap dynamique :
+------------------------+
|   /api/sitemap.xml     |
+------------------------+
         |
    +----+----+
    |         |
Pages      Dynamiques
statiques  (DB queries)
    |         |
- /          - /event/xxx
- /learning  - /user/xxx
- /events    - /wine/xxx
- /guides    - /course/xxx
- /about
- /contact
```

### Etape 2 : Donnees Structurees Manquantes

**A. Schema Article pour PostDetails.tsx**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Post title",
  "author": { "@type": "Person", "name": "Author name" },
  "datePublished": "2025-01-30",
  "image": "post_image_url"
}
```

**B. Schema Person pour UserProfile.tsx**
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "User Name",
  "description": "User bio",
  "image": "avatar_url"
}
```

### Etape 3 : Pre-rendering pour Crawlers (Recommandation)

Pour les SPA React, les crawlers ont besoin de HTML statique. Options :
1. **Prerender.io** (service externe) - Recommande
2. **Cloudflare Workers** avec detection User-Agent
3. **SSG partiel** pour pages critiques

Cette etape necessite une configuration externe a Lovable.

### Etape 4 : Optimisations Techniques Supplementaires

1. **fetchpriority="high"** sur l'image Hero (LCP)
2. **Preload fonts** deja en place
3. **Alt text audit** - Verifier toutes les images

### Etape 5 : Documentation Google Search Console

Creer un guide pour soumettre :
- Le sitemap dynamique
- Verifier l'indexation
- Monitorer les erreurs

---

## Resume des Fichiers a Creer/Modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/sitemap/index.ts` | CREER - Edge Function sitemap dynamique |
| `src/pages/PostDetails.tsx` | MODIFIER - Ajouter JSON-LD Article |
| `src/pages/UserProfile.tsx` | MODIFIER - Ajouter JSON-LD Person |
| `index.html` | MODIFIER - fetchpriority sur fonts |
| `public/robots.txt` | MODIFIER - Pointer vers sitemap dynamique |

---

## Section Technique

### Edge Function Sitemap Dynamique

L'Edge Function interrogera Supabase pour :
- `event` WHERE `is_public = true`
- `user_profiles_public` WHERE `is_public = true`
- `wine` (tous publics)
- `courses` WHERE `is_available = true`

Format de sortie :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://winenote.me/event/degustation-bordeaux</loc>
    <lastmod>2025-01-30</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ...
</urlset>
```

### Pre-rendering (Externe)

Configuration Prerender.io :
1. Creer compte sur prerender.io
2. Ajouter middleware dans Cloudflare/Vercel
3. Detecter User-Agent: Googlebot, Bingbot, etc.
4. Servir HTML pre-rendu aux crawlers

---

## Prochaines Etapes Apres Approbation

1. Implementer l'Edge Function sitemap dynamique
2. Ajouter les schemas JSON-LD manquants
3. Mettre a jour robots.txt
4. Documenter la configuration pre-rendering

