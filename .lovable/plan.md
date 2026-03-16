

# Plan - Ameliorer le design "Dernieres decouvertes"

## Changements

### 1. Hook `useRecentWines.ts`
- Ajouter `region` a la jointure domain : `domain:domain_id(name, region)`
- Ajouter `domain_region: string | null` a l'interface `RecentWine`

### 2. Composant `FeaturedWines.tsx`
- **Espacement** : Remplacer `-mx-4 px-4` par un padding plus genereux (`px-6 md:px-0`) pour eloigner les bouteilles des bords
- **Mini-carte** : Wrapper chaque item dans une carte avec `bg-card border border-border/60 rounded-2xl p-3 shadow-sm` qui englobe a la fois l'image ET les infos texte (actuellement l'image est dans une carte mais le texte est en dehors)
- **Region** : Afficher la region du domaine sous le nom du domaine en `text-xs text-muted-foreground/70`

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/hooks/useRecentWines.ts` | Ajouter region a la query et au type |
| `src/components/FeaturedWines.tsx` | Carte englobante, espacement bords, affichage region |

