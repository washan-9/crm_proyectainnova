# Gestión de Roles — CRM de Terrenos (guía definitiva)

Sistema basado en el mockup `docs/HTML GUIA DEFINITIVA.html`, con la paleta
azul del proyecto. El control de acceso se aplica en tres capas:

1. **Menú lateral** — cada rol solo ve sus pantallas (`src/lib/nav-items.ts`).
2. **Rutas** — el proxy redirige si se entra por URL directa (`src/proxy.ts`).
3. **Base de datos (RLS)** — políticas de Supabase (`supabase/schema_v2.sql`).

---

## 🔵 Teleoperador

Captación y calificación inicial de leads hasta convertirlos en prospectos.

- **Captación de Leads (CU-01)**: registro manual con validación en tiempo
  real (RD-09) y bloqueo de duplicados (RF-05, auditado).
- **Calificación de Leads (CU-02/03/04)**: bandeja de pendientes, registro
  del resultado de llamadas y conversión a Prospecto **solo tras interés
  explícito** (RD-05), eligiendo el vendedor asignado.

> **RD-05:** su acceso sobre el registro termina en la conversión: el
> prospecto pasa a la cartera del vendedor y desaparece de su bandeja
> (bloqueado también por RLS).

## 🟢 Vendedor

Gestión comercial de su propia cartera (RD-10).

- **Gestión de Prospectos (CU-05)**: solo sus asignados; ficha con estados
  (Reserva/Venta bloqueados por RD-06), historial e interés registrado.
- **Gestión de Reuniones (CU-06)**: programa reuniones de sus prospectos y
  registra resultado + compromiso pendiente con vencimiento (RD-07).
- **Seguimiento Comercial (CU-08)**: solo sus alertas — 3 días sin respuesta
  → alerta (RD-04); 5 días → Congeladora automática (RD-02); máx. 2 intentos
  de contacto por semana, el botón se bloquea al llegar al límite (RD-03).
- **Gestión de Terrenos (CU-09)**: consulta de disponibilidad en tiempo real
  y asociación de lotes a sus prospectos.

> Cero acceso a Reportes y Administración.

## 🔴 Administrador

Acceso total e irrestricto a las 8 pantallas, con vista global de todas las
carteras y alertas.

- **Administración y Seguridad (CU-12)**: crear/editar/inhabilitar usuarios,
  log de auditoría (RD-11), solicitudes de eliminación de datos en máximo
  10 días hábiles (RD-12, Ley N°29733) y umbrales parametrizables de
  seguimiento (RD-02/03/04).
- **Reportes (CU-13)**: KPIs, leads por semana, embudo de conversión y
  ranking de vendedores (RF-36/37/38).
- En Reuniones y Terrenos opera en modo consulta/gestión global.

---

## Matriz de Accesos

| Pantalla | Teleoperador | Vendedor | Administrador |
|----------|:------------:|:--------:|:-------------:|
| Captación de Leads | ✅ | ❌ | ✅ |
| Calificación de Leads | ✅ | ❌ | ✅ |
| Gestión de Prospectos | ❌ | ✅ (solo su cartera) | ✅ (global) |
| Gestión de Reuniones | ❌ | ✅ (sus prospectos) | ✅ (consulta) |
| Seguimiento Comercial | ❌ | ✅ (sus alertas) | ✅ (global) |
| Gestión de Terrenos | ❌ | ✅ (consulta + asociar) | ✅ (gestión) |
| Reportes | ❌ | ❌ | ✅ |
| Administración y Seguridad | ❌ | ❌ | ✅ |

`/` redirige a la primera pantalla de cada rol (teleoperador/admin →
Captación; vendedor → Prospectos).
