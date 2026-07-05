"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { ViewTopbar } from "@/components/view-topbar";
import { useCurrentUser } from "@/components/current-user-provider";

type Plot = {
  id: string;
  code: string;
  area_m2: number;
  block: string | null;
  feature: string | null;
  price: number;
  available: boolean;
  project: string;
};

type ProspectOption = { id: string; full_name: string };

export default function TerrenosPage() {
  const { currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "administrador";

  const [plots, setPlots] = useState<Plot[]>([]);
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"todos" | "disponibles" | "nodisp">("todos");
  const [linking, setLinking] = useState<Plot | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("plots")
      .select("id, code, area_m2, block, feature, price, available, project")
      .order("code")
      .then(({ data }) => {
        setPlots((data ?? []) as Plot[]);
        setLoading(false);
      });

    supabase
      .from("prospects")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setProspects((data ?? []) as ProspectOption[]));
  }, [version]);

  const stats = useMemo(() => {
    const disp = plots.filter((p) => p.available).length;
    const avg = plots.length
      ? Math.round(plots.reduce((s, p) => s + Number(p.area_m2), 0) / plots.length)
      : 0;
    return { total: plots.length, disp, nodisp: plots.length - disp, avg };
  }, [plots]);

  function showToast(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  }

  // Disponibilidad en tiempo real (RF-25) — solo Administrador
  async function toggleAvailability(plot: Plot) {
    const supabase = createClient();
    setPlots((prev) =>
      prev.map((p) => (p.id === plot.id ? { ...p, available: !p.available } : p)),
    );
    await supabase.from("plots").update({ available: !plot.available }).eq("id", plot.id);
    await logAudit(
      plot.available ? "Lote retirado del catálogo" : "Lote restaurado al catálogo",
      `${plot.code} · ${plot.block ?? ""} (RD-08).`,
    );
  }

  async function handleLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!linking) return;
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const prospectId = form.get("prospect_id") as string;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: linkError } = await supabase.from("prospect_plots").insert({
      prospect_id: prospectId,
      plot_id: linking.id,
      created_by: user?.id ?? null,
    });

    setSaving(false);
    if (linkError) {
      setError(
        linkError.code === "23505"
          ? "Este lote ya está asociado a ese prospecto."
          : linkError.message,
      );
      return;
    }
    setLinking(null);
    showToast(`${linking.code} asociado al prospecto.`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("plots").insert({
      code: (form.get("code") as string).trim().toUpperCase(),
      area_m2: Number(form.get("area_m2")),
      block: ((form.get("block") as string) || "").trim() || null,
      feature: ((form.get("feature") as string) || "").trim() || null,
      price: Number(form.get("price")),
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCreating(false);
    showToast("Lote registrado en el inventario.");
    setVersion((v) => v + 1);
  }

  const shown = plots.filter((p) => {
    if (filter === "disponibles") return p.available;
    if (filter === "nodisp") return !p.available;
    return true;
  });

  const pill = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
      active ? "border-[#0b1c30] bg-[#0b1c30] text-white" : "border-[#c4c5d5] bg-white text-[#444653] hover:bg-[#eff4ff]"
    }`;

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  return (
    <>
      <ViewTopbar
        breadcrumb="Extensión MVP v2 · CU-09"
        title="Gestión de Terrenos"
        actions={
          isAdmin ? (
            <button
              onClick={() => { setError(null); setCreating(true); }}
              className="rounded-lg bg-[#00288e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
            >
              + Nuevo lote
            </button>
          ) : undefined
        }
      />
      <div className="p-8">
        {/* Stats */}
        <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[
            { label: "Lotes totales", value: stats.total, note: "Condominio Bosque Alto", accent: "bg-[#00288e]" },
            { label: "Disponibles", value: stats.disp, note: "RF-25 · tiempo real", accent: "bg-[#006a61]" },
            { label: "No disponibles (admin.)", value: stats.nodisp, note: "Retirados del catálogo", accent: "bg-[#ba1a1a]" },
            { label: "Área promedio", value: `${stats.avg} m²`, note: "Rango 100–1000 m²", accent: "bg-[#00288e]" },
          ].map((s) => (
            <div key={s.label} className="relative overflow-hidden rounded-xl border border-[#c4c5d5] bg-white p-5">
              <p className="text-xs font-semibold text-[#757684]">{s.label}</p>
              <p className="mt-1.5 text-3xl font-bold tracking-tight text-[#0b1c30]">{loading ? "…" : s.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#757684]">{s.note}</p>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${s.accent}`} />
            </div>
          ))}
        </div>

        {/* Inventario */}
        <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="flex items-center justify-between border-b border-[#c4c5d5] px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#0b1c30]">Inventario de lotes — Huacho</h2>
              <p className="text-xs text-[#757684]">
                Condominio Campestre Bosque Alto
                {!isAdmin && " · modo consulta (Vendedor)"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilter("todos")} className={pill(filter === "todos")}>Todos</button>
              <button onClick={() => setFilter("disponibles")} className={pill(filter === "disponibles")}>Disponibles</button>
              <button onClick={() => setFilter("nodisp")} className={pill(filter === "nodisp")}>No disponibles</button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {loading && <p className="text-sm text-[#757684]">Cargando inventario...</p>}
            {!loading && shown.length === 0 && (
              <p className="text-sm text-[#757684]">No hay lotes en esta vista.</p>
            )}
            {shown.map((plot) => (
              <div
                key={plot.id}
                className={`overflow-hidden rounded-xl border border-[#c4c5d5] bg-white transition-opacity ${
                  plot.available ? "" : "opacity-55"
                }`}
              >
                <div className="relative flex h-20 items-center justify-center bg-gradient-to-br from-[#dde1ff] to-[#eff4ff]">
                  <svg viewBox="0 0 300 84" className="absolute inset-0 h-full w-full opacity-50">
                    <path d="M0,50 Q80,20 150,45 T300,30" stroke="#00288e" strokeWidth="1.2" fill="none" />
                    <path d="M0,65 Q90,40 160,60 T300,50" stroke="#00288e" strokeWidth="1" fill="none" />
                  </svg>
                  <span className="relative z-10 rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] font-bold text-[#0b1c30]">
                    {plot.code}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-base font-bold text-[#0b1c30]">{Number(plot.area_m2)} m²</p>
                  <p className="mt-0.5 text-[11.5px] text-[#757684]">
                    {plot.block ?? "—"}{plot.feature ? ` · ${plot.feature}` : ""}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#00288e]">
                      S/ {Number(plot.price).toLocaleString("es-PE")}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[10.5px] font-bold ${plot.available ? "text-[#006a61]" : "text-[#757684]"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${plot.available ? "bg-[#006a61]" : "bg-[#757684]"}`} />
                      {plot.available ? "Disponible" : "No disponible"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-[#c4c5d5]/50 pt-3">
                    {!isAdmin && plot.available && (
                      <button
                        onClick={() => { setError(null); setLinking(plot); }}
                        className="flex-1 rounded-lg border border-[#00288e] py-1.5 text-xs font-bold text-[#00288e] transition-colors hover:bg-[#eff4ff]"
                      >
                        Asociar a prospecto
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => toggleAvailability(plot)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-bold transition-colors ${
                          plot.available
                            ? "border-[#ba1a1a]/50 text-[#ba1a1a] hover:bg-[#ba1a1a]/5"
                            : "border-[#006a61]/50 text-[#006a61] hover:bg-[#006a61]/5"
                        }`}
                      >
                        {plot.available ? "Retirar del catálogo" : "Restaurar disponibilidad"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pb-5">
            <p className="rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-4 py-2.5 text-xs leading-relaxed text-[#444653]">
              <b className="text-[#00288e]">RD-08 (ajustado):</b> el sistema gestiona únicamente
              &quot;Disponible&quot; / &quot;No disponible administrativo&quot;. Los estados &quot;Reservado&quot; y
              &quot;Vendido&quot; no forman parte de esta fase (dependen de módulos fuera de alcance).
            </p>
          </div>
        </div>
      </div>

      {/* Modal: asociar lote a prospecto (vendedor) */}
      {linking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setLinking(null)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0b1c30]">Asociar {linking.code}</h3>
              <button onClick={() => setLinking(null)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleLink} className="space-y-4 p-6">
              <p className="text-sm text-[#757684]">
                {Number(linking.area_m2)} m² · S/ {Number(linking.price).toLocaleString("es-PE")} — se registrará
                como lote de interés del prospecto.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#444653]">Prospecto de tu cartera *</label>
                <select name="prospect_id" required defaultValue="" className={inputClass}>
                  <option value="" disabled>Selecciona un prospecto...</option>
                  {prospects.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              {error && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setLinking(null)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#00288e]/90 disabled:opacity-70">
                  {saving ? "Asociando..." : "Asociar lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: nuevo lote (admin) */}
      {creating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setCreating(false)}>
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0b1c30]">Nuevo Lote</h3>
              <button onClick={() => setCreating(false)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Código *</label>
                  <input type="text" name="code" required autoFocus placeholder="LOTE-050" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Área (m²) *</label>
                  <input type="number" name="area_m2" required min="100" max="1000" placeholder="300" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Manzana</label>
                  <input type="text" name="block" placeholder="Manzana C" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Precio (S/) *</label>
                  <input type="number" name="price" required min="0" step="100" placeholder="42000" className={inputClass} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Característica</label>
                  <input type="text" name="feature" placeholder="ej. Vista al valle" className={inputClass} />
                </div>
              </div>
              {error && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{error}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-70">
                  {saving ? "Guardando..." : "Registrar Lote"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 z-[100] rounded-lg bg-[#213145] px-6 py-4 text-sm text-white shadow-lg">
          ✓ {toast}
        </div>
      )}
    </>
  );
}
