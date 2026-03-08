
-- =============================================
-- 1. WINE WISHLIST
-- =============================================
create table public.wine_wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wine_id uuid not null references public.wine(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, wine_id)
);
alter table public.wine_wishlist enable row level security;

create policy "Users manage own wishlist" on public.wine_wishlist
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Public profiles wishlist visible" on public.wine_wishlist
  for select to authenticated using (
    public.can_view_profile_content(auth.uid(), user_id)
  );

-- Trigger: auto-remove from wishlist when tasting is recorded
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

-- =============================================
-- 2. EVENT POST
-- =============================================
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

create index idx_event_post_event_id on public.event_post(event_id);
create index idx_event_post_author_id on public.event_post(author_id);

-- Helper: can view event post
create or replace function public.can_view_event_post(_user_id uuid, _event_id uuid, _visibility text)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select (
    -- Post public + event public = tout le monde authentifié
    (_visibility = 'public' and exists (
      select 1 from event e where e.id = _event_id and e.is_public = true
    ))
    -- Membre de l'événement = tout voir
    or exists (
      select 1 from user_event ue where ue.event_id = _event_id and ue.user_id = _user_id
    )
    -- Organisateur direct
    or exists (
      select 1 from event e where e.id = _event_id and e.organizer_id = _user_id
    )
  );
$$;

-- Helper: can create event post (organizer/co_organizer/admin)
create or replace function public.can_create_event_post(_user_id uuid, _event_id uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from user_event ue
    where ue.event_id = _event_id
    and ue.user_id = _user_id
    and ue.role in ('organizer', 'co_organizer', 'admin')
  ) or exists (
    select 1 from event e where e.id = _event_id and e.organizer_id = _user_id
  );
$$;

-- RLS policies for event_post
create policy "View event posts" on public.event_post
  for select to authenticated
  using (public.can_view_event_post(auth.uid(), event_id, visibility));

create policy "Create event posts" on public.event_post
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_create_event_post(auth.uid(), event_id)
  );

create policy "Update own event posts" on public.event_post
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Delete own event posts" on public.event_post
  for delete to authenticated
  using (author_id = auth.uid());

-- =============================================
-- 3. EVENT POST LIKE
-- =============================================
create table public.event_post_like (
  id uuid primary key default gen_random_uuid(),
  event_post_id uuid not null references public.event_post(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(event_post_id, user_id)
);
alter table public.event_post_like enable row level security;

create policy "View event post likes" on public.event_post_like
  for select to authenticated
  using (exists (
    select 1 from event_post ep
    where ep.id = event_post_id
    and public.can_view_event_post(auth.uid(), ep.event_id, ep.visibility)
  ));

create policy "Manage own event post likes" on public.event_post_like
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Delete own event post likes" on public.event_post_like
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger: update likes_count on event_post
create or replace function public.update_event_post_likes_count()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if TG_OP = 'INSERT' then
    update event_post set likes_count = likes_count + 1 where id = NEW.event_post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update event_post set likes_count = greatest(0, likes_count - 1) where id = OLD.event_post_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_event_post_likes_count
  after insert or delete on event_post_like
  for each row execute function update_event_post_likes_count();

-- =============================================
-- 4. EVENT POST COMMENT
-- =============================================
create table public.event_post_comment (
  id uuid primary key default gen_random_uuid(),
  event_post_id uuid not null references public.event_post(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  likes_count integer default 0
);
alter table public.event_post_comment enable row level security;

create policy "View event post comments" on public.event_post_comment
  for select to authenticated
  using (exists (
    select 1 from event_post ep
    where ep.id = event_post_id
    and public.can_view_event_post(auth.uid(), ep.event_id, ep.visibility)
  ));

create policy "Create event post comments" on public.event_post_comment
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Delete own event post comments" on public.event_post_comment
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger: update comment_count on event_post
create or replace function public.update_event_post_comment_count()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if TG_OP = 'INSERT' then
    update event_post set comment_count = comment_count + 1 where id = NEW.event_post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update event_post set comment_count = greatest(0, comment_count - 1) where id = OLD.event_post_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_event_post_comment_count
  after insert or delete on event_post_comment
  for each row execute function update_event_post_comment_count();

-- =============================================
-- 5. EVENT POST COMMENT LIKE
-- =============================================
create table public.event_post_comment_like (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.event_post_comment(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);
alter table public.event_post_comment_like enable row level security;

create policy "View event post comment likes" on public.event_post_comment_like
  for select to authenticated
  using (exists (
    select 1 from event_post_comment epc
    join event_post ep on ep.id = epc.event_post_id
    where epc.id = comment_id
    and public.can_view_event_post(auth.uid(), ep.event_id, ep.visibility)
  ));

create policy "Manage own event post comment likes" on public.event_post_comment_like
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "Delete own event post comment likes" on public.event_post_comment_like
  for delete to authenticated
  using (user_id = auth.uid());

-- Trigger: update likes_count on event_post_comment
create or replace function public.update_event_post_comment_likes_count()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if TG_OP = 'INSERT' then
    update event_post_comment set likes_count = likes_count + 1 where id = NEW.comment_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update event_post_comment set likes_count = greatest(0, likes_count - 1) where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_event_post_comment_likes_count
  after insert or delete on event_post_comment_like
  for each row execute function update_event_post_comment_likes_count();
