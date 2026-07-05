# Gestión de Roles

El sistema cuenta con tres roles de usuario, cada uno con permisos específicos
para acceder a los módulos del CRM según sus responsabilidades dentro del
proceso comercial. El control se aplica en tres capas:

1. **Menú lateral** — cada rol solo ve sus pestañas (`src/lib/nav-items.ts`).
2. **Rutas** — el proxy redirige a Inicio si se entra por URL directa a una
   pestaña no permitida (`src/proxy.ts`).
3. **Base de datos (RLS)** — las políticas de Supabase garantizan la
   restricción aunque se salte la UI (`supabase/schema.sql`).

---

## Rol: Teleoperador

Responsable de la captación y calificación inicial de los leads hasta
convertirlos en prospectos.

**Pestañas disponibles:**

- **Inicio (Dashboard)**: indicadores relacionados con los leads.
- **Leads**:
  - Registrar y consultar leads (botón "Nuevo Lead" del topbar).
  - Registrar el resultado de llamadas (menú de acciones → Registrar llamada).
  - Convertir un lead en prospecto (menú de acciones → Convertir a prospecto):
    crea el contacto, el teleoperador elige el vendedor asignado y el lead
    queda en estado **Prospecto** con la marca "Convertido".

---

## Rol: Vendedor

Responsable de la gestión comercial de los prospectos asignados, la
coordinación de reuniones y el seguimiento hasta el cierre.

**Pestañas disponibles:**

- **Inicio (Dashboard)**: indicadores de su gestión comercial.
- **Contactos**:
  - Gestionar sus prospectos asignados.
  - Consultar el historial de interacciones (llamadas, reuniones, notas).
  - Actualizar el estado del prospecto.
  - Registrar observaciones e intereses (notas).
- **Calendario**:
  - Programar, reprogramar y cancelar reuniones.
  - Registrar el resultado de las reuniones (minuta + confirmación de datos
    del contacto).
- **Recordatorios**: consultar alertas automáticas (incluye la campana del
  topbar, exclusiva de este rol).

> **Restricción:** el vendedor solo visualiza y gestiona los prospectos que
> tiene asignados (`contacts.assigned_to`), tanto en la interfaz como a nivel
> de base de datos (RLS).

---

## Rol: Administrador

Responsable de la administración del sistema, la gestión de usuarios y la
supervisión general de la operación comercial.

**Pestañas disponibles:**

- **Inicio (Dashboard)**: indicadores generales del sistema.
- **Contactos**: consulta todos los prospectos y su historial.
- **Calendario**: consulta la programación de reuniones (solo lectura).
- **Empleados / Usuarios**: crear y editar usuarios, administrar roles y
  permisos, inhabilitar cuentas.

> Nota: por decisión del equipo (jul 2026), el administrador **no** ve la
> pestaña Leads ni Recordatorios, a diferencia de la versión inicial del
> documento de roles.

---

## Matriz de Accesos

| Pestaña | Teleoperador | Vendedor | Administrador |
|---------|:------------:|:--------:|:-------------:|
| Inicio (Dashboard) | ✅ | ✅ | ✅ |
| Leads | ✅ | ❌ | ❌ |
| Contactos | ❌ | ✅ (solo asignados) | ✅ |
| Calendario | ❌ | ✅ | ✅ (solo consulta) |
| Recordatorios | ❌ | ✅ | ❌ |
| Empleados / Usuarios | ❌ | ❌ | ✅ |
