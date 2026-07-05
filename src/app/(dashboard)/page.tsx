import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type AppRole } from "@/lib/nav-items";

// "/" no es una pantalla: redirige a la primera vista de cada rol
export default async function RootRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(homeFor((profile?.role ?? "vendedor") as AppRole));
}
