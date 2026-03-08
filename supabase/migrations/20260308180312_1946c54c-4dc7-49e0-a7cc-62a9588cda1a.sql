
-- Trigger to notify event members when an event post is created
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
