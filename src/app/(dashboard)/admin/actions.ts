"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type EmployeeRole = "administrador" | "teleoperador" | "vendedor";

type ActionResult = { ok: true } | { ok: false; error: string };

// Verifica que quien llama a la acción sea un administrador autenticado.
async function assertAdmin(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "No hay sesión activa.";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "administrador") {
    return "Solo los administradores pueden gestionar empleados.";
  }
  return null;
}

// Cliente con service_role: puede crear/banear usuarios en Auth.
// Nunca exponer esta clave al navegador.
function adminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function createEmployee(input: {
  full_name: string;
  email: string;
  password: string;
  job_title: string | null;
  role: EmployeeRole;
}): Promise<ActionResult> {
  const authError = await assertAdmin();
  if (authError) return { ok: false, error: authError };

  const admin = adminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en .env.local (ver README).",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });

  if (error) return { ok: false, error: error.message };

  // El trigger handle_new_user ya creó el perfil; completamos cargo y rol.
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: input.full_name,
      job_title: input.job_title,
      role: input.role,
    })
    .eq("id", data.user.id);

  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}

export async function setEmployeeAccess(
  employeeId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const authError = await assertAdmin();
  if (authError) return { ok: false, error: authError };

  const admin = adminClient();
  if (!admin) {
    return {
      ok: false,
      error:
        "Falta configurar SUPABASE_SERVICE_ROLE_KEY en .env.local (ver README).",
    };
  }

  // Bloquea (o restaura) el inicio de sesión en Supabase Auth
  const { error: banError } = await admin.auth.admin.updateUserById(
    employeeId,
    { ban_duration: enabled ? "none" : "87600h" }, // ~10 años
  );
  if (banError) return { ok: false, error: banError.message };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ status: enabled ? "activo" : "inhabilitado" })
    .eq("id", employeeId);

  if (profileError) return { ok: false, error: profileError.message };
  return { ok: true };
}
