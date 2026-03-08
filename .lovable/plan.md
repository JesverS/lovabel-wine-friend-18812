

# Plan d'implementation — 5 fonctionnalites

---

## 1. Notifications pour les event posts

### Migration SQL
Ajouter un trigger `AFTER INSERT` sur `event_post` qui cree une notification pour chaque membre de l'evenement (via `user_event`) sauf l'auteur du post. Utiliser `pg_net` pour envoyer la push notification, comme les autres triggers de notification existants.

```sql
create or replace function public.notify_on_event_post()
returns trigger language plpgsql security definer set search_path = 'public' as $$
declare
  v_event_name text;
  v_event_slug text;
  v_author_name text;
  v_member record;
begin
  select name, slug into v_event_name, v_event_slug from event where id = NEW.event_id;
  select full_name into v_author_name from user_profiles where id = NEW.author_id;

  for v_member in
    select user_id from user_event where event_id = NEW.event_id and user_id != NEW.author_id
  loop
    perform create_notification(
      v_member.user_id,
      'event_post',
      'Nouvelle actualité',
      coalesce(v_author_name, 'Un organisateur') || ' a publié dans ' || v_event_name,
      jsonb_build_object('event_id', NEW.event_id, 'event_slug', v_event_slug, 'post_id', NEW.id)
    );
  end loop;
  return NEW;
end;
$$;

create trigger trg_notify_event_post
  after insert on event_post
  for each row execute function notify_on_event_post();
```

### Frontend
Ajouter le type `event_post` dans `NotificationItem.tsx` pour afficher l'icone `Newspaper` et naviguer vers `/event/{slug}` au clic.

**Fichiers modifies :** Migration SQL, `NotificationItem.tsx`

---

## 2. Toggle Dark Mode

### Header.tsx
Ajouter un bouton `Sun`/`Moon` (lucide) qui appelle `setTheme()` de `next-themes`. Importer `useTheme` depuis `next-themes`. Placer le toggle a cote des icones existantes (favoris, profil).

### main.tsx ou App.tsx
Verifier que le `ThemeProvider` de `next-themes` englobe bien l'app (attribut `attribute="class"`). S'il manque, l'ajouter.

### MobileBottomNav
Pas de toggle la, le header suffit.

**Fichiers modifies :** `Header.tsx`, eventuellement `App.tsx` ou `main.tsx`

---

## 3. Pull-to-refresh sur mobile

### Nouveau composant `PullToRefresh.tsx`
Composant wrapper qui detecte le geste de swipe vers le bas quand `scrollTop === 0`. Affiche un indicateur de chargement (spinner) et appelle un callback `onRefresh`. Utilise les touch events natifs (`touchstart`, `touchmove`, `touchend`) pour detecter le geste. Ne s'active que sur mobile (`useIsMobile()`).

### Integration
- **Feed.tsx** : Wrapper le `<SocialFeed />` dans `<PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['social-feed'] })} />`
- **Events.tsx** : Wrapper la liste d'evenements dans `<PullToRefresh onRefresh={fetchEvents} />`

**Fichiers modifies :** Nouveau `PullToRefresh.tsx`, `Feed.tsx`, `Events.tsx`

---

## 4. Comparaison de palais entre amis

### Logique
Le `TastingDashboard` recoit deja un `userId`. Pour la comparaison, on cree un nouveau composant `TastingComparison.tsx` qui :
1. Recoit `myUserId` et `friendUserId`
2. Fetch les `user_wine_notice` des deux utilisateurs (le friend doit avoir un profil public ou etre suivi)
3. Calcule les moyennes radar (slot1-4) par type de vin pour chacun
4. Affiche deux `Radar` superposes dans le meme `RadarChart` (Recharts) avec des couleurs differentes et une legende

### Integration dans UserProfile.tsx
- Sur le profil d'un ami (pas le sien), si `canViewContent` est true, afficher un bouton "Comparer nos palais" a cote de l'onglet "Palais"
- Ce bouton ouvre un `Dialog` contenant `TastingComparison`
- L'onglet "Palais" (actuellement `isOwnProfile` only) devient visible sur les profils publics/suivis aussi, en read-only
- Le bouton "Comparer" n'apparait que quand l'utilisateur connecte a lui-meme des degustations

### Donnees
Les `user_wine_notice` sont accessibles via RLS existante (`can_view_profile_content`). Pas de nouvelle table.

**Fichiers crees :** `TastingComparison.tsx`
**Fichiers modifies :** `UserProfile.tsx` (onglet palais visible pour les profils visibles + bouton comparer), `TastingDashboard.tsx` (exposer la logique de calcul radar en tant que fonction exportee reutilisable)

---

## Resume des changements

| Fonctionnalite | Fichiers | Effort |
|---|---|---|
| Notifications event posts | Migration SQL + `NotificationItem.tsx` | Faible |
| Dark mode toggle | `Header.tsx`, `App.tsx` | Faible |
| Pull-to-refresh | Nouveau `PullToRefresh.tsx`, `Feed.tsx`, `Events.tsx` | Moyen |
| Comparaison de palais | Nouveau `TastingComparison.tsx`, `UserProfile.tsx`, `TastingDashboard.tsx` | Moyen |

