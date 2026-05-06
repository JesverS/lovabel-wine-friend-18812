
# Audit complet Wine Note — Points forts, problèmes et améliorations

---

## Ce qui fonctionne bien

### Design & Identité visuelle
- **Palette cohérente** : Bordeaux/or/crème avec un design system bien structuré (tokens CSS, dark mode supporté)
- **Typographie soignée** : Playfair Display pour les titres + Inter pour le corps, bon contraste de style
- **Hero impactant** : Image de fond + overlay gradient + CTA clairs, très professionnel
- **Footer complet** : Bien organisé en colonnes (Découvrir, Communauté, À propos), mention légale alcool incluse

### Architecture & Navigation
- **Header desktop** : Navigation claire avec liens bien hiérarchisés, bouton Connexion visible
- **Bottom nav mobile** : 4 onglets (Accueil, Feed, Favoris, Profil) bien pensés
- **Breadcrumbs** : Présents sur toutes les sous-pages (Events, Cellars, Learning)
- **Routing complet** : +30 routes couvrant tout l'écosystème (events, cellars, courses, blog, payments, etc.)

### Fonctionnalités
- **Page Cours** : Présentation claire avec progression XP, 3 catégories de cours, compteur de leçons
- **Page Événements** : Filtres (nom, ville, date), affichage des événements publics
- **Page Cavistes** : Recherche par nom et adresse, message d'incitation à la connexion pour la géolocalisation
- **Page Auth** : OAuth (Apple + Google) + email/password, flow inscription/connexion/reset bien structuré
- **Gestion d'erreurs** : `errorHandler.ts` avec typage fort, messages utilisateur-friendly, ErrorBoundary global
- **SEO** : Helmet avec meta og, canonical, sitemap

---

## Problèmes identifiés

### CRITIQUE — Sections de la homepage invisibles
Les sections **Features**, **WineExperiences** et **FeaturedWines** sont dans le DOM mais ne s'affichent pas visuellement pour les visiteurs non connectés. La page passe directement du Hero au bloc SocialFeed ("Rejoignez la communauté") puis au Footer. Cela rend la homepage extrêmement courte et ne présente pas la proposition de valeur du produit.

**Cause probable** : Les composants sont rendus comme des `<div>` vides (0 hauteur) au lieu de sections visibles. Possible problème de lazy rendering, d'animation bloquante, ou de condition d'affichage non remplie (ex: FeaturedWines retourne `null` si pas de données).

### Performance
- **FCP à ~9s** en dev (attendu en dev, mais à vérifier en prod)
- **250 scripts** chargés (normal en Vite dev, mais attention au bundle de prod)
- **lucide-react (158KB)** : Plus gros module — envisager le tree-shaking ou l'import sélectif
- **Style recalc duration : 842ms** — nombre élevé de recalculs (6853)

### Qualité du code
- **89 fichiers avec `any`** : `UserTastings.tsx` (15), `UserProfile.tsx` (9), `useSocialFeed.ts` (8) — risque de bugs runtime
- **`console.log` en production** : `AuthConfirm.tsx` (6), `Auth.tsx` (3), `ResetPassword.tsx` (2), `BlogArticle.tsx` (1) — fuite d'info
- **Pas de lazy loading des pages** : Toutes les 30+ pages sont importées statiquement dans `App.tsx` — impact direct sur le temps de chargement initial

---

## Améliorations recommandées

### UX & Parcours utilisateur

1. **Corriger la homepage non-connecté** (priorité haute)
   - Vérifier pourquoi Features/WineExperiences/FeaturedWines ne s'affichent pas
   - La homepage est le premier contact avec l'app, elle doit convaincre

2. **Lazy loading des routes**
   - Envelopper chaque page dans `React.lazy()` + `Suspense`
   - Réduira considérablement le bundle initial (~46KB rien que pour EventDetails)

3. **Mobile spacing**
   - Le footer sur mobile est collé au contenu sans séparation visuelle suffisante
   - Le padding-bottom pour le MobileBottomNav (64px) peut masquer du contenu en bas de page

### Graphique & Visuel

4. **Page Auth minimaliste**
   - Pas de header ni d'image de fond, design très plat comparé au reste du site
   - Pourrait bénéficier d'un split layout (illustration à gauche, formulaire à droite)

5. **Page Événements — état vide**
   - Quand il n'y a qu'un seul événement, la page paraît vide
   - Ajouter un CTA pour créer un événement ou un message d'encouragement

6. **Cohérence des états vides**
   - La page Cavistes montre un bel état vide avec icône
   - Toutes les pages devraient avoir ce même niveau de polish pour l'état "pas de données"

### Technique

7. **Supprimer les console.log**
   - Remplacer par le `logger.ts` existant ou les supprimer

8. **Réduire les `any`**
   - Prioriser les fichiers avec 5+ occurrences (UserTastings, UserProfile, useSocialFeed, PostCard)
   - Utiliser les types générés de Supabase

9. **Optimiser les imports lucide-react**
   - Vérifier que le tree-shaking fonctionne correctement en production

10. **Ajouter des meta OG spécifiques**
    - Les pages Events, Cellars, Courses n'ont pas nécessairement de meta OG dédiées

---

## Résumé des priorités

| Priorité | Élément | Impact |
|----------|---------|--------|
| Critique | Homepage sections invisibles | Utilisateurs ne voient pas la valeur du produit |
| Haute | Lazy loading des routes | Performance initiale |
| Haute | Supprimer console.log | Sécurité/propreté |
| Moyenne | Améliorer page Auth | Conversion |
| Moyenne | États vides cohérents | UX polish |
| Basse | Réduire les `any` | Maintenabilité |
| Basse | Optimiser lucide-react | Performance |
