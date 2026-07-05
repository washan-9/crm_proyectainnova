-- ============================================================
-- CRM Proyecta Innova — Migración (2026-07-05)
-- Pegar en: Supabase Dashboard > SQL Editor > Run
--
-- Solo para bases de datos que YA ejecutaron schema.sql antes
-- de esta fecha. Las instalaciones nuevas no la necesitan
-- (schema.sql ya incluye estos cambios).
--
-- Cambios:
--   1. Nuevo estado de empleado: 'inhabilitado'
--   2. Nueva columna events.meeting_notes (minuta de reunión)
--   3. Roles nuevos: administrador / teleoperador / vendedor
--      (antes: administrador / gerente / colaborador)
--      Mapeo de datos existentes: gerente → teleoperador,
--      colaborador → vendedor.
-- ============================================================

-- 1. Estado 'inhabilitado' para empleados
alter type public.user_status add value if not exists 'inhabilitado';

-- 2. Minuta de reunión (puntos tocados)
alter table public.events add column if not exists meeting_notes text;

-- 3. Roles nuevos
alter type public.app_role rename to app_role_old;

create type public.app_role as enum (
  'administrador',
  'teleoperador',
  'vendedor'
);

alter table public.profiles alter column role drop default;

alter table public.profiles
  alter column role type public.app_role
  using (
    case role::text
      when 'administrador' then 'administrador'
      when 'gerente'       then 'teleoperador'
      else                      'vendedor'
    end
  )::public.app_role;

alter table public.profiles alter column role set default 'vendedor';

drop type public.app_role_old;

-- Verificación
select role, count(*) from public.profiles group by role;
