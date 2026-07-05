"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { ViewTopbar } from "@/components/view-topbar";
import { createEmployee, setEmployeeAccess, type EmployeeRole } from "./actions";

type Employee = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  role: EmployeeRole;
  status: "activo" | "ausente" | "inhabilitado";
  created_at: string;
};

type AuditRow = {
  id: string;
  action: string;
  detail: string | null;
  actor_name: string | null;
  created_at: string;
  actor: { full_name: string } | null;
};

type DeletionRequest = {
  id: string;
  prospect_id: string | null;
  subject_name: string;
  requested_at: string;
  due_date: string;
  status: "pendiente" | "procesada";
};

const roleBadge: Record<EmployeeRole, string> = {
  administrador: "bg-[#ba1a1a]/10 text-[#ba1a1a]",
  teleoperador: "bg-[#00288e]/10 text-[#00288e]",
  vendedor: "bg-[#006a61]/10 text-[#006a61]",
};

const roleLabels: Record<EmployeeRole, string> = {
  administrador: "Administrador",
  teleoperador: "Teleoperador",
  vendedor: "Vendedor",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function auditTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Hoy, ${time}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) + `, ${time}`;
}

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [carteras, setCarteras] = useState<Record<string, number>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [settings, setSettings] = useState<{ key: string; value: number; description: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, job_title, role, status, created_at")
        .order("full_name"),
      supabase.from("prospects").select("assigned_to"),
      supabase
        .from("audit_log")
        .select("id, action, detail, actor_name, created_at, actor:profiles(full_name)")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("deletion_requests")
        .select("id, prospect_id, subject_name, requested_at, due_date, status")
        .order("requested_at", { ascending: false }),
      supabase.from("app_settings").select("key, value, description").order("key"),
    ]).then(([emp, pros, aud, del, set]) => {
      setEmployees((emp.data ?? []) as Employee[]);
      const counts: Record<string, number> = {};
      for (const p of (pros.data ?? []) as { assigned_to: string | null }[]) {
        if (p.assigned_to) counts[p.assigned_to] = (counts[p.assigned_to] ?? 0) + 1;
      }
      setCarteras(counts);
      setAudit((aud.data ?? []) as unknown as AuditRow[]);
      setRequests((del.data ?? []) as DeletionRequest[]);
      setSettings((set.data ?? []) as { key: string; value: number; description: string | null }[]);
      setLoading(false);
    });
  }, [version]);

  function showToast(text: string, error = false) {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const fullName = (form.get("full_name") as string).trim();
    const result = await createEmployee({
      full_name: fullName,
      email: (form.get("email") as string).trim(),
      password: form.get("password") as string,
      job_title: ((form.get("job_title") as string) || "").trim() || null,
      role: form.get("role") as EmployeeRole,
    });

    setSaving(false);
    if (!result.ok) {
      setModalError(result.error);
      return;
    }
    await logAudit("Usuario creado", `${fullName} · rol ${form.get("role")} (CU-12).`);
    setCreating(false);
    showToast("Usuario creado correctamente.");
    setVersion((v) => v + 1);
  }

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setModalError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: (form.get("full_name") as string).trim(),
        job_title: ((form.get("job_title") as string) || "").trim() || null,
        role: form.get("role") as EmployeeRole,
        status: form.get("status") as string,
      })
      .eq("id", editing.id)
      .select("id");

    setSaving(false);
    if (error || !data || data.length === 0) {
      setModalError(error?.message ?? "No tienes permiso para editar usuarios.");
      return;
    }
    await logAudit("Usuario editado", `${editing.full_name} · datos/rol actualizados (RD-11).`);
    setEditing(null);
    showToast("Usuario actualizado.");
    setVersion((v) => v + 1);
  }

  async function toggleAccess(emp: Employee) {
    const enable = emp.status === "inhabilitado";
    const result = await setEmployeeAccess(emp.id, enable);
    if (!result.ok) {
      showToast(result.error, true);
      return;
    }
    await logAudit(
      enable ? "Usuario habilitado" : "Usuario inhabilitado",
      `${emp.full_name} (${emp.email}).`,
    );
    showToast(enable ? `${emp.full_name} habilitado.` : `${emp.full_name} inhabilitado.`);
    setVersion((v) => v + 1);
  }

  // RD-12: procesar la solicitud elimina los datos personales del
  // prospecto (cascade a interacciones/reuniones) dentro del plazo
  async function processRequest(req: DeletionRequest) {
    if (!window.confirm(`¿Eliminar definitivamente los datos de ${req.subject_name}? Esta acción no se puede deshacer (Ley N°29733).`)) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (req.prospect_id) {
      await supabase.from("prospects").delete().eq("id", req.prospect_id);
      await supabase.from("leads").delete().or(`converted_prospect_id.eq.${req.prospect_id}`);
    }
    await supabase
      .from("deletion_requests")
      .update({ status: "procesada", processed_at: new Date().toISOString(), processed_by: user?.id ?? null })
      .eq("id", req.id);
    await logAudit("Datos personales eliminados", `${req.subject_name} · solicitud RD-12 procesada.`);
    showToast(`Datos de ${req.subject_name} eliminados (RD-12).`);
    setVersion((v) => v + 1);
  }

  async function handleSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    for (const s of settings) {
      const value = Number(form.get(s.key));
      if (!Number.isNaN(value) && value > 0 && value !== Number(s.value)) {
        await supabase.from("app_settings").update({ value }).eq("key", s.key);
        await logAudit("Umbral actualizado", `${s.key}: ${s.value} → ${value}.`);
      }
    }
    showToast("Umbrales guardados.");
    setVersion((v) => v + 1);
  }

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pendiente"), [requests]);

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  return (
    <>
      <ViewTopbar
        breadcrumb="Gobernanza · CU-12"
        title="Administración y Seguridad"
        actions={
          <button
            onClick={() => { setModalError(null); setCreating(true); }}
            className="rounded-lg bg-[#00288e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
          >
            + Crear usuario
          </button>
        }
      />
      <div className="p-8">
        {/* Usuarios */}
        <div className="mb-6 overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
          <div className="border-b border-[#c4c5d5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0b1c30]">Usuarios del sistema</h2>
            <p className="text-xs text-[#757684]">Correo y teléfono almacenados cifrados (RD-12)</p>
          </div>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#eff4ff]">
                {["Usuario", "Rol", "Contacto", "Cartera", ""].map((h, i) => (
                  <th key={i} className="px-6 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-[#757684]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c4c5d5]/50">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-5 text-center text-sm text-[#757684]">Cargando usuarios...</td></tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className={`transition-colors hover:bg-[#eff4ff]/60 ${emp.status === "inhabilitado" ? "opacity-55" : ""}`}>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#dde1ff] text-[11px] font-bold text-[#00288e]">
                        {initials(emp.full_name)}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0b1c30]">{emp.full_name}</p>
                        <p className="text-[11px] text-[#757684]">
                          {emp.status === "inhabilitado" ? "Inhabilitado" : `Activo desde ${shortDate(emp.created_at)}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase ${roleBadge[emp.role]}`}>
                      {roleLabels[emp.role]}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-[12px] font-semibold text-[#00288e]">🔒 {emp.email}</td>
                  <td className="px-6 py-3.5 text-[13px] text-[#444653]">
                    {emp.role === "vendedor"
                      ? `${carteras[emp.id] ?? 0} clientes asignados`
                      : emp.role === "administrador"
                        ? "Acceso total"
                        : "— (sin cartera propia)"}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => { setModalError(null); setEditing(emp); }}
                      className="rounded px-2 py-1 text-xs font-bold text-[#00288e] hover:bg-[#eff4ff]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleAccess(emp)}
                      className={`ml-1 rounded px-2 py-1 text-xs font-bold hover:bg-[#eff4ff] ${
                        emp.status === "inhabilitado" ? "text-[#006a61]" : "text-[#ba1a1a]"
                      }`}
                    >
                      {emp.status === "inhabilitado" ? "Habilitar" : "Inhabilitar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[2fr_1fr]">
          {/* Log de auditoría */}
          <div className="overflow-hidden rounded-xl border border-[#c4c5d5] bg-white">
            <div className="border-b border-[#c4c5d5] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0b1c30]">Log de auditoría</h2>
              <p className="text-xs text-[#757684]">Acciones sensibles del sistema (RD-11)</p>
            </div>
            <div className="divide-y divide-[#c4c5d5]/50">
              {!loading && audit.length === 0 && (
                <p className="p-6 text-sm text-[#757684]">Sin eventos registrados aún.</p>
              )}
              {audit.map((row) => (
                <div key={row.id} className="flex items-center gap-3.5 px-6 py-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eff4ff] text-xs">
                    {row.action.toLowerCase().includes("elimin") ? "🗑️" : row.action.toLowerCase().includes("usuario") ? "👤" : "✏️"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-[#0b1c30]">{row.action}</p>
                    <p className="truncate text-[11px] text-[#757684]">
                      {row.detail ?? ""} · Ejecutado por: {row.actor?.full_name ?? row.actor_name ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10.5px] text-[#757684]">{auditTime(row.created_at)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {/* Solicitudes de eliminación */}
            <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Solicitudes de eliminación de datos</h3>
              {pendingRequests.length === 0 && (
                <p className="text-xs text-[#757684]">No hay solicitudes pendientes.</p>
              )}
              {pendingRequests.map((req) => (
                <div key={req.id} className="mb-2 flex items-center justify-between rounded-lg border border-[#ba1a1a]/25 bg-[#ba1a1a]/5 px-4 py-3">
                  <div>
                    <p className="text-[12.5px] font-bold text-[#ba1a1a]">{req.subject_name}</p>
                    <p className="text-[11px] text-[#757684]">
                      Solicitó el {shortDate(req.requested_at)} · Plazo: {shortDate(req.due_date)} (RD-12)
                    </p>
                  </div>
                  <button
                    onClick={() => processRequest(req)}
                    className="rounded-lg bg-[#ba1a1a] px-3 py-1.5 text-[11px] font-bold text-white transition-transform active:scale-95"
                  >
                    Procesar
                  </button>
                </div>
              ))}
              <p className="mt-3 rounded-lg border-l-4 border-[#00288e] bg-[#eff4ff] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#444653]">
                <b className="text-[#00288e]">RD-12:</b> toda solicitud de eliminación de datos personales debe
                atenderse en un plazo máximo de 10 días hábiles, conforme a la Ley N°29733.
              </p>
            </div>

            {/* Umbrales parametrizables */}
            <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
              <h3 className="mb-1 text-sm font-semibold text-[#0b1c30]">Reglas de seguimiento</h3>
              <p className="mb-3 text-[11px] text-[#757684]">Umbrales parametrizables (RD-02/03/04)</p>
              <form onSubmit={handleSettings} className="space-y-3">
                {settings.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-3">
                    <label className="flex-1 text-[11.5px] font-semibold text-[#444653]">
                      {s.description ?? s.key}
                    </label>
                    <input
                      type="number"
                      name={s.key}
                      min={1}
                      defaultValue={Number(s.value)}
                      className="h-9 w-20 rounded-lg border border-[#c4c5d5] px-3 text-center text-sm font-bold outline-none focus:border-[#00288e]"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#00288e] py-2 text-xs font-bold text-white transition-all hover:bg-[#00288e]/90"
                >
                  Guardar umbrales
                </button>
              </form>
            </div>

            {/* Control de acceso */}
            <div className="rounded-xl border border-[#c4c5d5] bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-[#0b1c30]">Control de acceso por rol</h3>
              {[
                ["Vendedor", "Solo su cartera"],
                ["Teleoperador", "Bandeja de leads"],
                ["Administrador", "Acceso total"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-[#c4c5d5]/40 py-2 text-[12.5px] last:border-b-0">
                  <span className="text-[#757684]">{k}</span>
                  <span className="font-semibold text-[#0b1c30]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: crear usuario */}
      {creating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setCreating(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Crear usuario</h3>
                <p className="text-xs text-[#757684]">Validación de formato en tiempo real (RD-09)</p>
              </div>
              <button onClick={() => setCreating(false)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Nombres y Apellidos *</label>
                  <input type="text" name="full_name" required autoFocus className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Rol asignado</label>
                  <select name="role" defaultValue="vendedor" className={inputClass}>
                    <option value="vendedor">Vendedor</option>
                    <option value="teleoperador">Teleoperador</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Correo electrónico *</label>
                  <input type="email" name="email" required placeholder="nombre@proyectainnova.pe" className={inputClass} />
                  <p className="text-[10.5px] text-[#757684]">🔒 Se almacenará cifrado en reposo (RD-12)</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Contraseña *</label>
                  <input type="password" name="password" required minLength={6} className={inputClass} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Cargo</label>
                  <input type="text" name="job_title" placeholder="ej. Ejecutiva de Ventas" className={inputClass} />
                </div>
              </div>
              {modalError && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{modalError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#006a61] px-6 py-2 text-sm font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-70">
                  {saving ? "Creando..." : "Guardar usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: editar usuario */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1c30]/50 p-4" onMouseDown={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0b1c30]">Editar usuario</h3>
              <button onClick={() => setEditing(null)} className="material-symbols-outlined text-[#757684] hover:text-[#ba1a1a]">close</button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4 p-6">
              <p className="text-xs text-[#757684]">🔒 {editing.email} (el correo no se puede cambiar)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Nombres y Apellidos *</label>
                  <input type="text" name="full_name" required defaultValue={editing.full_name} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Rol</label>
                  <select name="role" defaultValue={editing.role} className={inputClass}>
                    <option value="vendedor">Vendedor</option>
                    <option value="teleoperador">Teleoperador</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Estado</label>
                  <select name="status" defaultValue={editing.status} className={inputClass}>
                    <option value="activo">Activo</option>
                    <option value="ausente">Ausente</option>
                    <option value="inhabilitado">Inhabilitado</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-[#444653]">Cargo</label>
                  <input type="text" name="job_title" defaultValue={editing.job_title ?? ""} className={inputClass} />
                </div>
              </div>
              {modalError && <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">{modalError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] hover:bg-[#eff4ff]">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#00288e]/90 disabled:opacity-70">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-8 right-8 z-[100] rounded-lg px-6 py-4 text-sm font-semibold text-white shadow-lg ${toast.error ? "bg-[#ba1a1a]" : "bg-[#213145]"}`}>
          {toast.text}
        </div>
      )}
    </>
  );
}
