-- ============================================================
-- CRM Proyecta Innova — Migración: accesos por rol (2026-07-05)
-- Pegar en: Supabase Dashboard > SQL Editor > Run
--
-- Requiere haber ejecutado antes migration_2026-07-05_roles_reuniones.sql
-- (roles administrador / teleoperador / vendedor).
-- Las instalaciones nuevas no la necesitan (schema.sql ya la incluye).
--
-- Cambios:
--   1. contacts.assigned_to: vendedor asignado al prospecto
--   2. Helper my_role(): rol del usuario actual
--   3. RLS contacts: el vendedor solo ve/edita sus asignados
--      (admin ve todo; quien crea el contacto también lo ve)
--   4. RLS leads: solo teleoperador y administrador
-- ============================================================

-- 1. Vendedor asignado al prospecto
alter table public.contacts
  add column if not exists assigned_to uuid
  references public.profiles (id) on delete set null;

create index if not exists idx_contacts_assigned_to
  on public.contacts (assigned_to);

-- 2. Helper: rol del usuario actual
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- 3. Contactos: restricción por vendedor
drop policy if exists "contacts_all" on public.contacts;

create policy "contacts_select" on public.contacts
  for select to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

create policy "contacts_insert" on public.contacts
  for insert to authenticated with check (true);

create policy "contacts_update" on public.contacts
  for update to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()))
  with check (public.is_admin() or assigned_to = (select auth.uid()));

create policy "contacts_delete" on public.contacts
  for delete to authenticated
  using (public.is_admin());

-- 4. Leads: solo teleoperador y administrador
drop policy if exists "leads_all" on public.leads;

create policy "leads_teleop_admin" on public.leads
  for all to authenticated
  using (public.is_admin() or public.my_role() = 'teleoperador')
  with check (public.is_admin() or public.my_role() = 'teleoperador');
