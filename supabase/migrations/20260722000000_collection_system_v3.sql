alter table public.listings
  add column if not exists minimum_offer_amount numeric(12,2),
  add column if not exists offers_enabled boolean not null default true,
  add column if not exists offer_acceptance text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'listings_offer_acceptance_check'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_offer_acceptance_check
      check (offer_acceptance in ('manual', 'auto_accept_at_minimum'));
  end if;
end $$;

update public.listings
set offers_enabled = true
where offers_enabled is null;

create table if not exists public.collection_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint collection_follows_not_self check (user_id <> collection_owner_id),
  constraint collection_follows_unique unique (user_id, collection_owner_id)
);

create index if not exists collection_follows_user_id_idx
  on public.collection_follows (user_id, created_at desc);

create index if not exists collection_follows_collection_owner_id_idx
  on public.collection_follows (collection_owner_id, created_at desc);

alter table public.collection_follows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'collection_follows'
      and policyname = 'Users can view their followed collections'
  ) then
    create policy "Users can view their followed collections"
      on public.collection_follows
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'collection_follows'
      and policyname = 'Users can follow collections'
  ) then
    create policy "Users can follow collections"
      on public.collection_follows
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'collection_follows'
      and policyname = 'Users can unfollow collections'
  ) then
    create policy "Users can unfollow collections"
      on public.collection_follows
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
