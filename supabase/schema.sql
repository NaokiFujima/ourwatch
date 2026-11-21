-- OurWatch: jalankan di Supabase > SQL Editor.
-- Matikan "Allow new users to sign up" di Auth > Providers > Email, lalu buat 2 user lewat dashboard (Auth > Users > Add user).
create table profiles (id uuid primary key references auth.users on delete cascade, username text unique, display_name text, avatar_url text, created_at timestamptz default now());
create table movies (id uuid primary key default gen_random_uuid(), title text not null, description text, storage_path text not null, poster_path text, duration_seconds int, file_size_bytes bigint, uploaded_by uuid references profiles(id), created_at timestamptz default now(), updated_at timestamptz default now());
create table rooms (id uuid primary key default gen_random_uuid(), name text not null, movie_id uuid references movies(id) on delete set null, created_by uuid references profiles(id), status text default 'active', invite_code text, created_at timestamptz default now(), deleted_at timestamptz);
create table room_members (id uuid primary key default gen_random_uuid(), room_id uuid references rooms(id) on delete cascade, user_id uuid references profiles(id), joined_at timestamptz default now(), last_seen_at timestamptz default now(), unique (room_id, user_id));
create table messages (id uuid primary key default gen_random_uuid(), room_id uuid references rooms(id) on delete cascade, user_id uuid references profiles(id), message_text text not null, created_at timestamptz default now());
create table reactions (id uuid primary key default gen_random_uuid(), room_id uuid references rooms(id) on delete cascade, user_id uuid references profiles(id), emoji text not null, created_at timestamptz default now());
create table playback_state (room_id uuid primary key references rooms(id) on delete cascade, current_time_seconds double precision default 0, is_playing boolean default false, playback_rate real default 1, updated_by uuid references profiles(id), updated_at timestamptz default now(), version int default 0);

-- Batas dua akun, ditegakkan di database; profil dibuat otomatis
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from profiles) >= 2 then raise exception 'OurWatch hanya untuk dua akun'; end if;
  insert into profiles (id, username, display_name) values (new.id, split_part(new.email,'@',1), split_part(new.email,'@',1));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Maksimal dua anggota per room
create or replace function limit_room_members() returns trigger language plpgsql as $$
begin
  if (select count(*) from room_members where room_id = new.room_id) >= 2 then raise exception 'Room penuh'; end if;
  return new;
end $$;
create trigger room_members_limit before insert on room_members for each row execute function limit_room_members();

create or replace function is_allowed() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid()) $$;

do $$ declare t text; begin
  foreach t in array array['profiles','movies','rooms','room_members','messages','reactions','playback_state'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "allowed_all" on %I for all to authenticated using (is_allowed()) with check (is_allowed())', t);
  end loop; end $$;

-- Storage privat untuk video & poster
insert into storage.buckets (id, name, public) values ('movies','movies',false) on conflict do nothing;
create policy "movies_allowed" on storage.objects for all to authenticated using (bucket_id='movies' and is_allowed()) with check (bucket_id='movies' and is_allowed());

-- Realtime
alter publication supabase_realtime add table messages, playback_state, rooms;
