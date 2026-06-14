-- keringanan_requests: financial-assistance requests submitted by members

create table if not exists public.keringanan_requests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  name            text not null,
  contact_number  text not null,
  email           text not null,
  jumlah_sanggup  integer not null default 0,
  alasan          text not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- one active (pending or approved) request per member at a time
create unique index keringanan_one_active_per_member
  on public.keringanan_requests(profile_id)
  where status in ('pending', 'approved');

alter table public.keringanan_requests enable row level security;

-- members can insert their own request
create policy "keringanan_insert_own"
  on public.keringanan_requests for insert to authenticated
  with check (profile_id = auth.uid());

-- members can read their own requests
create policy "keringanan_select_own"
  on public.keringanan_requests for select to authenticated
  using (profile_id = auth.uid());

-- super admins can read all
create policy "keringanan_select_superadmin"
  on public.keringanan_requests for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_super_admin = true
    )
  );

-- super admins can update status and admin_notes
create policy "keringanan_update_superadmin"
  on public.keringanan_requests for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_super_admin = true
    )
  );
