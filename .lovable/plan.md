

# Plan : Corriger l'incoherence sur la visibilite des favoris

## Constat

L'audit de la base de donnees revele que toutes les tables de contenu utilisateur utilisent `can_view_profile_content` pour le SELECT, **sauf `user_favorite`** qui n'a qu'une politique `ALL` restreinte au proprietaire.

| Table | Politique SELECT publique | Status |
|-------|--------------------------|--------|
| post | `can_view_profile_content` | OK |
| post_comment | via JOIN post | OK |
| post_like | via JOIN post | OK |
| post_comment_like | via JOIN post | OK |
| user_wine_notice | `can_view_profile_content` | OK |
| user_wine_notice_cellar | via JOIN notice | OK |
| user_wine_notice_event | via JOIN notice | OK |
| **user_favorite** | **Aucune** | A corriger |

## Modification

### 1. Migration SQL : politique RLS SELECT sur `user_favorite`

Ajouter une politique SELECT identique aux autres tables :

```sql
CREATE POLICY "Favoris visibles selon confidentialite profil"
ON user_favorite FOR SELECT TO authenticated
USING (can_view_profile_content(auth.uid(), user_id));
```

### 2. Frontend : `UserProfile.tsx`

L'onglet Favoris utilise actuellement `isOwnProfile` pour la visibilite. Le remplacer par `isOwnProfile || canViewContent`, de la meme facon que les degustations.

### 3. Frontend : `UserFavorites.tsx`

Ajouter une prop optionnelle `userId` pour permettre l'affichage des favoris d'un autre utilisateur. Masquer les actions de suppression de favoris si ce n'est pas le propre profil.

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter politique RLS SELECT avec `can_view_profile_content` sur `user_favorite` |
| `src/pages/UserProfile.tsx` | Remplacer `isOwnProfile` par `isOwnProfile \|\| canViewContent` pour l'onglet favoris |
| `src/components/UserFavorites.tsx` | Ajouter prop `userId`, masquer actions de suppression si profil d'un autre |

## Securite

Meme approche que pour les degustations : reutilisation de `can_view_profile_content` pour garantir un comportement coherent sur tout le profil.

