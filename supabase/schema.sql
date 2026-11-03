-- MAISON — schéma Supabase (à exécuter dans l'éditeur SQL du projet)
-- Chaque ligne appartient à un utilisateur ; RLS : on ne voit que ses propres données.

create table if not exists public.garments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,            -- fiche complète du vêtement (voir src/types.ts)
  photo_path text,                -- chemin dans le bucket « garments »
  created_at timestamptz not null default now()
);
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.calendar_entries (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  data jsonb not null,
  primary key (user_id, day)
);
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  avatar jsonb,
  settings jsonb
);

alter table public.garments enable row level security;
alter table public.outfits enable row level security;
alter table public.calendar_entries enable row level security;
alter table public.profiles enable row level security;

create policy "own garments" on public.garments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own outfits" on public.outfits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own calendar" on public.calendar_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own profile" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Stockage des photos : bucket privé, un dossier par utilisateur
insert into storage.buckets (id, name, public) values ('garments', 'garments', false) on conflict do nothing;
create policy "own photos" on storage.objects for all
  using (bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'garments' and (storage.foldername(name))[1] = auth.uid()::text);
