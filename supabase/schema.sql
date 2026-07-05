-- ============================================================
-- CRM Proyecta Innova — Schema de base de datos (Supabase)
-- Pegar en: Supabase Dashboard > SQL Editor > Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------
create type public.app_role as enum ('administrador', 'teleoperador', 'vendedor');
create type public.user_status as enum ('activo', 'ausente', 'inhabilitado');
create type public.lead_status as enum ('nuevo', 'contactado', 'calificado', 'perdido');
create type public.contact_tag as enum ('cliente', 'socio', 'proveedor');
create type public.deal_status as enum ('abierto', 'ganado', 'perdido');
create type public.activity_type as enum ('llamada', 'email', 'reunion', 'nota', 'otro');
create type public.notification_category as enum ('leads', 'tareas', 'otros');

-- ------------------------------------------------------------
-- 2. PERFILES (empleados / usuarios del CRM)
--    Vinculado 1 a 1 con auth.users de Supabase
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  job_title   text,                                        -- ej. "Ejecutiva Senior de Ventas"
  role        public.app_role not null default 'vendedor',
  status      public.user_status not null default 'activo',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Permisos granulares por empleado (pantalla Gestión de Equipo)
create table public.permissions (
  code  text primary key,                                  -- ej. 'db_access'
  title text not null,                                     -- ej. 'Acceso a base de datos'
  icon  text                                               -- ej. 'database'
);

create table public.profile_permissions (
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  permission_code text not null references public.permissions (code) on delete cascade,
  granted_at      timestamptz not null default now(),
  primary key (profile_id, permission_code)
);

-- ------------------------------------------------------------
-- 3. CONTACTOS (directorio de relaciones corporativas)
-- ------------------------------------------------------------
create table public.contacts (
  id                  uuid primary key default gen_random_uuid(),
  full_name           text not null,
  job_title           text,                                -- ej. "CTO"
  company             text,
  email               text,
  phone               text,
  location            text,                                -- ej. "Madrid, España"
  tag                 public.contact_tag not null default 'cliente',
  last_interaction_at timestamptz,
  assigned_to         uuid references public.profiles (id) on delete set null, -- vendedor asignado
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Notas del panel de detalle de contacto
create table public.contact_notes (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  body       text not null,
  created_by uuid references public.profiles (id) on delete set null, -- null = "Sistema"
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. LEADS (oportunidades / clientes potenciales)
-- ------------------------------------------------------------
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  email           text,
  phone           text,
  company         text,
  status          public.lead_status not null default 'nuevo',
  source          text,                                    -- origen del lead (web, referido, etc.)
  assigned_to     uuid references public.profiles (id) on delete set null,
  last_contact_at timestamptz,
  -- si el lead se convierte, se enlaza al contacto resultante
  converted_contact_id uuid references public.contacts (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. NEGOCIOS / VENTAS (deals — alimenta Reportes y Ventas)
-- ------------------------------------------------------------
create table public.deals (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,                       -- ej. "Arquitectura Cloud Scale"
  amount              numeric(14, 2) not null default 0,
  status              public.deal_status not null default 'abierto',
  lead_id             uuid references public.leads (id) on delete set null,
  contact_id          uuid references public.contacts (id) on delete set null,
  owner_id            uuid references public.profiles (id) on delete set null, -- quien lo cierra
  expected_close_date date,
  closed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. EVENTOS (Calendario)
-- ------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  color       text,                                        -- clase/etiqueta de color en la UI
  meeting_notes text,                                      -- minuta: puntos tocados en la reunión
  lead_id     uuid references public.leads (id) on delete set null,
  contact_id  uuid references public.contacts (id) on delete set null,
  owner_id    uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint events_dates_check check (ends_at is null or ends_at >= starts_at)
);

-- ------------------------------------------------------------
-- 7. TAREAS (Próximas Tareas del dashboard)
-- ------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  tag          text,                                       -- ej. "Contrato", "Llamada"
  due_at       timestamptz,
  completed_at timestamptz,                                -- null = pendiente
  assigned_to  uuid references public.profiles (id) on delete set null,
  lead_id      uuid references public.leads (id) on delete set null,
  contact_id   uuid references public.contacts (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. ACTIVIDADES (historial de interacciones)
--    Alimenta "Último Contacto" (leads) y "Última Interacción" (contactos)
-- ------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  type        public.activity_type not null default 'nota',
  description text,
  lead_id     uuid references public.leads (id) on delete cascade,
  contact_id  uuid references public.contacts (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint activities_target_check check (lead_id is not null or contact_id is not null)
);

-- ------------------------------------------------------------
-- 9. NOTIFICACIONES (Recordatorios)
-- ------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  category    public.notification_category not null default 'otros',
  title       text not null,
  description text,
  icon        text,
  action_url  text,                                        -- ej. "/leads/xxx" para "Ver Lead"
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 10. ÍNDICES
-- ------------------------------------------------------------
create index idx_leads_status        on public.leads (status);
create index idx_leads_assigned_to   on public.leads (assigned_to);
create index idx_contacts_tag        on public.contacts (tag);
create index idx_contacts_assigned_to on public.contacts (assigned_to);
create index idx_contact_notes_contact on public.contact_notes (contact_id);
create index idx_deals_status        on public.deals (status);
create index idx_deals_owner         on public.deals (owner_id);
create index idx_deals_closed_at     on public.deals (closed_at);
create index idx_events_starts_at    on public.events (starts_at);
create index idx_events_owner        on public.events (owner_id);
create index idx_tasks_assigned_to   on public.tasks (assigned_to);
create index idx_tasks_due_at        on public.tasks (due_at);
create index idx_activities_lead     on public.activities (lead_id);
create index idx_activities_contact  on public.activities (contact_id);
create index idx_notifications_user  on public.notifications (user_id, read);

-- ------------------------------------------------------------
-- 11. TRIGGERS
-- ------------------------------------------------------------

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger trg_leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger trg_deals_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Crear perfil automáticamente al registrarse un usuario en auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Actualizar "última interacción" al registrar una actividad
create or replace function public.touch_last_interaction()
returns trigger
language plpgsql
as $$
begin
  if new.lead_id is not null then
    update public.leads set last_contact_at = new.occurred_at where id = new.lead_id;
  end if;
  if new.contact_id is not null then
    update public.contacts set last_interaction_at = new.occurred_at where id = new.contact_id;
  end if;
  return new;
end;
$$;

create trigger trg_activities_touch after insert on public.activities
  for each row execute function public.touch_last_interaction();

-- ------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
--     Regla base: cualquier usuario autenticado del equipo puede
--     leer/escribir datos del CRM; las notificaciones son personales.
-- ------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.permissions         enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.contacts            enable row level security;
alter table public.contact_notes       enable row level security;
alter table public.leads               enable row level security;
alter table public.deals               enable row level security;
alter table public.events              enable row level security;
alter table public.tasks               enable row level security;
alter table public.activities          enable row level security;
alter table public.notifications       enable row level security;

-- Helper: ¿el usuario actual es administrador?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'administrador'
  );
$$;

-- Perfiles: todos los autenticados ven el directorio; cada quien edita el suyo,
-- y los administradores pueden editar cualquiera (roles, permisos, etc.)
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- Catálogo de permisos: lectura para todos, gestión solo admin
create policy "permissions_select" on public.permissions
  for select to authenticated using (true);
create policy "permissions_admin_write" on public.permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "profile_permissions_select" on public.profile_permissions
  for select to authenticated using (true);
create policy "profile_permissions_admin_write" on public.profile_permissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Helper: rol del usuario actual
create or replace function public.my_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Contactos: el vendedor solo ve/edita sus prospectos asignados;
-- el admin ve todo; quien crea el contacto (teleoperador al convertir)
-- también puede verlo
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

create policy "contact_notes_all" on public.contact_notes
  for all to authenticated using (true) with check (true);

-- Leads: solo teleoperador y administrador
create policy "leads_teleop_admin" on public.leads
  for all to authenticated
  using (public.is_admin() or public.my_role() = 'teleoperador')
  with check (public.is_admin() or public.my_role() = 'teleoperador');
create policy "deals_all" on public.deals
  for all to authenticated using (true) with check (true);
create policy "events_all" on public.events
  for all to authenticated using (true) with check (true);
create policy "tasks_all" on public.tasks
  for all to authenticated using (true) with check (true);
create policy "activities_all" on public.activities
  for all to authenticated using (true) with check (true);

-- Notificaciones: cada usuario solo ve y modifica las suyas
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- 13. DATOS SEMILLA: catálogo de permisos de la UI
-- ------------------------------------------------------------
insert into public.permissions (code, title, icon) values
  ('db_access',      'Acceso a base de datos',   'database'),
  ('client_view',    'Vista de clientes',        'visibility'),
  ('finance_access', 'Acceso financiero',        'payments'),
  ('settings_access','Acceso a configuración',   'admin_panel_settings'),
  ('campaign_ctrl',  'Control de campañas',      'campaign');
