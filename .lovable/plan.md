

# Plan : Rendre les degustations visibles aux abonnes et sur les profils publics

## Situation actuelle

La table `user_wine_notice` (notes de degustation) a deux politiques RLS :
- `Utilisateurs accedent a leurs notes` (ALL) : `auth.uid() = user_id`
- `Utilisateurs voient leurs propres avis` (SELECT) : `auth.uid() = user_id`

Resultat : seul le proprietaire peut voir ses degustations. Meme sur un profil public, personne d'autre ne peut y acceder.

## Objectif

- **Profil public** : tout utilisateur authentifie peut voir les degustations
- **Profil prive** : seuls les abonnes acceptes peuvent voir les degustations
- Le proprietaire conserve tous les droits (lecture, ecriture, suppression)

## Modifications

### 1. Migration SQL : nouvelle politique RLS sur `user_wine_notice`

Ajouter une politique SELECT qui utilise la fonction existante `can_view_profile_content` (la meme que pour les posts) :

```sql
CREATE POLICY "Degustations visibles selon confidentialite profil"
ON user_wine_notice FOR SELECT TO authenticated
USING (can_view_profile_content(auth.uid(), user_id));
```

Cette fonction retourne `true` si :
- Le viewer est le proprietaire du profil
- Le profil est public
- Le viewer est un abonne accepte du profil prive

La politique ALL existante (`auth.uid() = user_id`) continue de gerer INSERT, UPDATE, DELETE pour le proprietaire uniquement.

### 2. Meme traitement pour les tables liees

Les tables `user_wine_notice_cellar` et `user_wine_notice_event` stockent les liens entre degustations et caves/evenements. Il faut verifier leurs RLS et ajouter la meme politique si necessaire.

### 3. RPC `get_user_tastings_with_location`

Cette fonction est utilisee pour la carte des degustations. Elle filtre deja par `p_user_id` passe en parametre. Etant SECURITY DEFINER, elle bypass RLS. Il faudra ajouter un controle `can_view_profile_content` dans la fonction elle-meme pour ne pas exposer la carte a des utilisateurs non autorises.

### 4. Modification frontend : `UserProfile.tsx`

Remplacer la condition `isOwnProfile` par `isOwnProfile || canViewContent` pour l'onglet Degustations (ligne 757). Le composant `UserTastings` devra accepter un `userId` en prop au lieu de toujours utiliser `user.id` du contexte auth.

### 5. Modification frontend : `UserTastings.tsx`

Ajouter une prop optionnelle `userId` pour permettre l'affichage des degustations d'un autre utilisateur. Si `userId` est fourni, l'utiliser au lieu de `user.id`. Masquer les actions d'edition/suppression si ce n'est pas le propre profil.

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter politique RLS SELECT avec `can_view_profile_content` sur `user_wine_notice` (+ tables liees) |
| Migration SQL | Ajouter controle `can_view_profile_content` dans le RPC `get_user_tastings_with_location` |
| `src/pages/UserProfile.tsx` | Remplacer `isOwnProfile` par `isOwnProfile \|\| canViewContent` pour l'onglet degustations |
| `src/components/UserTastings.tsx` | Ajouter prop `userId`, masquer actions d'edition si profil d'un autre |

## Securite

La fonction `can_view_profile_content` est SECURITY DEFINER et deja utilisee pour les posts, commentaires, likes et favoris. Reutiliser cette meme fonction garantit un comportement coherent : les degustations suivent exactement les memes regles de visibilite que les posts.

