import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export async function OPTIONS() {
  return new Response("ok", { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Inicializar cliente de Supabase usando el rol de servicio (Service Role Key)
    // Esto garantiza los privilegios de servidor para saltar políticas RLS si aplica
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. Extraer y limpiar la carga de datos (Payload) proveniente de Zapier
    const body = await request.json();
    const fullName = (body.full_name || "").trim();
    const email = (body.email || "").trim() || null;
    const phone = (body.phone || "").trim() || null;
    const channel = (body.channel || "otro").trim().toLowerCase();

    // Validación básica inicial
    if (!fullName) {
      return NextResponse.json(
        { error: "El campo 'full_name' es obligatorio." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Regla de Negocio RF-05: Bloqueo y descarte preventivo de duplicados
    const checks: string[] = [];
    if (phone) checks.push(`phone.eq.${phone}`);
    if (email) checks.push(`email.eq.${email}`);

    let isDuplicate = false;

    if (checks.length > 0) {
      const orFilter = checks.join(",");

      // Consultamos en paralelo en ambas tablas (Leads vigentes y Prospectos activos)
      const [{ data: dupLeads }, { data: dupProspects }] = await Promise.all([
        supabaseClient
          .from("leads")
          .select("id")
          .neq("state", "descartado")
          .or(orFilter)
          .limit(1),
        supabaseClient.from("prospects").select("id").or(orFilter).limit(1),
      ]);

      if ((dupLeads?.length ?? 0) > 0 || (dupProspects?.length ?? 0) > 0) {
        isDuplicate = true;
      }
    }

    // 4. Procesamiento condicional de la inserción de datos
    if (isDuplicate) {
      // Flujo de Descarte Automático: Registramos el lead ya marcado como descartado
      const { error: discardError } = await supabaseClient
        .from("leads")
        .insert({
          full_name: fullName,
          email,
          phone,
          channel,
          origin: "zapier",
          state: "descartado",
          discard_reason: "Duplicado bloqueado (RF-05)",
        });

      if (discardError) throw discardError;

      // Registro opcional en bitácora de auditorías del sistema
      try {
        await supabaseClient.from("audit_logs").insert({
          action: "Lead duplicado bloqueado",
          description: `${phone ?? email} ya registrado (RF-05). Intento de registro automático vía Zapier interceptado para: ${fullName}.`,
          actor: "sistema (zapier)",
        });
      } catch (_auditError) {
        // Estructura de auditoría no crítica; silenciamos errores para no interrumpir el flujo del webhook
      }

      return NextResponse.json(
        {
          status: "blocked",
          message:
            "Duplicado detectado bajo la regla RF-05. El registro ha sido archivado como descartado.",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Flujo Exitoso: El lead es completamente nuevo y se registra limpio
    const { error: insertError } = await supabaseClient.from("leads").insert({
      full_name: fullName,
      email,
      phone,
      channel,
      origin: "zapier",
      state: "nuevo",
    });

    if (insertError) throw insertError;

    return NextResponse.json(
      {
        status: "success",
        message:
          "Lead registrado de manera exitosa en la bandeja de entrada del sistema.",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Captura global de excepciones
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}
