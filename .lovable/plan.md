

# Redesign des cartes de degustation + diagnostic carte

## 1. Redesign de la carte de degustation (vue "date")

**Etat actuel** (lignes 1004-1059 de `UserTastings.tsx`) : layout vertical avec image a gauche, infos empilees a droite, bouton Story en bas a gauche dans le flux texte, note inline avec le pouce.

**Nouveau layout** :

```text
┌──────────────────────────────────────────┐
│ [🗑️ Suppr]  [📸 Story]     ⭐ 4.2/5     │  ← barre d'actions en haut
│─────────────────────────────────────────│
│ [image]  Nom du vin                      │
│          Domaine                         │
│          Année: 2020                     │
│          👍                              │
│          Commentaire tronqué...          │
│          📅 Dégusté le 08/03/2026        │
└──────────────────────────────────────────┘
```

**Changements concrets** :
- Ajouter une barre d'actions en haut de chaque carte avec :
  - A gauche : bouton Supprimer (icone `Trash2`, ghost, petit, rouge) + bouton Story Instagram (existant, deplace)
  - A droite : la note (etoile + rating/5), centree verticalement
- Les deux boutons visibles uniquement si `isOwnProfile`
- Supprimer la note et le bouton Story de leur emplacement actuel dans le corps de la carte
- Le bouton Supprimer demande confirmation via un `AlertDialog` avant d'appeler `supabase.from('user_wine_notice').delete().eq('id', tasting.id)`
- Apres suppression, retirer la tasting du state local

**Fichier** : `UserTastings.tsx` — modifier le bloc de rendu des cartes en vue date (lignes ~1004-1059). Importer `Trash2` de lucide et `AlertDialog` depuis les composants UI.

## 2. Carte (Map) — Diagnostic

La carte utilise Mapbox via le token `VITE_MAPBOX_TOKEN` et la RPC `get_user_tastings_with_location`. Le token est present dans `.env`. La RPC existe dans les types Supabase.

**Causes probables** :
- Si l'erreur est "Map container not found" ou un probleme de rendu : c'est souvent lie au CSS du conteneur
- Si la RPC retourne une erreur 400/500 : la fonction SQL n'existe peut-etre plus apres les migrations
- Si c'est une erreur Mapbox (401) : le token a peut-etre expire ou atteint son quota

**Action** : sans pouvoir reproduire l'erreur en ce moment (l'utilisateur n'est pas sur la vue carte), je ne peux pas diagnostiquer plus loin. Je recommande de tester la carte et de me montrer l'erreur exacte. Si c'est un probleme de quota Mapbox, c'est cote fournisseur.

## Resume des modifications

| Fichier | Changement |
|---------|-----------|
| `UserTastings.tsx` | Redesign carte : barre d'actions en haut (supprimer + story a gauche, note a droite), suppression avec confirmation, meme layout pour les 4 vues (date, domain, event, cellar) |

