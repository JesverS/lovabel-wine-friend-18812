

# Plan d'implémentation — Wishlist, QR Caves, Posts d'événements

## 1. Wishlist "À goûter"

### 1.1 Migration SQL
Nouvelle table `wine_wishlist` :
```sql
create table public.wine_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_id uuid not null references public.wine(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, wine_id)
);
alter table public.wine_wishlist enable row level security;
-- RLS: l'utilisateur voit/gère ses propres entrées
create policy "Users manage own wishlist" on public.wine_wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Visibilité publique (profils publics) pour les visiteurs
create policy "Public profiles wishlist visible" on public.wine_wishlist
  for select to authenticated using (
    public.can_view_profile_content(auth.uid(), user_id)
  );
```

### 1.2 Trigger auto-retrait
Quand un `user_wine_notice` est inséré (= vin dégusté), supprimer automatiquement le vin de la wishlist :
```sql
create or replace function public.remove_from_wishlist_on_tasting()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  delete from wine_wishlist where user_id = NEW.user_id and wine_id = NEW.wine_id;
  return NEW;
end;
$$;
create trigger trg_remove_wishlist_on_tasting
  after insert on user_wine_notice
  for each row execute function remove_from_wishlist_on_tasting();
```

### 1.3 Frontend — Bouton Bookmark dans `WineDetailsDialog.tsx`
- Ajouter un state `isInWishlist` à côté de `isFavorite`
- Fetch `wine_wishlist` dans le `useEffect` existant (en parallèle des autres fetches)
- Icône `Bookmark` / `BookmarkCheck` à côté du cœur, toggle insert/delete sur `wine_wishlist`

### 1.4 Frontend — Onglet Wishlist dans `Favorites.tsx`
- Ajouter des `Tabs` : "Favoris" (Heart) | "À goûter" (Bookmark)
- Nouveau composant `UserWishlist.tsx` qui liste les vins de `wine_wishlist` avec le même pattern que `UserFavorites` (pagination, vue par date)

---

## 2. QR Code pour les caves

### 2.1 Dépendance
Installer `qrcode.react` (lib légère, rendu côté client uniquement).

### 2.2 Composant `CellarQRCodeDialog.tsx`
- Dialog avec un QR code pointant vers `https://winenote.me/cellar/${slug}`
- Bouton "Télécharger" qui exporte le QR en PNG via `canvas.toDataURL()`
- Le QR inclut le logo de la cave au centre (option de `qrcode.react`)

### 2.3 Intégration dans `CellarDetails.tsx`
- Afficher un bouton "QR Code" (icône `QrCode` de lucide) dans le header de la cave
- Visible pour les membres de la cave (owner/co_owner/admin) ou si `is_seller = true`

---

## 3. Posts d'événements

### 3.1 Nouvelles tables SQL

**Table `event_post`** :
```sql
create table public.event_post (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.event(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  image_url text,
  visibility text not null default 'members_only'
    check (visibility in ('public', 'members_only')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  likes_count integer default 0,
  comment_count integer default 0
);
alter table public.event_post enable row level security;
```

**Table `event_post_like`** :
```sql
create table public.event_post_like (
  id uuid primary key default gen_random_uuid(),
  event_post_id uuid not null references public.event_post(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(event_post_id, user_id)
);
alter table public.event_post_like enable row level security;
```

**Table `event_post_comment`** :
```sql
create table public.event_post_comment (
  id uuid primary key default gen_random_uuid(),
  event_post_id uuid not null references public.event_post(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  likes_count integer default 0
);
alter table public.event_post_comment enable row level security;
```

**Table `event_post_comment_like`** :
```sql
create table public.event_post_comment_like (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_post_comment(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);
alter table public.event_post_comment_like enable row level security;
```

### 3.2 RLS — Logique de visibilité

**Qui peut CRÉER un post ?** Organisateur, co-organisateur ou admin de l'événement (via `user_event` avec rôle adéquat).

**Qui peut LIRE un post ?**
- `visibility = 'public'` : accessible si l'événement est public, OU si l'utilisateur possède le `private_token` (vérifié via Edge Function), OU si l'utilisateur est membre (`user_event`)
- `visibility = 'members_only'` : accessible uniquement si l'utilisateur est membre (`user_event`)

Helper SECURITY DEFINER pour éviter la récursion RLS :
```sql
create or replace function public.can_view_event_post(_user_id uuid, _post_id uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from event_post ep
    join event e on e.id = ep.event_id
    where ep.id = _post_id
    and (
      -- Post public + event public = tout le monde
      (ep.visibility = 'public' and e.access_type = 'public')
      -- Post public + event privé = membres uniquement (le token est géré côté Edge Function)
      or (ep.visibility = 'public' and exists (
        select 1 from user_event ue where ue.event_id = e.id and ue.user_id = _user_id
      ))
      -- Post members_only = membres uniquement
      or (ep.visibility = 'members_only' and exists (
        select 1 from user_event ue where ue.event_id = e.id and ue.user_id = _user_id
      ))
    )
  );
$$;
```

Policies RLS sur `event_post` :
- SELECT : `using (can_view_event_post(auth.uid(), id))`
- INSERT : organisateur/co-organisateur/admin seulement
- UPDATE/DELETE : auteur du post seulement

Policies sur likes et commentaires : accès en lecture si `can_view_event_post` du post parent, écriture si authentifié et peut voir le post.

### 3.3 Triggers compteurs
- `event_post_like` INSERT/DELETE → met à jour `event_post.likes_count`
- `event_post_comment` INSERT/DELETE → met à jour `event_post.comment_count`
- `event_post_comment_like` INSERT/DELETE → met à jour `event_post_comment.likes_count`

### 3.4 Accès via token (événements privés, posts publics)
Pour les visiteurs non-membres qui ont le token de l'événement, les posts `visibility = 'public'` doivent être accessibles. Comme le token n'est pas dans le JWT, la RLS ne peut pas le vérifier. Solution : modifier l'Edge Function `get-event-by-slug` pour retourner aussi les posts publics de l'événement dans sa réponse. Les posts `members_only` ne sont jamais retournés par l'Edge Function pour les non-membres.

### 3.5 Frontend

**Nouveau composant `EventPosts.tsx`** :
- Feed de posts avec like/commentaire (même UX que `PostCard` mais adapté)
- Toggle de visibilité à la création : "Visible par tous" / "Réservé aux inscrits"
- Affiché dans un nouvel onglet "Actualités" sur `EventDetails.tsx`

**Composant `CreateEventPost.tsx`** :
- Champ texte + upload image optionnel + sélecteur de visibilité
- Visible uniquement pour les organisateurs/co-organisateurs/admins

**Composant `EventPostCard.tsx`** :
- Affichage du post avec avatar auteur, contenu, image, likes, commentaires
- Boutons like/commentaire fonctionnels
- Badge de visibilité (cadenas pour members_only, globe pour public)

### 3.6 Intégration dans `EventDetails.tsx`
- Ajouter un onglet "Actualités" (icône `Newspaper`) dans les tabs existants
- Le contenu de l'onglet = `<EventPosts eventId={event.id} canPost={canEdit} />`
- Les posts publics sont visibles par tout visiteur ayant accès à la page (token ou public)
- Les posts members_only ne sont visibles que pour les inscrits (`hasAccess = true`)

---

## Résumé des fichiers

| Fichier | Action |
|---------|--------|
| **Migration SQL** | Tables `wine_wishlist`, `event_post`, `event_post_like`, `event_post_comment`, `event_post_comment_like` + RLS + triggers + helpers |
| `WineDetailsDialog.tsx` | Bouton Bookmark wishlist |
| `Favorites.tsx` | Tabs Favoris / À goûter |
| `UserWishlist.tsx` | Nouveau composant liste wishlist |
| `CellarQRCodeDialog.tsx` | Nouveau composant QR code |
| `CellarDetails.tsx` | Bouton QR code |
| `EventPosts.tsx` | Nouveau composant feed posts event |
| `CreateEventPost.tsx` | Nouveau composant création post event |
| `EventPostCard.tsx` | Nouveau composant card post event |
| `EventDetails.tsx` | Onglet Actualités |
| `get-event-by-slug/index.ts` | Retourner les posts publics pour les non-membres avec token |
| `package.json` | Ajout `qrcode.react` |

