"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

type LeadStatus = "nuevo" | "contactado" | "calificado" | "perdido";

type NewLeadContextValue = {
  openModal: () => void;
  /** Se incrementa cada vez que se crea un lead; útil para refrescar listas */
  version: number;
};

const NewLeadContext = createContext<NewLeadContextValue | null>(null);

export function useNewLead() {
  const ctx = useContext(NewLeadContext);
  if (!ctx) {
    throw new Error("useNewLead debe usarse dentro de <NewLeadProvider>");
  }
  return ctx;
}

type ProfileOption = { id: string; full_name: string };

export function NewLeadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const openModal = useCallback(() => setOpen(true), []);

  return (
    <NewLeadContext.Provider value={{ openModal, version }}>
      {children}
      {open && (
        <NewLeadModal
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </NewLeadContext.Provider>
  );
}

function NewLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<LeadStatus>("nuevo");
  const [assignedTo, setAssignedTo] = useState("");
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .then(({ data }) => setProfiles(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("leads").insert({
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      company: company || null,
      status,
      assigned_to: assignedTo || null,
      created_by: user?.id ?? null,
    });

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }
    onCreated();
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-[#c4c5d5] bg-white px-4 text-sm outline-none transition-all focus:border-[#00288e] focus:ring-2 focus:ring-[#00288e]/20";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1c30]/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#c4c5d5] bg-[#eff4ff] px-6 py-4">
          <h3 className="text-xl font-semibold text-[#0b1c30]">Nuevo Lead</h3>
          <button
            onClick={onClose}
            className="material-symbols-outlined text-[#757684] transition-colors hover:text-[#ba1a1a]"
          >
            close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="space-y-1">
            <label className="ml-1 text-xs font-medium text-[#444653]">
              Nombre completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre del lead"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="ml-1 text-xs font-medium text-[#444653]">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="ml-1 text-xs font-medium text-[#444653]">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+51 999 999 999"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="ml-1 text-xs font-medium text-[#444653]">
              Empresa
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nombre de la empresa"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="ml-1 text-xs font-medium text-[#444653]">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className={inputClass}
              >
                <option value="nuevo">Nuevo</option>
                <option value="contactado">Contactado</option>
                <option value="calificado">Calificado</option>
                <option value="perdido">Perdido</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="ml-1 text-xs font-medium text-[#444653]">
                Asignado a
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inputClass}
              >
                <option value="">Sin asignar</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-[#ba1a1a]/10 px-4 py-2 text-sm font-medium text-[#ba1a1a]">
              Error al guardar: {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#c4c5d5] px-6 py-2 text-sm font-semibold text-[#444653] transition-colors hover:bg-[#eff4ff]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#00288e] px-6 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#00288e]/90 active:scale-[0.98] disabled:opacity-70"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-[18px]">
                  progress_activity
                </span>
              )}
              {saving ? "Guardando..." : "Guardar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
