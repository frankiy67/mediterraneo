-- Séances de sport, code-barres des repas, et publication temps réel.
-- Appliqué sur le projet le 5 septembre 2026. Aucune donnée existante n'est touchée.

-- ── séances de sport ─────────────────────────────────────────────
-- Les calories sont stockées telles qu'enregistrées (estimation MET, corrigeable),
-- pour qu'un changement de formule ne réécrive jamais le passé.
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  time text not null default '18:00',
  kind text not null default 'other',
  label text not null default '',
  minutes integer not null default 0,
  kcal integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_date_idx on public.sessions using btree (user_id, date desc);

alter table public.sessions enable row level security;

drop policy if exists sessions_owner on public.sessions;
create policy sessions_owner on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── code-barres du produit scanné ────────────────────────────────
-- Nullable : la saisie à la main et l'analyse photo n'en ont pas.
alter table public.meals add column if not exists barcode text;

-- ── synchronisation entre appareils ──────────────────────────────
-- Les tables n'étaient pas publiées : le canal temps réel écoutait dans le vide.
-- REPLICA IDENTITY FULL fait porter à l'événement la ligne complète, sans quoi
-- une suppression n'emporte que la clé primaire et le filtre user_id ne peut pas
-- s'appliquer — un repas supprimé sur un appareil resterait sur l'autre.
do $$
declare t text;
begin
  foreach t in array array['goals', 'meals', 'weights', 'supplements', 'sessions'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
