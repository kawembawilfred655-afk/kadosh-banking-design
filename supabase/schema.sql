create table if not exists public.demo_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('transfer', 'deposit', 'savings_contribution', 'withdrawal')),
  title text not null check (char_length(title) between 1 and 80),
  detail text not null default '' check (char_length(detail) <= 120),
  amount_ugx bigint not null check (amount_ugx between 1 and 100000000),
  reference text not null unique check (reference ~ '^KDL-DEMO-[A-Za-z0-9-]{1,24}$'),
  created_at timestamptz not null default now()
);

create index if not exists demo_transactions_user_created_idx
  on public.demo_transactions (user_id, created_at desc);

alter table public.demo_transactions enable row level security;

revoke all on table public.demo_transactions from anon, authenticated;
grant select, insert on table public.demo_transactions to authenticated;

drop policy if exists "Demo users read their own transactions" on public.demo_transactions;
create policy "Demo users read their own transactions"
  on public.demo_transactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Demo users add their own transactions" on public.demo_transactions;
create policy "Demo users add their own transactions"
  on public.demo_transactions for insert to authenticated
  with check (auth.uid() = user_id);

create or replace function public.limit_kadosh_demo_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 0)
  );

  select count(*) into recent_count
  from public.demo_transactions
  where user_id = new.user_id
    and created_at > pg_catalog.now() - interval '1 minute';

  if recent_count >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'Demo transaction rate limit exceeded.';
  end if;

  return new;
end;
$$;

revoke all on function public.limit_kadosh_demo_writes() from public, anon, authenticated;

drop trigger if exists limit_kadosh_demo_writes on public.demo_transactions;
create trigger limit_kadosh_demo_writes
  before insert on public.demo_transactions
  for each row execute function public.limit_kadosh_demo_writes();
