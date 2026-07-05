import { createClient } from "@/lib/supabase/client";

/**
 * Registra un evento en el log de auditoría (RD-11).
 * Si actorName no se indica, se registra con el usuario autenticado.
 */
export async function logAudit(
  action: string,
  detail: string,
  actorName?: string,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("audit_log").insert({
    action,
    detail,
    actor_id: actorName ? null : (user?.id ?? null),
    actor_name: actorName ?? null,
  });
}
