-- ============================================================
-- CRM Proyecta Innova — Schema v2 (CRM de Terrenos, guía definitiva)
-- Pegar en: Supabase Dashboard > SQL Editor > Run
--
-- Ejecutar sobre la base existente: conserva profiles / permissions /
-- auth y REEMPLAZA el dominio comercial anterior (contactos, deals,
-- eventos, tareas, notificaciones) por el nuevo embudo de terrenos:
--   leads → prospectos → reuniones/seguimiento → terrenos
-- más gobernanza: auditoría (RD-11), solicitudes de eliminación
-- (RD-12, Ley 29733) y umbrales parametrizables (RD-02/03/04).
--
-- Requiere: profiles con roles administrador/teleoperador/vendedor
-- y helpers is_admin() / my_role() (schema.sql + migraciones previas).
-- ============================================================

-- ------------------------------------------------------------
-- 0. LIMPIEZA DEL DOMINIO ANTERIOR
-- ------------------------------------------------------------
drop table if exists public.notifications      cascade;
drop table if exists public.activities         cascade;
drop table if exists public.tasks              cascade;
drop table if exists public.events             cascade;
drop table if exists public.deals              cascade;
drop table if exists public.contact_notes      cascade;
drop table if exists public.leads              cascade;
drop table if exists public.contacts           cascade;

drop type if exists public.lead_status            cascade;
drop type if exists public.contact_tag            cascade;
drop type if exists public.deal_status            cascade;
drop type if exists public.activity_type          cascade;
drop type if exists public.notification_category  cascade;

-- ------------------------------------------------------------
-- 1. ENUMS DEL NUEVO DOMINIO
-- ------------------------------------------------------------
create type public.lead_channel     as enum ('facebook_ads', 'instagram', 'referido', 'google_ads', 'otro');
create type public.lead_state       as enum ('nuevo', 'contactado', 'descartado', 'convertido');
create type public.prospect_state   as enum ('prospecto', 'interesado', 'en_seguimiento', 'congelado');
create type public.meeting_status   as enum ('programada', 'realizada', 'no_asistio', 'cancelada');
create type public.interaction_type as enum ('llamada', 'whatsapp', 'reunion', 'nota', 'sistema');

-- ------------------------------------------------------------
-- 2. LEADS (Captación · CU-01)
-- ------------------------------------------------------------
create table public.leads (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  email                 text,
  phone                 text,
  channel               public.lead_channel not null default 'otro',
  origin                text not null default 'manual',          -- 'manual' | 'zapier'
  state                 public.lead_state not null default 'nuevo',
  discard_reason        text,
  converted_prospect_id uuid,                                    -- FK se agrega más abajo
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. PROSPECTOS (CU-05 · cartera del vendedor, RD-10)
-- ------------------------------------------------------------
create table public.prospects (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid references public.leads (id) on delete set null,
  full_name           text not null,
  email               text,
  phone               text,
  dni                 text,
  channel             public.lead_channel,
  state               public.prospect_state not null default 'prospecto',
  assigned_to         uuid references public.profiles (id) on delete set null, -- vendedor (RD-10)
  budget              numeric(12,2),                             -- presupuesto S/
  desired_area        text,                                      -- ej. "~300 m²"
  financing           boolean,                                   -- pregunta por financiamiento
  frozen_at           timestamptz,                               -- cuándo entró a congeladora (RD-02)
  last_interaction_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.leads
  add constraint leads_converted_prospect_fk
  foreign key (converted_prospect_id) references public.prospects (id) on delete set null;

-- ------------------------------------------------------------
-- 4. INTERACCIONES (historial único, RNF-17; alimenta RD-03/04)
-- ------------------------------------------------------------
create table public.interactions (
  id          uuid primary key default gen_random_uuid(),
  type        public.interaction_type not null default 'nota',
  result      text,                                              -- ej. "Contactado — mostró interés"
  notes       text,
  lead_id     uuid references public.leads (id) on delete cascade,
  prospect_id uuid references public.prospects (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint interactions_target_check check (lead_id is not null or prospect_id is not null)
);

-- ------------------------------------------------------------
-- 5. REUNIONES (CU-06 · compromisos RD-07)
-- ------------------------------------------------------------
create table public.meetings (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references public.prospects (id) on delete cascade,
  purpose        text not null,                                  -- ej. "Reunión de seguimiento"
  scheduled_at   timestamptz not null,
  modality       text not null default 'virtual' check (modality in ('virtual', 'presencial')),
  location       text,
  status         public.meeting_status not null default 'programada',
  result_notes   text,
  commitment     text,                                           -- compromiso pendiente (RD-07)
  commitment_due date,                                           -- fecha estimada de seguimiento
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. TERRENOS (CU-09 · RD-08: solo Disponible / No disponible)
-- ------------------------------------------------------------
create table public.plots (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                               -- ej. LOTE-014
  area_m2    numeric(8,2) not null,
  block      text,                                               -- Manzana
  feature    text,                                               -- ej. "Vista al valle"
  price      numeric(12,2) not null,
  available  boolean not null default true,
  project    text not null default 'Condominio Campestre Bosque Alto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lotes asociados a prospectos (interés del cliente)
create table public.prospect_plots (
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  plot_id     uuid not null references public.plots (id) on delete cascade,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (prospect_id, plot_id)
);

-- ------------------------------------------------------------
-- 7. AUDITORÍA (RD-11)
-- ------------------------------------------------------------
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  action     text not null,                                      -- ej. "Lead duplicado bloqueado"
  detail     text,
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_name text,                                               -- 'sistema (automático)' si no hay actor
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 8. SOLICITUDES DE ELIMINACIÓN DE DATOS (RD-12 · Ley N°29733)
-- ------------------------------------------------------------
create table public.deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid references public.prospects (id) on delete set null,
  subject_name text not null,
  requested_at date not null default current_date,
  due_date     date not null default current_date + 10,          -- plazo 10 días hábiles
  status       text not null default 'pendiente' check (status in ('pendiente', 'procesada')),
  processed_at timestamptz,
  processed_by uuid references public.profiles (id) on delete set null
);

-- ------------------------------------------------------------
-- 9. PARÁMETROS (RD-02/03/04 parametrizables por el Administrador)
-- ------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       numeric not null,
  description text
);

insert into public.app_settings (key, value, description) values
  ('alert_days',        3, 'Días sin respuesta para generar alerta (RD-04)'),
  ('freeze_days',       5, 'Días sin respuesta para pasar a Congeladora (RD-02)'),
  ('max_attempts_week', 2, 'Máximo de intentos de contacto por semana (RD-03)');

-- ------------------------------------------------------------
-- 10. ÍNDICES
-- ------------------------------------------------------------
create index idx_leads_state            on public.leads (state);
create index idx_leads_phone            on public.leads (phone);
create index idx_leads_email            on public.leads (email);
create index idx_prospects_assigned     on public.prospects (assigned_to);
create index idx_prospects_state        on public.prospects (state);
create index idx_interactions_lead      on public.interactions (lead_id);
create index idx_interactions_prospect  on public.interactions (prospect_id, occurred_at);
create index idx_meetings_prospect      on public.meetings (prospect_id);
create index idx_meetings_scheduled     on public.meetings (scheduled_at);
create index idx_audit_created          on public.audit_log (created_at);

-- ------------------------------------------------------------
-- 11. TRIGGERS
-- ------------------------------------------------------------
create trigger trg_leads_v2_updated_at before update on public.leads
  for each row execute function public.set_updated_at();
create trigger trg_prospects_updated_at before update on public.prospects
  for each row execute function public.set_updated_at();
create trigger trg_meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();
create trigger trg_plots_updated_at before update on public.plots
  for each row execute function public.set_updated_at();

-- Toda interacción actualiza el "última respuesta" del prospecto
-- (base de las alertas RD-02/RD-04)
create or replace function public.touch_prospect_interaction()
returns trigger
language plpgsql
as $$
begin
  if new.prospect_id is not null then
    update public.prospects
      set last_interaction_at = new.occurred_at
      where id = new.prospect_id;
  end if;
  return new;
end;
$$;

create trigger trg_interactions_touch after insert on public.interactions
  for each row execute function public.touch_prospect_interaction();

-- ------------------------------------------------------------
-- 12. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.leads             enable row level security;
alter table public.prospects         enable row level security;
alter table public.interactions      enable row level security;
alter table public.meetings          enable row level security;
alter table public.plots             enable row level security;
alter table public.prospect_plots    enable row level security;
alter table public.audit_log         enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.app_settings      enable row level security;

-- Leads: solo teleoperador y administrador (el teleoperador pierde
-- acceso al registro cuando se convierte — la UI lo filtra y el
-- prospecto resultante ya no le pertenece, RD-05)
create policy "leads_teleop_admin" on public.leads
  for all to authenticated
  using (public.is_admin() or public.my_role() = 'teleoperador')
  with check (public.is_admin() or public.my_role() = 'teleoperador');

-- Prospectos: vendedor solo su cartera (RD-10); admin todo;
-- el teleoperador puede insertarlos (conversión CU-04) pero no leerlos
create policy "prospects_select" on public.prospects
  for select to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()));
create policy "prospects_insert" on public.prospects
  for insert to authenticated with check (true);
create policy "prospects_update" on public.prospects
  for update to authenticated
  using (public.is_admin() or assigned_to = (select auth.uid()))
  with check (public.is_admin() or assigned_to = (select auth.uid()));
create policy "prospects_delete" on public.prospects
  for delete to authenticated using (public.is_admin());

-- Interacciones: admin todo; teleoperador las de leads; vendedor las
-- de sus prospectos; cualquiera puede insertar (queda auditado por user_id)
create policy "interactions_select" on public.interactions
  for select to authenticated
  using (
    public.is_admin()
    or (lead_id is not null and public.my_role() = 'teleoperador')
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "interactions_insert" on public.interactions
  for insert to authenticated with check (true);

-- Reuniones: admin todo (consulta); vendedor solo las de sus prospectos
create policy "meetings_select" on public.meetings
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "meetings_write" on public.meetings
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "meetings_update" on public.meetings
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "meetings_delete" on public.meetings
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );

-- Terrenos: consulta para todo el equipo; gestión solo admin (RF-25)
create policy "plots_select" on public.plots
  for select to authenticated using (true);
create policy "plots_admin_write" on public.plots
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "prospect_plots_select" on public.prospect_plots
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "prospect_plots_write" on public.prospect_plots
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );
create policy "prospect_plots_delete" on public.prospect_plots
  for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prospects p
      where p.id = prospect_id and p.assigned_to = (select auth.uid())
    )
  );

-- Auditoría: solo el admin la lee; cualquier autenticado inserta eventos
create policy "audit_select_admin" on public.audit_log
  for select to authenticated using (public.is_admin());
create policy "audit_insert" on public.audit_log
  for insert to authenticated with check (true);

-- Solicitudes de eliminación: solo admin
create policy "deletion_requests_admin" on public.deletion_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Parámetros: lectura para todos, edición solo admin
create policy "settings_select" on public.app_settings
  for select to authenticated using (true);
create policy "settings_admin_write" on public.app_settings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
