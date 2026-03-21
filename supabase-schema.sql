create table tinker_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  title text not null,
  description text,
  status text not null default 'new' check (status in ('new','researching','ready','building')),
  market_scan jsonb,
  differentiation text,
  mvp_spec jsonb,
  verdict jsonb,
  mockup_html text
);

alter table tinker_ideas enable row level security;
create policy "Allow all" on tinker_ideas for all using (true) with check (true);
