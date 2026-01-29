# Plan SEO Complet pour Wine Note

## ✅ IMPLÉMENTÉ

### Phase 1 : Corriger les fondamentaux HTML ✅
- [x] `index.html` : lang="fr", meta tags, keywords, robots, structured data Organization

### Phase 2 : Créer un Sitemap.xml ✅
- [x] `public/sitemap.xml` créé avec toutes les URLs publiques (10 pages)

### Phase 3 : Améliorer le robots.txt ✅
- [x] `public/robots.txt` mis à jour avec lien vers sitemap

### Phase 4 : Ajouter URLs canoniques ✅
- [x] `src/pages/Learning.tsx` : canonical + og:url
- [x] `src/pages/Events.tsx` : canonical + og:url
- [x] `src/pages/About.tsx` : Helmet + canonical + og:url
- [x] `src/pages/Contact.tsx` : canonical + og:url
- [x] `src/pages/Guides.tsx` : canonical + og:url
- [x] `src/pages/Cellars.tsx` : Helmet + canonical + og:url
- [x] `src/pages/EventDetails.tsx` : canonical dynamique + og:url

### Phase 5 : Structured Data (Schema.org) ✅
- [x] `index.html` : Schema Organization
- [x] `src/pages/EventDetails.tsx` : Schema Event JSON-LD

---

## 🔲 ACTIONS MANUELLES REQUISES (Post-Déploiement)

### 1. Google Search Console (CRITIQUE)
1. Aller sur https://search.google.com/search-console
2. Ajouter et vérifier `winenote.me`
3. Soumettre le sitemap : `https://winenote.me/sitemap.xml`
4. Demander l'indexation de la page d'accueil
5. Demander l'indexation des pages principales (/learning, /events, /guides)

### 2. Bing Webmaster Tools
- https://www.bing.com/webmasters
- Même processus que Google

### 3. Google My Business (optionnel mais recommandé)
- Créer une fiche entreprise "Wine Note"
- Ajouter le site web

---

## 🔲 PHASE 6 : Pre-rendering (Moyen terme - Recommandé)

Le problème fondamental des SPA React : Google voit initialement `<div id="root"></div>`.

**Options recommandées :**

| Option | Complexité | Coût | Impact |
|--------|------------|------|--------|
| **Prerender.io** | Faible | ~$15/mois | Élevé |
| **react-snap** | Moyenne | Gratuit | Élevé |
| **Next.js** | Élevée | Gratuit | Très élevé |

---

## Impact Attendu

| Métrique | Avant | Après (2-4 semaines) |
|----------|-------|----------------------|
| Pages indexées | 0 | 10+ pages |
| Recherche "wine note" | Non trouvé | Top 10 |
| Recherche "cours œnologie" | Non classé | Visible |
| Rich snippets | Non | Oui (événements) |
