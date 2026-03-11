

# Skeleton UI pour CellarDetails

## Changement

Remplacer le bloc loading (lignes 192-201) qui affiche "Chargement..." par un skeleton reproduisant la structure de la page :

```text
Header (deja affiche)

Container :
  [Breadcrumb skeleton - 3 segments]
  [Banner skeleton - aspect-video max-h-[400px] rounded-lg]
  
  [Header section]
    [Avatar skeleton 20x20 md:24x24 rounded-full]
    [Titre skeleton h-8 w-2/3]
    [Location skeleton h-4 w-1/3]
  
  [Tabs skeleton - 2 onglets]
  [Catalogue skeleton]
    [3 cartes produit skeleton en grille]

Footer (deja affiche)
```

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/pages/CellarDetails.tsx` | Remplacer le bloc `if (loading)` par un skeleton complet avec Skeleton component |

Import `Skeleton` depuis `@/components/ui/skeleton`, construire la structure squelette avec les memes espacements et tailles que le contenu reel (banniere `aspect-video`, avatar `w-20 h-20`, titre, localisation, grille 3 colonnes pour le catalogue).

