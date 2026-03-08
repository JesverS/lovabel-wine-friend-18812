

# Améliorations de la carte des dégustations

Après analyse du code actuel (706 lignes), voici les problèmes concrets et améliorations proposées :

## 1. Chargement des images en parallèle (performance critique)

Actuellement, les marqueurs photos sont chargés **séquentiellement** (lignes 394-443 : `for...await` un par un). Avec 20 dégustations, cela peut prendre 15-20 secondes avant que la carte n'affiche quoi que ce soit.

**Correction** : Remplacer la boucle séquentielle par `Promise.allSettled()` pour charger toutes les images en parallèle. Le temps de chargement passera de N×3s à ~3s max.

## 2. Navigation SPA cassée

Ligne 613 : `window.location.href = href` provoque un **rechargement complet de la page** quand on clique "Voir le vin". C'est lent et l'utilisateur perd son contexte.

**Correction** : Dispatcher un custom event `navigate-to-wine` capté par un `useEffect` qui appelle `navigate()` de React Router.

## 3. Popups incompatibles Dark Mode

Tous les popups utilisent des couleurs en dur (`color:#666`, `background:#fff`, `border:1px solid #ddd`). En dark mode, ils restent blancs avec du texte gris illisible.

**Correction** : Utiliser des classes CSS Tailwind injectées via une balise `<style>` dans le popup au lieu de styles inline. Ou utiliser des variables CSS `hsl(var(--foreground))` etc.

## 4. Légende non cliquable (filtrage)

La légende en bas est purement décorative. L'utilisateur ne peut pas filtrer visuellement par type de source directement depuis la carte.

**Correction** : Rendre les pastilles de la légende cliquables pour toggle la visibilité des marqueurs par `source_type` via un filtre Mapbox dynamique.

## 5. État vide plus engageant

L'état "Aucune dégustation géolocalisée" est un texte plat sans action possible.

**Correction** : Ajouter un CTA vers la création d'une dégustation spontanée ou un lien vers les événements.

---

## Résumé des changements

| Amélioration | Impact | Effort |
|---|---|---|
| Chargement images parallèle | Performance ×5-10 | ~15 lignes |
| Navigation SPA (custom event) | UX fluide | ~10 lignes |
| Dark mode popups | Cohérence visuelle | ~20 lignes |
| Légende filtrable | Interactivité | ~25 lignes |
| État vide amélioré | Engagement | ~5 lignes |

**Fichier modifié** : `TastingsMap.tsx` uniquement.

