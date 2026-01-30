

# Plan : Strategie Blog SEO pour Wine Note

## Analyse de la Situation Actuelle

### Ce que vous avez deja
| Element | Description |
|---------|-------------|
| **Posts utilisateurs** | Systeme de publications sociales (table `post`) - mais contenu genere par les utilisateurs, non optimise SEO |
| **Guides** | 6 guides statiques codes en dur dans `Guides.tsx` - contenu educatif mais non dynamique |
| **Lessons/Cours** | Systeme complet de cours interactifs avec quiz - excellent pour l'engagement |
| **Sitemap dynamique** | Edge Function qui indexe events, users, wines, courses |

### Ce qui manque pour une strategie blog SEO
Le blog est un pilier essentiel du referencement car :
- Contenu regulier = signaux positifs pour Google
- Mots-cles longue traine = trafic qualifie
- Backlinks naturels = autorite du domaine
- Partageabilite sur reseaux sociaux

---

## Architecture Proposee

### Option A : Blog Editoriale Complet (Recommandee)

Creer un systeme de blog avec :
- Table `blog_article` en base de donnees
- Interface d'administration pour rediger les articles
- Pages publiques optimisees SEO
- Integration sitemap dynamique

```text
Structure du Blog :
+---------------------------+
|   /blog                   |  <- Liste des articles
+---------------------------+
|   /blog/:slug             |  <- Article individuel
+---------------------------+
         |
    Base de donnees
         |
+---------------------------+
|   blog_article            |
+---------------------------+
| - id                      |
| - slug                    |
| - title                   |
| - excerpt                 |
| - content (Markdown)      |
| - cover_image             |
| - author_id               |
| - category                |
| - tags                    |
| - published_at            |
| - meta_title              |
| - meta_description        |
+---------------------------+
```

### Option B : Transformer les Guides en Blog Dynamique

Convertir la page Guides existante en systeme dynamique :
- Migrer les 6 guides actuels en base de donnees
- Ajouter la possibilite de creer de nouveaux guides
- URL : `/guides/:slug`

---

## Plan d'Implementation Detaille

### Etape 1 : Creation de la Table `blog_article`

Structure de la table avec champs SEO :
- `slug` : URL SEO-friendly unique
- `title` : Titre H1 de l'article
- `meta_title` : Titre pour balise `<title>` (60 caracteres max)
- `meta_description` : Description meta (155 caracteres max)
- `excerpt` : Resume pour cartes et apercu
- `content` : Contenu complet en Markdown
- `cover_image` : Image de couverture
- `category` : Categorie principale (accords, degustation, regions, etc.)
- `tags` : Tags pour filtrage et SEO
- `published_at` : Date de publication
- `is_published` : Statut de publication
- `author_id` : Lien vers l'auteur

### Etape 2 : Pages Frontend

**A. Page Liste Blog (`/blog`)**
- Liste paginee des articles
- Filtrage par categorie
- Recherche par mots-cles
- Meta SEO : "Blog Vin - Conseils & Actualites | Wine Note"

**B. Page Article (`/blog/:slug`)**
- Rendu Markdown avec react-markdown
- Schema JSON-LD Article/BlogPosting
- Breadcrumbs : Accueil > Blog > [Categorie] > [Titre]
- Articles connexes en bas de page
- Boutons de partage social


### Etape 3 : Integration Sitemap

Ajouter les articles au sitemap dynamique :
- `/blog` avec priorite 0.8
- `/blog/:slug` avec priorite 0.7 et lastmod

### Etape 4 : Strategie de Contenu Suggeree

Categories d'articles a creer :
1. Blog sur l'utilisation de l'application

(on verra plus tard pour les autres blogs)
Ajoute la page blog dans le footer
---

## Resume des Fichiers a Creer/Modifier

| Fichier | Action |
|---------|--------|
| Migration SQL `blog_article` | CREER - Table + RLS |
| `src/pages/Blog.tsx` | CREER - Page liste articles |
| `src/pages/BlogArticle.tsx` | CREER - Page article individuel |
| `src/pages/admin/BlogAdmin.tsx` | CREER - Interface administration |
| `src/components/BlogCard.tsx` | CREER - Carte article |
| `src/components/BlogEditor.tsx` | CREER - Editeur Markdown |
| `src/App.tsx` | MODIFIER - Ajouter routes `/blog` |
| `supabase/functions/sitemap/index.ts` | MODIFIER - Ajouter articles |
| `src/integrations/supabase/types.ts` | REGENERER - Nouveaux types |

---

## Section Technique

### Schema Base de Donnees

```sql
CREATE TABLE blog_article (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance SEO
CREATE INDEX idx_blog_article_slug ON blog_article(slug);
CREATE INDEX idx_blog_article_published ON blog_article(is_published, published_at DESC);
CREATE INDEX idx_blog_article_category ON blog_article(category);

-- RLS : Lecture publique, ecriture admin
ALTER TABLE blog_article ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Articles publies visibles par tous" ON blog_article
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins peuvent tout faire" ON blog_article
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );
```

### Schema JSON-LD BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Titre de l'article",
  "image": "URL image couverture",
  "datePublished": "2025-01-30",
  "dateModified": "2025-01-30",
  "author": {
    "@type": "Person",
    "name": "Nom auteur"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Wine Note",
    "logo": {
      "@type": "ImageObject",
      "url": "https://winenote.me/wine-note-favicon.png"
    }
  },
  "description": "Meta description de l'article",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://winenote.me/blog/slug-article"
  }
}
```

---

## Benefices SEO Attendus

| Metrique | Impact |
|----------|--------|
| Pages indexees | +50-100 nouvelles URLs |
| Mots-cles longue traine | Trafic organique qualifie |
| Temps sur site | Augmentation via contenu de qualite |
| Backlinks | Contenu partageable = liens naturels |
| Autorite domaine | Signal de fraicheur pour Google |

---

## Question Prealable

Avant d'implementer, j'ai besoin de clarifier :

**Avez-vous deja un champ `is_admin` dans votre table `user_profiles` pour identifier les administrateurs qui pourront rediger les articles de blog ?**

Si non, il faudra aussi creer ce systeme d'administration.

